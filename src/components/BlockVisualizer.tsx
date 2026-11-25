import React from 'react';
import type { SakuranboQuestion, StepIndex } from '../types';

interface BlockVisualizerProps {
  question: SakuranboQuestion;
  step: StepIndex;
  isQuestionDone: boolean;
}

export const BlockVisualizer: React.FC<BlockVisualizerProps> = ({
  question,
  step,
  isQuestionDone,
}) => {
  const { type, a, b, cherryLeft, cherryRight, intermediateResult } = question;

  if (type === 'addition') {
    const movedToTen = step >= 1 || isQuestionDone;
    const isTenComplete = step >= 2 || isQuestionDone;

    return (
      <div className="block-visualizer">
        {/* Left: Ten-frame for 'a' */}
        <div className={`ten-frame-box ${isTenComplete ? 'ten-complete' : ''}`}>
          <div className="frame-label">
            {movedToTen ? '10 の まとまり' : `あと いくつで 10？`}
          </div>
          <div className="ten-frame-grid">
            {Array.from({ length: 10 }, (_, idx) => {
              if (idx < a) {
                return <div key={idx} className="block-dot dot-red" />;
              }
              if (movedToTen) {
                return <div key={idx} className="block-dot dot-blue pop-in" />;
              }
              return <div key={idx} className="block-dot dot-empty pulse-hint" />;
            })}
          </div>
        </div>

        {/* Right: Remaining blocks from 'b' */}
        <div className="side-frame-box">
          <div className="frame-label">
            {movedToTen ? `のこり (${cherryRight})` : `たす かず (${b})`}
          </div>
          <div className="side-blocks-grid">
            {Array.from({ length: b }, (_, idx) => {
              const isMoved = movedToTen && idx < cherryLeft;
              return (
                <div
                  key={idx}
                  className={`block-dot ${isMoved ? 'dot-ghost' : 'dot-blue'} ${
                    !isMoved && step === 1 ? 'pulse-blue' : ''
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Subtraction (減加法: 10 + cherryRight, subtract b from 10)
  const showCrossed = step >= 1 || isQuestionDone;
  const highlightRemain = step >= 2 || isQuestionDone;

  return (
    <div className="block-visualizer">
      {/* Left: Ten-frame (10) */}
      <div className="ten-frame-box">
        <div className="frame-label">
          {showCrossed ? `10 から ${b} を ひく` : '10 の まとまり'}
        </div>
        <div className="ten-frame-grid">
          {Array.from({ length: 10 }, (_, idx) => {
            // Cross out the last 'b' blocks so the remaining '10 - b' stay cleanly grouped on the left
            const isSubtracted = showCrossed && idx >= intermediateResult;
            return (
              <div
                key={idx}
                className={`block-dot ${
                  isSubtracted
                    ? 'dot-crossed'
                    : highlightRemain
                    ? 'dot-green pop-in'
                    : 'dot-red'
                }`}
              >
                {isSubtracted && <span className="cross-mark">×</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Ones place (cherryRight) */}
      <div className="side-frame-box">
        <div className="frame-label">
          {step === 0 && !isQuestionDone ? 'ばらは いくつ？' : `ばら (${cherryRight})`}
        </div>
        <div className="side-blocks-grid">
          {Array.from({ length: cherryRight }, (_, idx) => (
            <div
              key={idx}
              className={`block-dot ${
                highlightRemain ? 'dot-orange pop-in' : 'dot-orange'
              } ${step === 0 && !isQuestionDone ? 'pulse-hint' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
