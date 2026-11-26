import { useState, useEffect, useCallback } from 'react';
import type { GameState, CourseType, ActiveSession } from './types';
import { useGameData } from './hooks/useGameData';
import { generateQuestions } from './utils/questionGenerator';
import { TitleScreen } from './components/TitleScreen';
import { GameScreen } from './components/GameScreen';
import { ResultScreen } from './components/ResultScreen';
import { ZukanScreen } from './components/ZukanScreen';
import { SettingsScreen } from './components/SettingsScreen';
import './index.css';

const ACTIVE_SESSION_KEY = 'sakuranbo_train_active_session';
const TOTAL_QUESTIONS = 5;

const loadSavedSession = (): ActiveSession | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveSession;
    if (
      Array.isArray(parsed.questions) &&
      parsed.questions.length > 0 &&
      typeof parsed.qIndex === 'number' &&
      typeof parsed.step === 'number' &&
      typeof parsed.earnedMiles === 'number'
    ) {
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse active session', e);
  }
  return null;
};

function App() {
  const {
    playerData,
    password,
    addMiles,
    unlockTrain,
    spendMiles,
    resetMiles,
    resetTrains,
    updatePassword,
    isLoaded,
    exportData,
    importData,
  } = useGameData();
  const [gameState, setGameState] = useState<GameState>('title');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [lastEarnedMiles, setLastEarnedMiles] = useState(0);
  const [lastTotalQuestions, setLastTotalQuestions] = useState(TOTAL_QUESTIONS);
  const [isSessionChecked, setIsSessionChecked] = useState(false);

  // Restore any interrupted session (e.g. device sleep / background reload) once player data loads
  useEffect(() => {
    if (!isLoaded || isSessionChecked) return;

    const saved = loadSavedSession();
    if (saved) {
      if (saved.isCompletedPendingCommit) {
        // Sleep happened right after answering the final step of question 5: commit miles safely
        localStorage.removeItem(ACTIVE_SESSION_KEY);
        if (saved.earnedMiles > 0) {
          addMiles(saved.earnedMiles);
        }
        setLastEarnedMiles(saved.earnedMiles);
        setLastTotalQuestions(saved.questions.length);
        setGameState('result');
      } else {
        // Resume mid-session without losing progress or "こんかいのマイル"
        setActiveSession(saved);
        setGameState('playing');
      }
    }
    setIsSessionChecked(true);
  }, [isLoaded, isSessionChecked, addMiles]);

  const persistSession = useCallback((session: ActiveSession | null) => {
    setActiveSession(session);
    if (session) {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  }, []);

  if (!isLoaded || !isSessionChecked) {
    return <div className="loading-screen">よみこみちゅう...</div>;
  }

  const handleStartGame = (selectedCourse: CourseType) => {
    const newSession: ActiveSession = {
      course: selectedCourse,
      questions: generateQuestions(selectedCourse, TOTAL_QUESTIONS),
      qIndex: 0,
      step: 0,
      earnedMiles: 0,
      stepHadMistake: false,
      showBlocks: true,
    };
    persistSession(newSession);
    setGameState('playing');
  };

  const handleFinishSession = (earnedMiles: number, totalQuestions: number) => {
    persistSession(null);
    if (earnedMiles > 0) {
      addMiles(earnedMiles);
    }
    setLastEarnedMiles(earnedMiles);
    setLastTotalQuestions(totalQuestions);
    setGameState('result');
  };

  const handleDiscardAndExit = () => {
    // Discard "こんかいのマイル" without adding to total miles
    persistSession(null);
    setGameState('title');
  };

  return (
    <>
      {gameState === 'title' && (
        <TitleScreen
          currentMiles={playerData.miles}
          unlockedCount={playerData.unlockedTrainIds.length}
          onStartGame={handleStartGame}
          onOpenZukan={() => setGameState('encyclopedia')}
          onOpenGacha={() => setGameState('gacha')}
          onOpenSettings={() => setGameState('settings')}
          exportData={exportData}
          importData={importData}
        />
      )}

      {gameState === 'playing' && activeSession && (
        <GameScreen
          initialSession={activeSession}
          currentMiles={playerData.miles}
          onUpdateSession={persistSession}
          onFinishSession={handleFinishSession}
          onExitToTitle={handleDiscardAndExit}
        />
      )}

      {gameState === 'result' && (
        <ResultScreen
          earnedMiles={lastEarnedMiles}
          totalQuestions={lastTotalQuestions}
          playerData={playerData}
          onGoTitle={() => setGameState('title')}
          onSpendMiles={spendMiles}
          onUnlockTrain={unlockTrain}
        />
      )}

      {gameState === 'gacha' && (
        <ResultScreen
          earnedMiles={0}
          totalQuestions={0}
          playerData={playerData}
          onGoTitle={() => setGameState('title')}
          onSpendMiles={spendMiles}
          onUnlockTrain={unlockTrain}
          isGachaOnly={true}
        />
      )}

      {gameState === 'encyclopedia' && (
        <ZukanScreen playerData={playerData} onBack={() => setGameState('title')} />
      )}

      {gameState === 'settings' && (
        <SettingsScreen
          playerData={playerData}
          currentPassword={password}
          onResetMiles={resetMiles}
          onResetTrains={resetTrains}
          onUpdatePassword={updatePassword}
          onBack={() => setGameState('title')}
        />
      )}
    </>
  );
}

export default App;
