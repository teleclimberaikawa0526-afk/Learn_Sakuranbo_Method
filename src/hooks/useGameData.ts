import { useState, useEffect } from 'react';
import type { PlayerData } from '../types';
import { TRAINS } from '../data/trains';

const VALID_TRAIN_IDS = new Set(TRAINS.map((t) => t.id));

const STORAGE_KEY = 'sakuranbo_train_player_data';
const PASSWORD_KEY = 'sakuranbo_train_settings_password';
const DEFAULT_PASSWORD = '0000';

const defaultData: PlayerData = {
  miles: 0,
  unlockedTrainIds: [],
};

export const useGameData = () => {
  const [playerData, setPlayerData] = useState<PlayerData>(defaultData);
  const [password, setPassword] = useState<string>(DEFAULT_PASSWORD);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.miles === 'number' && Array.isArray(parsed.unlockedTrainIds)) {
          const filteredIds = parsed.unlockedTrainIds.filter((id: unknown) =>
            typeof id === 'string' && VALID_TRAIN_IDS.has(id)
          );
          setPlayerData({ miles: parsed.miles, unlockedTrainIds: filteredIds });
        }
      } catch (e) {
        console.error('Failed to parse save data', e);
      }
    }

    const savedPassword = localStorage.getItem(PASSWORD_KEY);
    if (savedPassword && savedPassword.length > 0) {
      setPassword(savedPassword);
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

  const resetMiles = () => {
    save((prev) => ({ ...prev, miles: 0 }));
  };

  const resetTrains = () => {
    save((prev) => ({ ...prev, unlockedTrainIds: [] }));
  };

  const updatePassword = (newPassword: string) => {
    setPassword(newPassword);
    localStorage.setItem(PASSWORD_KEY, newPassword);
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

  return {
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
  };
};
