import React from 'react';
import type { SakuranboQuestion, StepIndex } from '../types';

interface SakuranboDiagramProps {
  question: SakuranboQuestion;
  step: StepIndex;
  isStepSolved: boolean;
  isQuestionDone: boolean;
  shakeSlot: boolean;
}

export const SakuranboDiagram: React.FC<SakuranboDiagramProps> = ({
  question,
  step,
  isStepSolved,
  isQuestionDone,
  shakeSlot,
}) => {
  const { type, a, b, answer, cherryLeft, cherryRight, intermediateResult } = question;

  if (type === 'addition') {
    const showLeft = (step === 0 && isStepSolved) || step >= 1 || isQuestionDone;
    const showRight = (step === 1 && isStepSolved) || step >= 2 || isQuestionDone;
    const showAnswer = isQuestionDone;

    return (
      <div className="sakuranbo-card">
        {/* Main equation row */}
        <div className="eq-row">
          <div className="eq-num-box num-a">
            <span>{a}</span>
          </div>
          <span className="eq-op">+</span>

          {/* Number b with cherry branches underneath */}
          <div className="cherry-anchor">
            <div className="eq-num-box num-b">
              <span>{b}</span>
            </div>

            {/* SVG cherry stems */}
            <svg className="cherry-stems" viewBox="0 0 120 34" aria-hidden="true">
              <path
                d="M 60 2 C 56 16, 36 22, 26 32"
                fill="none"
                stroke="#16a34a"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M 60 2 C 64 16, 84 22, 94 32"
                fill="none"
                stroke="#16a34a"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>

            {/* Cherry fruits */}
            <div className="cherry-fruits">
              <div
                className={`cherry-circle ${
                  step === 0 && !isStepSolved && !isQuestionDone
                    ? 'slot-active'
                    : showLeft
                    ? 'slot-filled'
                    : ''
                } ${shakeSlot && step === 0 ? 'shake' : ''}`}
              >
                {showLeft ? cherryLeft : '?'}
              </div>
              <div
                className={`cherry-circle ${
                  step === 1 && !isStepSolved && !isQuestionDone
                    ? 'slot-active'
                    : showRight
                    ? 'slot-filled'
                    : ''
                } ${shakeSlot && step === 1 ? 'shake' : ''}`}
              >
                {showRight ? cherryRight : '?'}
              </div>
            </div>
          </div>

          <span className="eq-op">=</span>

          <div
            className={`eq-answer-box ${
              step === 2 && !isQuestionDone ? 'slot-active' : showAnswer ? 'slot-done' : ''
            } ${shakeSlot && step === 2 ? 'shake' : ''}`}
          >
            {showAnswer ? answer : '?'}
          </div>
        </div>

        {/* Fixed-height single-line helper summary area so card height never jumps */}
        <div className="helper-formula-bar">
          {showLeft ? (
            <div className="make-ten-pill">
              <span className="ten-badge">
                {a} ＋ {cherryLeft} ＝ <strong>10</strong>
              </span>
              {showRight && (
                <span className="ten-next">
                  ➡ <strong>10</strong> ＋ {cherryRight} ＝{' '}
                  <strong>{showAnswer ? answer : '？'}</strong>
                </span>
              )}
            </div>
          ) : (
            <div className="helper-placeholder">10 の まとまり を つくろう！</div>
          )}
        </div>
      </div>
    );
  }

  // Subtraction (減加法: a - b)
  const showRight = (step === 0 && isStepSolved) || step >= 1 || isQuestionDone;
  const showIntermediate = (step === 1 && isStepSolved) || step >= 2 || isQuestionDone;
  const showAnswer = isQuestionDone;

  return (
    <div className="sakuranbo-card">
      {/* Main equation row */}
      <div className="eq-row">
        {/* Number a (11..18) with cherry branches underneath */}
        <div className="cherry-anchor">
          <div className="eq-num-box num-a wide">
            <span>{a}</span>
          </div>

          <svg className="cherry-stems" viewBox="0 0 120 34" aria-hidden="true">
            <path
              d="M 60 2 C 56 16, 36 22, 26 32"
              fill="none"
              stroke="#16a34a"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 60 2 C 64 16, 84 22, 94 32"
              fill="none"
              stroke="#16a34a"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>

          <div className="cherry-fruits">
            <div className="cherry-circle slot-ten">10</div>
            <div
              className={`cherry-circle ${
                step === 0 && !isStepSolved && !isQuestionDone
                  ? 'slot-active'
                  : showRight
                  ? 'slot-filled'
                  : ''
              } ${shakeSlot && step === 0 ? 'shake' : ''}`}
            >
              {showRight ? cherryRight : '?'}
            </div>
          </div>
        </div>

        <span className="eq-op">−</span>

        <div className="eq-num-box num-b">
          <span>{b}</span>
        </div>

        <span className="eq-op">=</span>

        <div
          className={`eq-answer-box ${
            step === 2 && !isQuestionDone ? 'slot-active' : showAnswer ? 'slot-done' : ''
          } ${shakeSlot && step === 2 ? 'shake' : ''}`}
        >
          {showAnswer ? answer : '?'}
        </div>
      </div>

      {/* Fixed-height horizontal helper equations for subtraction so height stays constant */}
      <div className="helper-formula-bar">
        {showRight ? (
          <div className="sub-helper-area">
            <div className={`sub-step-row ${step === 1 && !isStepSolved && !isQuestionDone ? 'highlight-row' : ''}`}>
              <span>① 10−{b}＝</span>
              <span
                className={`mini-slot ${
                  step === 1 && !isStepSolved && !isQuestionDone
                    ? 'slot-active'
                    : showIntermediate
                    ? 'slot-filled'
                    : ''
                } ${shakeSlot && step === 1 ? 'shake' : ''}`}
              >
                {showIntermediate ? intermediateResult : '?'}
              </span>
            </div>

            {showIntermediate && (
              <div className={`sub-step-row ${step === 2 && !isQuestionDone ? 'highlight-row' : ''}`}>
                <span>
                  ② {intermediateResult}＋{cherryRight}＝
                </span>
                <span
                  className={`mini-slot ${
                    step === 2 && !isQuestionDone ? 'slot-active' : showAnswer ? 'slot-done' : ''
                  } ${shakeSlot && step === 2 ? 'shake' : ''}`}
                >
                  {showAnswer ? answer : '?'}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="helper-placeholder">10 と いくつ に わけよう！</div>
        )}
      </div>
    </div>
  );
};
