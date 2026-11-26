import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import type { SakuranboQuestion, StepIndex } from '../types';

interface BlockVisualizerProps {
  question: SakuranboQuestion;
  step: StepIndex;
  isStepSolved: boolean;
  isQuestionDone: boolean;
}

interface Offset {
  dx: number;
  dy: number;
}

const STAGGER_MS = 130;
const FLIGHT_MS = 620;

export const BlockVisualizer: React.FC<BlockVisualizerProps> = ({
  question,
  step,
  isStepSolved,
  isQuestionDone,
}) => {
  const { id, type, a, b, cherryLeft, cherryRight, intermediateResult } = question;

  const movedToTen =
    type === 'addition' && ((step === 0 && isStepSolved) || step >= 1 || isQuestionDone);

  const prevStateRef = useRef<{ id: string; moved: boolean }>({
    id,
    moved: movedToTen,
  });

  const tenSlotRefs = useRef<Array<HTMLDivElement | null>>([]);
  const sideSlotRefs = useRef<Array<HTMLDivElement | null>>([]);

  const [flyOffsets, setFlyOffsets] = useState<Record<number, Offset> | null>(null);
  const [tenGlowReady, setTenGlowReady] = useState<boolean>(
    () => type === 'addition' && (step >= 1 || isQuestionDone)
  );

  // Reset animation state when moving to a brand new question
  useEffect(() => {
    if (prevStateRef.current.id !== id) {
      prevStateRef.current = { id, moved: movedToTen };
      setFlyOffsets(null);
      setTenGlowReady(movedToTen);
    }
  }, [id, movedToTen]);

  // Measure exact source -> destination coordinates right when step 1 is solved
  useLayoutEffect(() => {
    const prev = prevStateRef.current;
    const isSameQuestion = prev.id === id;
    const justTriggeredMove = isSameQuestion && !prev.moved && movedToTen;
    prevStateRef.current = { id, moved: movedToTen };

    if (!justTriggeredMove || type !== 'addition') {
      return;
    }

    const measured: Record<number, Offset> = {};
    for (let k = 0; k < cherryLeft; k++) {
      const srcEl = sideSlotRefs.current[k];
      const dstEl = tenSlotRefs.current[a + k];
      if (srcEl && dstEl) {
        const srcRect = srcEl.getBoundingClientRect();
        const dstRect = dstEl.getBoundingClientRect();
        measured[a + k] = {
          dx: srcRect.left - dstRect.left,
          dy: srcRect.top - dstRect.top,
        };
      }
    }

    setFlyOffsets(measured);
    setTenGlowReady(false);

    const totalAnimMs = Math.max(0, cherryLeft - 1) * STAGGER_MS + FLIGHT_MS;
    const glowTimer = window.setTimeout(() => {
      setTenGlowReady(true);
    }, totalAnimMs);

    const cleanupTimer = window.setTimeout(() => {
      setFlyOffsets(null);
    }, totalAnimMs + 150);

    return () => {
      window.clearTimeout(glowTimer);
      window.clearTimeout(cleanupTimer);
    };
  }, [id, type, a, cherryLeft, movedToTen]);

  if (type === 'addition') {
    const showTenHighlight = (movedToTen && tenGlowReady) || step >= 2 || isQuestionDone;

    return (
      <div className="block-visualizer">
        {/* Left: Ten-frame for 'a' */}
        <div className={`ten-frame-box ${showTenHighlight ? 'ten-complete' : ''}`}>
          <div className="frame-label">
            {movedToTen
              ? showTenHighlight
                ? '✨ 10 の まとまり！'
                : '10 を つくっているよ…'
              : 'あと いくつで 10？'}
          </div>
          <div className="ten-frame-grid">
            {Array.from({ length: 10 }, (_, idx) => {
              if (idx < a) {
                return (
                  <div
                    key={idx}
                    ref={(el) => {
                      tenSlotRefs.current[idx] = el;
                    }}
                    className="block-dot dot-red"
                  />
                );
              }

              const moveOrder = idx - a; // 0 .. cherryLeft - 1
              const offset = flyOffsets?.[idx];

              if (movedToTen) {
                if (offset) {
                  const delayMs = moveOrder * STAGGER_MS;
                  return (
                    <div
                      key={idx}
                      ref={(el) => {
                        tenSlotRefs.current[idx] = el;
                      }}
                      className="block-dot dot-empty"
                      style={{ position: 'relative' }}
                    >
                      <div
                        className="block-dot dot-blue block-fly-in"
                        style={
                          {
                            '--from-x': `${offset.dx}px`,
                            '--from-y': `${offset.dy}px`,
                            animationDelay: `${delayMs}ms`,
                            animationDuration: `${FLIGHT_MS}ms`,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    ref={(el) => {
                      tenSlotRefs.current[idx] = el;
                    }}
                    className="block-dot dot-blue"
                  />
                );
              }

              return (
                <div
                  key={idx}
                  ref={(el) => {
                    tenSlotRefs.current[idx] = el;
                  }}
                  className="block-dot dot-empty pulse-hint"
                />
              );
            })}
          </div>
        </div>

        {/* Right: Remaining blocks from 'b' (do NOT show cherryRight number in label) */}
        <div className="side-frame-box">
          <div className="frame-label">{movedToTen ? 'のこり' : `たす かず (${b})`}</div>
          <div className="side-blocks-grid">
            {Array.from({ length: b }, (_, idx) => {
              const isMoved = movedToTen && idx < cherryLeft;
              const isAnimatingOut = isMoved && flyOffsets !== null;
              const departDelayMs = idx * STAGGER_MS;

              return (
                <div
                  key={idx}
                  ref={(el) => {
                    sideSlotRefs.current[idx] = el;
                  }}
                  className={`block-dot ${
                    isAnimatingOut
                      ? 'dot-departing'
                      : isMoved
                      ? 'dot-ghost'
                      : 'dot-blue'
                  } ${!isMoved && step === 1 ? 'pulse-blue' : ''}`}
                  style={
                    isAnimatingOut
                      ? { animationDelay: `${departDelayMs}ms` }
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Subtraction (減加法: 10 + cherryRight, subtract b from 10)
  const showCrossed = (step === 1 && isStepSolved) || step >= 2 || isQuestionDone;
  const highlightRemain = step >= 2 || isQuestionDone;

  return (
    <div className="block-visualizer">
      {/* Left: Ten-frame (10) */}
      <div className="ten-frame-box">
        <div className="frame-label">
          {step >= 1 || isQuestionDone ? `10 から ${b} を ひく` : '10 の まとまり'}
        </div>
        <div className="ten-frame-grid">
          {Array.from({ length: 10 }, (_, idx) => {
            const isSubtracted = (step >= 1 || isQuestionDone) && idx >= intermediateResult;
            return (
              <div
                key={idx}
                className={`block-dot ${
                  isSubtracted
                    ? 'dot-crossed'
                    : highlightRemain || showCrossed
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
          {step === 0 && !isStepSolved && !isQuestionDone
            ? 'ばらは いくつ？'
            : `ばら (${cherryRight})`}
        </div>
        <div className="side-blocks-grid">
          {Array.from({ length: cherryRight }, (_, idx) => (
            <div
              key={idx}
              className={`block-dot ${
                highlightRemain ? 'dot-orange pop-in' : 'dot-orange'
              } ${step === 0 && !isStepSolved && !isQuestionDone ? 'pulse-hint' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
