import React, { useState, useEffect } from 'react';
import type { PlayerData } from '../types';
import { TRAINS } from '../data/trains';
import type { Train } from '../data/trains';
import { sound, voiceGuide } from '../utils/sound';
import { withBase } from '../utils/assetUrl';

interface ResultScreenProps {
  earnedMiles: number;
  totalQuestions: number;
  playerData: PlayerData;
  onGoTitle: () => void;
  onSpendMiles: (amount: number) => boolean;
  onUnlockTrain: (trainId: string) => void;
  isGachaOnly?: boolean;
}

const GACHA_COST = 10;

export const ResultScreen: React.FC<ResultScreenProps> = ({
  earnedMiles,
  totalQuestions,
  playerData,
  onGoTitle,
  onSpendMiles,
  onUnlockTrain,
  isGachaOnly = false,
}) => {
  const [gachaResult, setGachaResult] = useState<Train | null>(null);
  const [isNewTrain, setIsNewTrain] = useState(true);
  const [isGachaAnimating, setIsGachaAnimating] = useState(false);

  useEffect(() => {
    if (!isGachaOnly) {
      voiceGuide.speak(
        `ぜんぶ クリアしたよ！${earnedMiles}マイル ゲット！すごいね！`
      );
    }
    return () => {
      voiceGuide.stop();
    };
  }, [isGachaOnly, earnedMiles]);

  const handleGacha = () => {
    if (playerData.miles < GACHA_COST || isGachaAnimating) return;

    // Prioritize trains not yet unlocked (same mechanic as Math_word_problem_with_train)
    const lockedTrains = TRAINS.filter(
      (t) => !playerData.unlockedTrainIds.includes(t.id)
    );
    const pool = lockedTrains.length > 0 ? lockedTrains : TRAINS;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    const willBeNew = !playerData.unlockedTrainIds.includes(selected.id);

    if (onSpendMiles(GACHA_COST)) {
      sound.playGacha();
      setIsGachaAnimating(true);
      setGachaResult(null);
      setIsNewTrain(willBeNew);

      window.setTimeout(() => {
        onUnlockTrain(selected.id);
        setGachaResult(selected);
        setIsGachaAnimating(false);
        voiceGuide.speak(`${selected.name} を ゲットしたよ！`);
      }, 1400);
    }
  };

  const getRarityLabel = (rarity: Train['rarity']) => {
    if (rarity === 'SuperRare') return { text: '★★★ スーパーレア', color: '#db2777' };
    if (rarity === 'Rare') return { text: '★★ レア', color: '#d97706' };
    return { text: '★ ノーマル', color: '#2563eb' };
  };

  return (
    <div
      className="screen-container"
      style={{
        alignItems: 'center',
        justifyContent: isGachaOnly ? 'center' : 'flex-start',
        gap: '16px',
      }}
    >
      {!isGachaOnly && (
        <>
          <h1 style={{ fontSize: '2.1rem', color: '#be123c', marginTop: '4px' }}>
            🎉 けっかはっぴょう 🎉
          </h1>

          <div className="glass-panel" style={{ width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#334155' }}>
              {totalQuestions}もん ぜんぶ クリア！
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: '#f59e0b', margin: '4px 0' }}>
              +{earnedMiles} <span style={{ fontSize: '1.5rem' }}>マイル ゲット！</span>
            </div>
            <div style={{ fontSize: '1rem', color: '#475569', fontWeight: 'bold' }}>
              さくらんぼ計算、とっても じょうずに できたね！
            </div>
          </div>
        </>
      )}

      {/* Train Gacha Panel */}
      <div
        className="glass-panel"
        style={{
          width: '100%',
          textAlign: 'center',
          background: 'rgba(254, 243, 199, 0.92)',
          borderColor: '#fde68a',
        }}
      >
        <div
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#b45309',
            marginBottom: '10px',
          }}
        >
          🎁 でんしゃガチャ
        </div>

        <div
          className="miles-display"
          style={{ justifyContent: 'center', marginBottom: '14px', fontSize: '1.7rem' }}
        >
          ⭐ いまの マイル: {playerData.miles}
        </div>

        {isGachaAnimating ? (
          <div
            style={{
              height: '180px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '3.8rem', animation: 'spin 0.55s linear infinite' }}>
              📦
            </div>
            <div style={{ fontWeight: 'bold', color: '#b45309' }}>なにが でるかな…？</div>
          </div>
        ) : gachaResult ? (
          <div style={{ animation: 'popIn 0.45s ease-out' }}>
            <div
              style={{
                display: 'inline-block',
                fontSize: '0.85rem',
                fontWeight: 800,
                color: 'white',
                background: getRarityLabel(gachaResult.rarity).color,
                padding: '3px 12px',
                borderRadius: '999px',
                marginBottom: '6px',
              }}
            >
              {getRarityLabel(gachaResult.rarity).text}
            </div>
            <h3 style={{ color: '#e11d48', margin: '4px 0 10px' }}>
              {isNewTrain ? '✨ あたらしい でんしゃ ゲット！' : '🚆 でんしゃを ゲット！'}
            </h3>

            <div
              style={{
                width: '165px',
                height: '165px',
                margin: '0 auto',
                background: 'white',
                borderRadius: '14px',
                padding: '8px',
                border: '4px solid #f59e0b',
                boxShadow: '0 6px 14px rgba(245, 158, 11, 0.25)',
              }}
            >
              <img
                src={withBase(gachaResult.imagePath)}
                alt={gachaResult.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '8px',
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    '<div style="font-size:4rem;text-align:center;line-height:140px">🚂</div>';
                }}
              />
            </div>

            <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '10px', color: '#1e293b' }}>
              {gachaResult.name}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '4px' }}>
              {gachaResult.description}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                className={`toy-button ${playerData.miles >= GACHA_COST ? 'green' : 'disabled'}`}
                disabled={playerData.miles < GACHA_COST}
                onClick={() => {
                  sound.playClick();
                  setGachaResult(null);
                  if (playerData.miles >= GACHA_COST) {
                    handleGacha();
                  }
                }}
              >
                もういっかい ひく (10マイル)
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              className={`toy-button ${playerData.miles >= GACHA_COST ? 'blue' : 'disabled'}`}
              onClick={handleGacha}
              disabled={playerData.miles < GACHA_COST || isGachaAnimating}
            >
              10マイルで ガチャをひく
            </button>
            {playerData.miles < GACHA_COST && (
              <div style={{ fontSize: '0.95rem', color: '#92400e', marginTop: '10px', fontWeight: 'bold' }}>
                あと {GACHA_COST - playerData.miles} マイルで ひけるよ！
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto', width: '100%', paddingTop: '12px', textAlign: 'center' }}>
        <button
          className="toy-button"
          onClick={() => {
            sound.playClick();
            voiceGuide.stop();
            onGoTitle();
          }}
        >
          タイトルへ もどる
        </button>
      </div>
    </div>
  );
};
