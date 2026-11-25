import React, { useState } from 'react';
import type { PlayerData } from '../types';
import { TRAINS } from '../data/trains';
import { sound, voiceGuide } from '../utils/sound';

interface ZukanScreenProps {
  playerData: PlayerData;
  onBack: () => void;
}

export const ZukanScreen: React.FC<ZukanScreenProps> = ({ playerData, onBack }) => {
  const [filter, setFilter] = useState<'all' | 'unlocked'>('all');
  const unlockedCount = playerData.unlockedTrainIds.length;
  const totalCount = TRAINS.length;

  const displayedTrains =
    filter === 'unlocked'
      ? TRAINS.filter((t) => playerData.unlockedTrainIds.includes(t.id))
      : TRAINS;

  return (
    <div className="screen-container" style={{ background: '#f8fafc' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <h2 style={{ fontSize: '1.8rem', color: '#1e3a8a' }}>📖 でんしゃずかん</h2>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#475569' }}>
          あつめた かず: {unlockedCount} / {totalCount}
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          className={`assist-chip ${filter === 'all' ? 'on' : 'off'}`}
          onClick={() => {
            sound.playClick();
            setFilter('all');
          }}
        >
          ぜんぶ ({totalCount})
        </button>
        <button
          className={`assist-chip ${filter === 'unlocked' ? 'on' : 'off'}`}
          onClick={() => {
            sound.playClick();
            setFilter('unlocked');
          }}
        >
          ゲットずみ ({unlockedCount})
        </button>
      </div>

      {displayedTrains.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            gap: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '3rem' }}>🚆</div>
          <div style={{ fontWeight: 'bold' }}>
            まだ でんしゃを もっていないよ。
            <br />
            10マイル ためて ガチャを ひいてみよう！
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '14px',
            padding: '4px',
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
          }}
        >
          {displayedTrains.map((train) => {
            const isUnlocked = playerData.unlockedTrainIds.includes(train.id);
            return (
              <div
                key={train.id}
                onClick={() => {
                  if (isUnlocked) {
                    sound.playClick();
                    voiceGuide.speak(`${train.name}。${train.description}`);
                  }
                }}
                style={{
                  background: isUnlocked ? 'white' : '#e2e8f0',
                  borderRadius: '14px',
                  padding: '8px',
                  boxShadow: isUnlocked ? '0 4px 8px rgba(0,0,0,0.08)' : 'none',
                  opacity: isUnlocked ? 1 : 0.65,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  border: isUnlocked ? '2px solid #60a5fa' : '2px dashed #94a3b8',
                  cursor: isUnlocked ? 'pointer' : 'default',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    backgroundColor: '#cbd5e1',
                    borderRadius: '10px',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '2rem',
                  }}
                >
                  {isUnlocked ? (
                    <img
                      src={train.imagePath}
                      alt={train.name}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.innerHTML = '🚂';
                      }}
                    />
                  ) : (
                    '❓'
                  )}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b' }}>
                  {isUnlocked ? train.name : '？？？'}
                </div>
                {isUnlocked && (
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                    {train.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <button
          className="toy-button"
          onClick={() => {
            sound.playClick();
            voiceGuide.stop();
            onBack();
          }}
        >
          もどる
        </button>
      </div>
    </div>
  );
};
