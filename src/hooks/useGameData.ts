import { useState, useEffect } from 'react';
import type { PlayerData } from '../types';

const STORAGE_KEY = 'sakuranbo_train_player_data';

const defaultData: PlayerData = {
  miles: 0,
  unlockedTrainIds: [],
};

export const useGameData = () => {
  const [playerData, setPlayerData] = useState<PlayerData>(defaultData);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.miles === 'number' && Array.isArray(parsed.unlockedTrainIds)) {
          setPlayerData(parsed);
        }
      } catch (e) {
        console.error('Failed to parse save data', e);
      }
    }
    setIsLoaded(true);
  }, []);

  const save = (updater: (prev: PlayerData) => PlayerData) => {
    setPlayerData((prev) => {
      const newData = updater(prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      return newData;
    });
  };

  const addMiles = (amount: number) => {
    save((prev) => ({ ...prev, miles: prev.miles + amount }));
  };

  const unlockTrain = (trainId: string) => {
    save((prev) => {
      if (!prev.unlockedTrainIds.includes(trainId)) {
        return {
          ...prev,
          unlockedTrainIds: [...prev.unlockedTrainIds, trainId],
        };
      }
      return prev;
    });
  };

  const spendMiles = (amount: number): boolean => {
    if (playerData.miles >= amount) {
      save((prev) => ({ ...prev, miles: prev.miles - amount }));
      return true;
    }
    return false;
  };

  const exportData = () => {
    return btoa(JSON.stringify(playerData));
  };

  const importData = (dataStr: string) => {
    try {
      const parsed = JSON.parse(atob(dataStr.trim()));
      if (typeof parsed.miles === 'number' && Array.isArray(parsed.unlockedTrainIds)) {
        setPlayerData(parsed);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  return { playerData, addMiles, unlockTrain, spendMiles, isLoaded, exportData, importData };
};
