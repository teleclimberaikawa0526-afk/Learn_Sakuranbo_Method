import { useState } from 'react';
import type { GameState, CourseType } from './types';
import { useGameData } from './hooks/useGameData';
import { TitleScreen } from './components/TitleScreen';
import { GameScreen } from './components/GameScreen';
import { ResultScreen } from './components/ResultScreen';
import { ZukanScreen } from './components/ZukanScreen';
import './index.css';

function App() {
  const { playerData, addMiles, unlockTrain, spendMiles, isLoaded, exportData, importData } =
    useGameData();
  const [gameState, setGameState] = useState<GameState>('title');
  const [course, setCourse] = useState<CourseType>('addition');
  const [lastEarnedMiles, setLastEarnedMiles] = useState(0);
  const [lastTotalQuestions, setLastTotalQuestions] = useState(5);

  if (!isLoaded) {
    return <div className="loading-screen">よみこみちゅう...</div>;
  }

  const handleStartGame = (selectedCourse: CourseType) => {
    setCourse(selectedCourse);
    setGameState('playing');
  };

  const handleFinishSession = (earnedMiles: number, totalQuestions: number) => {
    setLastEarnedMiles(earnedMiles);
    setLastTotalQuestions(totalQuestions);
    setGameState('result');
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
          exportData={exportData}
          importData={importData}
        />
      )}

      {gameState === 'playing' && (
        <GameScreen
          course={course}
          currentMiles={playerData.miles}
          onAddMiles={addMiles}
          onFinishSession={handleFinishSession}
          onExitToTitle={() => setGameState('title')}
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
    </>
  );
}

export default App;
