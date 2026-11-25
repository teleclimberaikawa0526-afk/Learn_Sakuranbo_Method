import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { CourseType, SakuranboQuestion, StepIndex } from '../types';
import { generateQuestions } from '../utils/questionGenerator';
import { sound, voiceGuide } from '../utils/sound';
import { SakuranboDiagram } from './SakuranboDiagram';
import { BlockVisualizer } from './BlockVisualizer';

interface GameScreenProps {
  course: CourseType;
  currentMiles: number;
  onAddMiles: (amount: number) => void;
  onFinishSession: (earnedMiles: number, totalQuestions: number) => void;
  onExitToTitle: () => void;
}

const TOTAL_QUESTIONS = 5;

export const GameScreen: React.FC<GameScreenProps> = ({
  course,
  currentMiles,
  onAddMiles,
  onFinishSession,
  onExitToTitle,
}) => {
  const [questions] = useState<SakuranboQuestion[]>(() =>
    generateQuestions(course, TOTAL_QUESTIONS)
  );
  const [qIndex, setQIndex] = useState(0);
  const [step, setStep] = useState<StepIndex>(0);
  const [isQuestionDone, setIsQuestionDone] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; text: string } | null>(
    null
  );
  const [shakeSlot, setShakeSlot] = useState(false);
  const [milePopKey, setMilePopKey] = useState(0);
  const [showMilePop, setShowMilePop] = useState(false);
  const [earnedMiles, setEarnedMiles] = useState(0);
  const [stepHadMistake, setStepHadMistake] = useState(false);

  const [showBlocks, setShowBlocks] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(() => voiceGuide.isEnabled());

  const timerRef = useRef<number | null>(null);
  const stepSpeakTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const currentQuestion = questions[qIndex];
  const currentStepGuide = currentQuestion.steps[step];

  const speakCurrentStep = useCallback(() => {
    voiceGuide.speak(currentStepGuide.speechText);
  }, [currentStepGuide.speechText]);

  // Speak guide automatically whenever question or step changes (with a brief natural pause)
  useEffect(() => {
    if (!isQuestionDone) {
      if (stepSpeakTimerRef.current) {
        window.clearTimeout(stepSpeakTimerRef.current);
      }
      stepSpeakTimerRef.current = window.setTimeout(() => {
        if (isMountedRef.current) {
          speakCurrentStep();
        }
      }, 250);
    }
    return () => {
      if (stepSpeakTimerRef.current) {
        window.clearTimeout(stepSpeakTimerRef.current);
      }
    };
  }, [qIndex, step, isQuestionDone, speakCurrentStep]);

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

  const toggleVoice = () => {
    sound.playClick();
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    voiceGuide.setEnabled(next);
    if (next && !isQuestionDone) {
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
    if (isTransitioning || isQuestionDone) return;

    if (val === currentStepGuide.correctValue) {
      setIsTransitioning(true);

      // Only award +1 mile if the user did not make any mistake on this step
      const milesForThisStep = stepHadMistake ? 0 : 1;
      if (milesForThisStep > 0) {
        setFeedback({ type: 'correct', text: 'せいかい！ +1 マイル！' });
        onAddMiles(1);
        setEarnedMiles((prev) => prev + 1);
        setMilePopKey((prev) => prev + 1);
        setShowMilePop(true);
      } else {
        setFeedback({ type: 'correct', text: 'せいかい！ よく がんばったね！' });
        setShowMilePop(false);
      }

      const isLastStep = step === 2;
      if (isLastStep) {
        sound.playQuestionComplete();
        setIsQuestionDone(true);
      } else {
        sound.playStepCorrect();
      }

      const proceedNext = () => {
        if (!isMountedRef.current) return;
        setShowMilePop(false);
        setFeedback(null);
        setStepHadMistake(false);

        if (isLastStep) {
          if (qIndex + 1 < questions.length) {
            setQIndex((prev) => prev + 1);
            setStep(0);
            setIsQuestionDone(false);
            setIsTransitioning(false);
          } else {
            onFinishSession(earnedMiles + milesForThisStep, questions.length);
          }
        } else {
          setStep((prev) => (prev + 1) as StepIndex);
          setIsTransitioning(false);
        }
      };

      const afterSpeechMarginMs = isLastStep ? 1150 : 750;
      const silentWaitMs = isLastStep ? 1800 : 1250;

      if (voiceEnabled) {
        // Wait until the praise voice finishes completely, then add a comfortable margin
        voiceGuide.speak(currentStepGuide.praiseSpeech, {
          onEnd: () => {
            if (!isMountedRef.current) return;
            timerRef.current = window.setTimeout(proceedNext, afterSpeechMarginMs);
          },
        });
      } else {
        timerRef.current = window.setTimeout(proceedNext, silentWaitMs);
      }
    } else {
      setStepHadMistake(true);
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
        <button
          className="mini-nav-btn"
          onClick={() => {
            sound.playClick();
            voiceGuide.stop();
            onExitToTitle();
          }}
        >
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
          <div className="miles-display compact">⭐ {currentMiles}</div>
          {showMilePop && (
            <div key={milePopKey} className="mile-float-pop">
              +1 マイル!
            </div>
          )}
        </div>
      </div>

      {/* Controls row: Voice & Blocks */}
      <div className="assist-bar">
        <button
          className={`assist-chip ${voiceEnabled ? 'on' : 'off'}`}
          onClick={toggleVoice}
        >
          {voiceEnabled ? '🔊 こえ ON' : '🔇 こえ OFF'}
        </button>
        <button
          className={`assist-chip ${showBlocks ? 'on' : 'off'}`}
          onClick={() => {
            sound.playClick();
            setShowBlocks((prev) => !prev);
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
            isQuestionDone={isQuestionDone}
            shakeSlot={shakeSlot}
          />

          {showBlocks && (
            <BlockVisualizer
              question={currentQuestion}
              step={step}
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
              disabled={isTransitioning || isQuestionDone}
              onClick={() => handleNumberInput(num)}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
