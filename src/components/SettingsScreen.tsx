import React, { useState } from 'react';
import type { PlayerData } from '../types';
import { TRAINS } from '../data/trains';
import { sound } from '../utils/sound';

interface SettingsScreenProps {
  playerData: PlayerData;
  currentPassword: string;
  onResetMiles: () => void;
  onResetTrains: () => void;
  onUpdatePassword: (newPassword: string) => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  playerData,
  currentPassword,
  onResetMiles,
  onResetTrains,
  onUpdatePassword,
  onBack,
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authInput, setAuthInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [shakeAuth, setShakeAuth] = useState(false);

  const [confirmTarget, setConfirmTarget] = useState<'miles' | 'trains' | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwError, setPwError] = useState('');

  const showSuccess = (msg: string) => {
    setStatusBanner(msg);
    window.setTimeout(() => {
      setStatusBanner((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleAuthSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (authInput === currentPassword) {
      sound.playStepCorrect();
      setAuthError('');
      setIsUnlocked(true);
    } else {
      sound.playWrong();
      setAuthError('パスワードが ちがいます');
      setShakeAuth(true);
      setAuthInput('');
      window.setTimeout(() => setShakeAuth(false), 450);
    }
  };

  const handlePinDigit = (digit: string) => {
    sound.playClick();
    setAuthError('');
    setAuthInput((prev) => (prev.length < 16 ? prev + digit : prev));
  };

  const handlePinBackspace = () => {
    sound.playClick();
    setAuthError('');
    setAuthInput((prev) => prev.slice(0, -1));
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');

    if (newPw.length < 4) {
      sound.playWrong();
      setPwError('パスワードは 4文字以上で 入力してください');
      return;
    }
    if (newPw !== confirmPw) {
      sound.playWrong();
      setPwError('確認用の パスワードが 一致しません');
      return;
    }

    sound.playStepCorrect();
    onUpdatePassword(newPw);
    setNewPw('');
    setConfirmPw('');
    showSuccess('パスワードを 変更しました！');
  };

  // 1. Password Gate Screen
  if (!isUnlocked) {
    return (
      <div className="screen-container settings-screen">
        <div className="glass-panel settings-auth-card">
          <h2 className="settings-title">🔒 せってい（保護者向け）</h2>
          <p className="settings-desc">パスワードを 入力してください</p>

          <form onSubmit={handleAuthSubmit} className="settings-auth-form">
            <input
              type="password"
              value={authInput}
              onChange={(e) => {
                setAuthError('');
                setAuthInput(e.target.value);
              }}
              placeholder="パスワード"
              className={`settings-pw-input ${shakeAuth ? 'shake' : ''}`}
              autoComplete="off"
            />

            {authError && <div className="settings-error-text">{authError}</div>}

            {/* Quick numeric keypad for convenient touch entry (e.g. 0000) */}
            <div className="pin-pad-grid">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  className="pin-key"
                  onClick={() => handlePinDigit(d)}
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                className="pin-key sub"
                onClick={() => {
                  sound.playClick();
                  setAuthInput('');
                  setAuthError('');
                }}
              >
                クリア
              </button>
              <button type="button" className="pin-key" onClick={() => handlePinDigit('0')}>
                0
              </button>
              <button type="button" className="pin-key sub" onClick={handlePinBackspace}>
                ⌫
              </button>
            </div>

            <button
              type="submit"
              className="toy-button blue"
              disabled={authInput.length === 0}
              style={{ width: '100%', marginTop: '4px' }}
            >
              ひらいて せっていする
            </button>
          </form>

          <button
            type="button"
            className="toy-button"
            style={{
              background: '#e2e8f0',
              color: '#475569',
              borderBottomColor: '#cbd5e1',
              width: '100%',
            }}
            onClick={() => {
              sound.playClick();
              onBack();
            }}
          >
            タイトルへ もどる
          </button>
        </div>
      </div>
    );
  }

  // 2. Unlocked Settings Menu
  const unlockedCount = playerData.unlockedTrainIds.length;

  return (
    <div className="screen-container settings-screen unlocked">
      <div className="settings-header">
        <h2 className="settings-title">⚙️ せってい</h2>
        <button
          className="mini-nav-btn"
          onClick={() => {
            sound.playClick();
            onBack();
          }}
        >
          ◀ タイトルへ もどる
        </button>
      </div>

      {statusBanner && <div className="settings-success-banner">✅ {statusBanner}</div>}

      <div className="settings-sections">
        {/* Section 1: Reset Miles */}
        <div className="glass-panel settings-card">
          <div className="settings-card-header">
            <div>
              <h3 className="settings-card-title">⭐ 積算マイルの リセット</h3>
              <p className="settings-card-sub">現在のマイル: {playerData.miles} マイル</p>
            </div>
          </div>

          {confirmTarget === 'miles' ? (
            <div className="confirm-box">
              <div className="confirm-text">
                ほんとうに 積算マイル（{playerData.miles} マイル）を 0 にリセットしますか？
              </div>
              <div className="confirm-actions">
                <button
                  type="button"
                  className="toy-button pink"
                  onClick={() => {
                    sound.playClick();
                    onResetMiles();
                    setConfirmTarget(null);
                    showSuccess('積算マイルを 0 にリセットしました');
                  }}
                >
                  リセットする
                </button>
                <button
                  type="button"
                  className="mini-nav-btn"
                  onClick={() => {
                    sound.playClick();
                    setConfirmTarget(null);
                  }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={`toy-button ${playerData.miles > 0 ? 'pink' : 'disabled'}`}
              disabled={playerData.miles === 0}
              onClick={() => {
                sound.playClick();
                setConfirmTarget('miles');
              }}
            >
              {playerData.miles > 0 ? 'マイルを リセットする' : 'マイルは 0 です'}
            </button>
          )}
        </div>

        {/* Section 2: Reset Collected Trains */}
        <div className="glass-panel settings-card">
          <div className="settings-card-header">
            <div>
              <h3 className="settings-card-title">🚆 集めた電車の リセット</h3>
              <p className="settings-card-sub">
                現在の収集数: {unlockedCount} / {TRAINS.length} 車両
              </p>
            </div>
          </div>

          {confirmTarget === 'trains' ? (
            <div className="confirm-box">
              <div className="confirm-text">
                ほんとうに 集めた電車（{unlockedCount} 車両）を すべて リセットしますか？
              </div>
              <div className="confirm-actions">
                <button
                  type="button"
                  className="toy-button pink"
                  onClick={() => {
                    sound.playClick();
                    onResetTrains();
                    setConfirmTarget(null);
                    showSuccess('集めた電車を リセットしました');
                  }}
                >
                  リセットする
                </button>
                <button
                  type="button"
                  className="mini-nav-btn"
                  onClick={() => {
                    sound.playClick();
                    setConfirmTarget(null);
                  }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={`toy-button ${unlockedCount > 0 ? 'pink' : 'disabled'}`}
              disabled={unlockedCount === 0}
              onClick={() => {
                sound.playClick();
                setConfirmTarget('trains');
              }}
            >
              {unlockedCount > 0 ? '集めた電車を リセットする' : '集めた電車は 0 です'}
            </button>
          )}
        </div>

        {/* Section 3: Change Password */}
        <div className="glass-panel settings-card">
          <h3 className="settings-card-title">🔑 パスワードの 変更</h3>
          <p className="settings-card-sub">4文字以上で 新しいパスワードを 設定できます</p>

          <form onSubmit={handlePasswordChange} className="pw-change-form">
            <div className="pw-field-row">
              <input
                type={showNewPw ? 'text' : 'password'}
                inputMode="numeric"
                value={newPw}
                onChange={(e) => {
                  setPwError('');
                  setNewPw(e.target.value);
                }}
                placeholder="新しいパスワード（4文字以上）"
                className="settings-text-input"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="pw-eye-btn"
                onClick={() => setShowNewPw((prev) => !prev)}
                title="パスワードを表示"
              >
                {showNewPw ? '🙈' : '👁️'}
              </button>
            </div>

            <input
              type={showNewPw ? 'text' : 'password'}
              inputMode="numeric"
              value={confirmPw}
              onChange={(e) => {
                setPwError('');
                setConfirmPw(e.target.value);
              }}
              placeholder="もういちど 入力（確認用）"
              className="settings-text-input"
              autoComplete="new-password"
            />

            {pwError && <div className="settings-error-text">{pwError}</div>}

            <button
              type="submit"
              className="toy-button blue"
              disabled={newPw.length === 0 || confirmPw.length === 0}
            >
              パスワードを 変更する
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
