import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ActiveSession, StepIndex } from '../types';
import { sound, voiceGuide } from '../utils/sound';
import { SakuranboDiagram } from './SakuranboDiagram';
import { BlockVisualizer } from './BlockVisualizer';

interface GameScreenProps {
  initialSession: ActiveSession;
  currentMiles: number;
  onUpdateSession: (session: ActiveSession) => void;
  onFinishSession: (earnedMiles: number, totalQuestions: number) => void;
  onExitToTitle: () => void;
}

const EXIT_CONFIRM_SPEECH = 'こんかいの マイルは うしなわれますが、それで いいですか？';

export const GameScreen: React.FC<GameScreenProps> = ({
  initialSession,
  currentMiles,
  onUpdateSession,
  onFinishSession,
  onExitToTitle,
}) => {
  const [questions] = useState(initialSession.questions);
  const [qIndex, setQIndex] = useState(initialSession.qIndex);
  const [step, setStep] = useState<StepIndex>(initialSession.step);
  const [earnedMiles, setEarnedMiles] = useState(initialSession.earnedMiles);
  const [stepHadMistake, setStepHadMistake] = useState(initialSession.stepHadMistake);
  const [showBlocks, setShowBlocks] = useState(initialSession.showBlocks);

  const [isQuestionDone, setIsQuestionDone] = useState(false);
  const [isStepSolved, setIsStepSolved] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; text: string } | null>(
    null
  );
  const [shakeSlot, setShakeSlot] = useState(false);
  const [milePopKey, setMilePopKey] = useState(0);
  const [showMilePop, setShowMilePop] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [voiceEnabled, setVoiceEnabled] = useState(() => voiceGuide.isEnabled());

  const timerRef = useRef<number | null>(null);
  const stepSpeakTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const isExitingRef = useRef(false);

  const currentQuestion = questions[qIndex];
  const currentStepGuide = currentQuestion.steps[step];

  // Helper to persist the latest state so sleep / background reload never loses progress
  const saveProgress = useCallback(
    (overrides?: Partial<ActiveSession>) => {
      if (isExitingRef.current) return;
      onUpdateSession({
        course: initialSession.course,
        questions,
        qIndex,
        step,
        earnedMiles,
        stepHadMistake,
        showBlocks,
        ...overrides,
      });
    },
    [
      initialSession.course,
      questions,
      qIndex,
      step,
      earnedMiles,
      stepHadMistake,
      showBlocks,
      onUpdateSession,
    ]
  );

  const speakCurrentStep = useCallback(() => {
    voiceGuide.speak(currentStepGuide.speechText);
  }, [currentStepGuide.speechText]);

  // Speak guide automatically whenever question or step changes (with a brief natural pause)
  useEffect(() => {
    if (!isQuestionDone && !showExitConfirm) {
      if (stepSpeakTimerRef.current) {
        window.clearTimeout(stepSpeakTimerRef.current);
      }
      stepSpeakTimerRef.current = window.setTimeout(() => {
        if (isMountedRef.current && !isExitingRef.current) {
          speakCurrentStep();
        }
      }, 250);
    }
    return () => {
      if (stepSpeakTimerRef.current) {
        window.clearTimeout(stepSpeakTimerRef.current);
      }
    };
  }, [qIndex, step, isQuestionDone, showExitConfirm, speakCurrentStep]);

  // Intercept browser / mobile hardware Back navigation so user gets the confirmation dialog
  useEffect(() => {
    if (!window.history.state?.sakuranboGameGuard) {
      window.history.pushState({ sakuranboGameGuard: true }, '');
    }

    const handlePopState = () => {
      if (isExitingRef.current) return;
      // Re-push guard so the page stays on GameScreen while showing confirmation
      window.history.pushState({ sakuranboGameGuard: true }, '');
      sound.playClick();
      setShowExitConfirm(true);
      voiceGuide.speak(EXIT_CONFIRM_SPEECH);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sound.unlock();
      }
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Cleanup timers and speech on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      voiceGuide.stop();
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      if (stepSpeakTimerRef.current) {
        window.clearTimeout(stepSpeakTimerRef.current);
      }
    };
  }, []);

  const openExitConfirm = () => {
    sound.playClick();
    setShowExitConfirm(true);
    voiceGuide.speak(EXIT_CONFIRM_SPEECH);
  };

  const handleCancelExit = () => {
    sound.playClick();
    voiceGuide.stop();
    setShowExitConfirm(false);
  };

  const handleConfirmExit = () => {
    sound.playClick();
    isExitingRef.current = true;
    voiceGuide.stop();
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    onExitToTitle();
  };

  const toggleVoice = () => {
    sound.playClick();
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    voiceGuide.setEnabled(next);
    if (next && !isQuestionDone && !showExitConfirm) {
      voiceGuide.speak(currentStepGuide.speechText);
    }
  };

  const handleReplayVoice = () => {
    sound.playClick();
    if (!voiceEnabled) {
      setVoiceEnabled(true);
      voiceGuide.setEnabled(true);
    }
    voiceGuide.speak(currentStepGuide.speechText);
  };

  const handleNumberInput = (val: number) => {
    if (isTransitioning || isQuestionDone || showExitConfirm) return;

    if (val === currentStepGuide.correctValue) {
      setIsTransitioning(true);
      setIsStepSolved(true);

      // Only award +1 session mile if the user did not make any mistake on this step
      const milesForThisStep = stepHadMistake ? 0 : 1;
      const nextEarnedMiles = earnedMiles + milesForThisStep;

      if (milesForThisStep > 0) {
        setFeedback({ type: 'correct', text: 'せいかい！ +1 マイル！' });
        setEarnedMiles(nextEarnedMiles);
        setMilePopKey((prev) => prev + 1);
        setShowMilePop(true);
      } else {
        setFeedback({ type: 'correct', text: 'せいかい！ よく がんばったね！' });
        setShowMilePop(false);
      }

      const isLastStep = step === 2;
      const isLastQuestion = qIndex + 1 >= questions.length;

      // Immediately persist advanced state so going to sleep during praise audio never loses miles
      if (isLastStep) {
        sound.playQuestionComplete();
        setIsQuestionDone(true);
        if (isLastQuestion) {
          saveProgress({
            earnedMiles: nextEarnedMiles,
            stepHadMistake: false,
            isCompletedPendingCommit: true,
          });
        } else {
          saveProgress({
            qIndex: qIndex + 1,
            step: 0,
            earnedMiles: nextEarnedMiles,
            stepHadMistake: false,
          });
        }
      } else {
        sound.playStepCorrect();
        saveProgress({
          step: (step + 1) as StepIndex,
          earnedMiles: nextEarnedMiles,
          stepHadMistake: false,
        });
      }

      const proceedNext = () => {
        if (!isMountedRef.current || isExitingRef.current) return;
        setShowMilePop(false);
        setFeedback(null);
        setStepHadMistake(false);
        setIsStepSolved(false);

        if (isLastStep) {
          if (!isLastQuestion) {
            setQIndex((prev) => prev + 1);
            setStep(0);
            setIsQuestionDone(false);
            setIsTransitioning(false);
          } else {
            isExitingRef.current = true;
            onFinishSession(nextEarnedMiles, questions.length);
          }
        } else {
          setStep((prev) => (prev + 1) as StepIndex);
          setIsTransitioning(false);
        }
      };

      const afterSpeechMarginMs = isLastStep ? 1150 : 750;
      const silentWaitMs =
        isLastStep
          ? 1800
          : currentQuestion.type === 'addition' && step === 0
          ? 1650
          : 1250;

      if (voiceEnabled) {
        voiceGuide.speak(currentStepGuide.praiseSpeech, {
          onEnd: () => {
            if (!isMountedRef.current || isExitingRef.current) return;
            timerRef.current = window.setTimeout(proceedNext, afterSpeechMarginMs);
          },
        });
      } else {
        timerRef.current = window.setTimeout(proceedNext, silentWaitMs);
      }
    } else {
      setStepHadMistake(true);
      saveProgress({ stepHadMistake: true });
      sound.playWrong();
      setFeedback({ type: 'wrong', text: 'おしい！ もういちど やってみよう' });
      setShakeSlot(true);
      voiceGuide.speak(currentStepGuide.hintSpeech);

      window.setTimeout(() => {
        setShakeSlot(false);
      }, 450);
    }
  };

  // Addition step 2 (final answer) has answers 11..18; all other steps have answers 1..9
  const isTwoDigitStep = currentQuestion.type === 'addition' && step === 2;
  const keypadNumbers = isTwoDigitStep
    ? [11, 12, 13, 14, 15, 16, 17, 18]
    : [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="screen-container game-screen">
      {/* Top Bar */}
      <div className="top-bar">
        <button className="mini-nav-btn" onClick={openExitConfirm}>
          ◀ もどる
        </button>

        <div className="progress-center">
          <div className="q-counter">
            もんだい {qIndex + 1} / {questions.length}
          </div>
          <div className="step-dots" aria-label="ステップ進捗">
            {[0, 1, 2].map((s) => (
              <span
                key={s}
                className={`step-dot ${
                  isQuestionDone || s < step ? 'done' : s === step ? 'current' : ''
                }`}
              >
                {s + 1}
              </span>
            ))}
          </div>
        </div>

        <div className="miles-badge-wrap">
          <div className="miles-dual-group">
            <div className="current-miles-pill">
              <span className="session-miles-label">いまのマイル</span>
              <span className="current-miles-val">⭐ {currentMiles}</span>
            </div>
            <div className="session-miles-pill">
              <span className="session-miles-label">こんかいのマイル</span>
              <span className="session-miles-val">+{earnedMiles}</span>
            </div>
          </div>
          {showMilePop && (
            <div key={milePopKey} className="mile-float-pop">
              +1 マイル!
            </div>
          )}
        </div>
      </div>

      {/* Controls row: Voice & Blocks */}
      <div className="assist-bar">
        <button className={`assist-chip ${voiceEnabled ? 'on' : 'off'}`} onClick={toggleVoice}>
          {voiceEnabled ? '🔊 こえ ON' : '🔇 こえ OFF'}
        </button>
        <button
          className={`assist-chip ${showBlocks ? 'on' : 'off'}`}
          onClick={() => {
            sound.playClick();
            const next = !showBlocks;
            setShowBlocks(next);
            saveProgress({ showBlocks: next });
          }}
        >
          {showBlocks ? '🧱 ブロック ON' : '🧱 ブロック OFF'}
        </button>
      </div>

      {/* Voice Guide Bubble */}
      <div className="guide-bubble" onClick={handleReplayVoice} role="button" tabIndex={0}>
        <div className="guide-avatar">🍒</div>
        <div className="guide-text-area">
          <div className="guide-step-tag">ステップ {step + 1}</div>
          <div className="guide-message">
            {feedback ? (
              <span className={feedback.type === 'correct' ? 'msg-correct' : 'msg-wrong'}>
                {feedback.text}
              </span>
            ) : (
              currentStepGuide.displayText
            )}
          </div>
        </div>
        <button
          className="replay-voice-btn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleReplayVoice();
          }}
          aria-label="もういちど きく"
          title="もういちど きく"
        >
          🔊
        </button>
      </div>

      {/* Main workspace: Sakuranbo Diagram + Optional Blocks */}
      <div className="learning-stage">
        <div className="learning-stage-inner">
          <SakuranboDiagram
            question={currentQuestion}
            step={step}
            isStepSolved={isStepSolved}
            isQuestionDone={isQuestionDone}
            shakeSlot={shakeSlot}
          />

          {showBlocks && (
            <BlockVisualizer
              question={currentQuestion}
              step={step}
              isStepSolved={isStepSolved}
              isQuestionDone={isQuestionDone}
            />
          )}
        </div>
      </div>

      {/* Large Kid-Friendly Number Keypad */}
      <div className="keypad-panel">
        <div className={`keypad-grid ${isTwoDigitStep ? 'cols-4' : 'cols-3'}`}>
          {keypadNumbers.map((num) => (
            <button
              key={num}
              className="toy-button keypad-btn"
              disabled={isTransitioning || isQuestionDone || showExitConfirm}
              onClick={() => handleNumberInput(num)}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="modal-overlay">
          <div className="glass-panel modal-card exit-confirm-card">
            <div className="exit-confirm-icon">⚠️</div>
            <p className="exit-confirm-message">
              こんかいの マイルは うしなわれますが、
              <br />
              それで いいですか？
            </p>
            <div className="exit-confirm-miles">
              こんかいのマイル: <strong>⭐ {earnedMiles}</strong>
            </div>
            <div className="exit-confirm-buttons">
              <button type="button" className="toy-button green" onClick={handleCancelExit}>
                いいえ（けいさんを つづける）
              </button>
              <button type="button" className="toy-button pink" onClick={handleConfirmExit}>
                はい（もどる）
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
