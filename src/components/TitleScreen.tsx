import React, { useState } from 'react';
import type { CourseType } from '../types';
import { TRAINS } from '../data/trains';
import { sound } from '../utils/sound';

interface TitleScreenProps {
  currentMiles: number;
  unlockedCount: number;
  onStartGame: (course: CourseType) => void;
  onOpenZukan: () => void;
  onOpenGacha: () => void;
  onOpenSettings: () => void;
  exportData?: () => string;
  importData?: (dataStr: string) => boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  currentMiles,
  unlockedCount,
  onStartGame,
  onOpenZukan,
  onOpenGacha,
  onOpenSettings,
  exportData,
  importData,
}) => {
  const [showTransfer, setShowTransfer] = useState(false);
  const [importText, setImportText] = useState('');

  const canPullGacha = currentMiles >= 10;

  const handleExport = () => {
    if (exportData) {
      const dataStr = exportData();
      navigator.clipboard
        .writeText(dataStr)
        .then(() => {
          alert(
            'データをコピーしました！あたらしい画面で「ふくげん」をえらんで貼り付けてください。'
          );
        })
        .catch(() => {
          prompt('以下のテキストをコピーしてください:', dataStr);
        });
    }
  };

  const handleImport = () => {
    if (importData && importText) {
      const success = importData(importText);
      if (success) {
        alert('データの引き継ぎに成功しました！');
        setShowTransfer(false);
        setImportText('');
      } else {
        alert('データの形式が間違っています。');
      }
    }
  };

  return (
    <div className="screen-container title-screen">
      {/* Miles Display */}
      <div className="glass-panel title-miles-card">
        <div className="miles-display" style={{ fontSize: '1.15rem' }}>
          ⭐ マイル: {currentMiles}
        </div>
      </div>

      {/* Hero Title */}
      <div className="title-hero">
        <div className="title-badge">🍒 しょうがく 1ねんせい むけ 🚆</div>
        <h1 className="title-heading">
          さくらんぼ計算
          <br />
          でんしゃランド
        </h1>
        <p className="title-sub">
          ステップごとに マイルを ためて、でんしゃを あつめよう！
        </p>
      </div>

      {/* Course Selection */}
      <div className="title-btn-group">
        <button
          className="toy-button pink"
          onClick={() => {
            sound.playClick();
            onStartGame('addition');
          }}
        >
          🍒 たしざん（くりあがり）
          <div className="btn-sub">れい：8 ＋ 5 ＝ 13</div>
        </button>

        <button
          className="toy-button blue"
          onClick={() => {
            sound.playClick();
            onStartGame('subtraction');
          }}
        >
          🍒 ひきざん（くりさがり）
          <div className="btn-sub">れい：13 − 5 ＝ 8</div>
        </button>

        <button
          className="toy-button green"
          onClick={() => {
            sound.playClick();
            onStartGame('mixed');
          }}
        >
          🌈 ミックス チャレンジ
          <div className="btn-sub">たしざん と ひきざん の りょうほう</div>
        </button>
      </div>

      {/* Gacha & Zukan */}
      <div className="title-btn-group reward-group">
        <button
          className="toy-button gold"
          onClick={() => {
            sound.playClick();
            onOpenGacha();
          }}
        >
          🎁 でんしゃガチャ
          {canPullGacha && <span className="gacha-ready-tag">ひけるよ！</span>}
        </button>

        <button
          className="toy-button purple"
          onClick={() => {
            sound.playClick();
            onOpenZukan();
          }}
        >
          📖 でんしゃずかん（{unlockedCount} / {TRAINS.length}）
        </button>
      </div>

      <div className="title-footer-links">
        <button
          className="footer-link-btn"
          onClick={() => {
            sound.playClick();
            onOpenSettings();
          }}
        >
          ⚙️ せってい
        </button>
        <button
          className="footer-link-btn"
          onClick={() => {
            sound.playClick();
            setShowTransfer(true);
          }}
        >
          🔄 データの引き継ぎ
        </button>
      </div>

      {showTransfer && (
        <div className="modal-overlay">
          <div className="glass-panel modal-card">
            <h2 style={{ margin: 0, fontSize: '1.2rem', textAlign: 'center' }}>
              データの引き継ぎ
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#334155', margin: 0 }}>
              べつのブラウザやスマホに マイルと ずかんを うつせます。
            </p>

            <button className="toy-button green" style={{ padding: '12px' }} onClick={handleExport}>
              1. データをコピーする
            </button>

            <div style={{ borderTop: '1px dashed #cbd5e1', margin: '4px 0' }} />

            <p style={{ fontSize: '0.9rem', color: '#334155', margin: 0 }}>
              コピーしたデータを貼り付けてください：
            </p>
            <input
              type="text"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="ここに貼り付け"
              style={{ padding: '10px', borderRadius: '8px', border: '2px solid #cbd5e1' }}
            />
            <button className="toy-button blue" style={{ padding: '12px' }} onClick={handleImport}>
              2. データを復元する
            </button>

            <button
              className="toy-button"
              style={{
                background: '#e2e8f0',
                color: '#475569',
                borderBottomColor: '#cbd5e1',
                padding: '10px',
                marginTop: '4px',
              }}
              onClick={() => setShowTransfer(false)}
            >
              とじる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
