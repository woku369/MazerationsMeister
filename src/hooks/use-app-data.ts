'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  appDataManager, 
  saveTanks, 
  saveInventory, 
  saveProtocols, 
  saveTasks,
  getTanks,
  getInventory, 
  getProtocols
} from '@/lib/app-data-manager';

/**
 * 🗄️ APP-DATEN HOOKS
 * Einfache React-Hooks für persistente Echtdaten
 * Ersetzt alle Mock-Daten und manuelle localStorage-Aufrufe
 */

/**
 * 🚀 TANK-DATEN HOOK
 */
export function useTanks() {
  const [tanks, setTanks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial load
    const loadedTanks = getTanks();
    setTanks(loadedTanks);
    setIsLoading(false);

    // Listen for external changes
    const handleDataChange = (event: CustomEvent) => {
      if (event.detail.key === 'tankDefinitions') {
        setTanks([...event.detail.value]);
      }
    };

    window.addEventListener('appDataChanged', handleDataChange as EventListener);
    
    return () => {
      window.removeEventListener('appDataChanged', handleDataChange as EventListener);
    };
  }, []);

  const updateTanks = useCallback(async (newTanks: any[]) => {
    setTanks(newTanks);
    await saveTanks(newTanks);
  }, []);

  const addTank = useCallback(async (tank: any) => {
    const updatedTanks = [...tanks, tank];
    await updateTanks(updatedTanks);
  }, [tanks, updateTanks]);

  const updateTank = useCallback(async (tankId: string, updates: Partial<any>) => {
    const updatedTanks = tanks.map(tank => 
      tank.id === tankId || tank.tankNr === tankId 
        ? { ...tank, ...updates }
        : tank
    );
    await updateTanks(updatedTanks);
  }, [tanks, updateTanks]);

  const deleteTank = useCallback(async (tankId: string) => {
    const updatedTanks = tanks.filter(tank => 
      tank.id !== tankId && tank.tankNr !== tankId
    );
    await updateTanks(updatedTanks);
  }, [tanks, updateTanks]);

  return {
    tanks,
    isLoading,
    updateTanks,
    addTank,
    updateTank,
    deleteTank
  };
}

/**
 * 📦 INVENTAR-DATEN HOOK
 */
export function useInventory() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial load
    const loadedInventory = getInventory();
    setInventory(loadedInventory);
    setIsLoading(false);

    // Listen for external changes
    const handleDataChange = (event: CustomEvent) => {
      if (event.detail.key === 'inventoryItems') {
        setInventory([...event.detail.value]);
      }
    };

    window.addEventListener('appDataChanged', handleDataChange as EventListener);
    
    return () => {
      window.removeEventListener('appDataChanged', handleDataChange as EventListener);
    };
  }, []);

  const updateInventory = useCallback(async (newInventory: any[]) => {
    setInventory(newInventory);
    await saveInventory(newInventory);
  }, []);

  const addInventoryItem = useCallback(async (item: any) => {
    const updatedInventory = [...inventory, item];
    await updateInventory(updatedInventory);
  }, [inventory, updateInventory]);

  const updateInventoryItem = useCallback(async (itemId: string, updates: Partial<any>) => {
    const updatedInventory = inventory.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    );
    await updateInventory(updatedInventory);
  }, [inventory, updateInventory]);

  const deleteInventoryItem = useCallback(async (itemId: string) => {
    const updatedInventory = inventory.filter(item => item.id !== itemId);
    await updateInventory(updatedInventory);
  }, [inventory, updateInventory]);

  return {
    inventory,
    isLoading,
    updateInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem
  };
}

/**
 * 📋 PROTOKOLL-DATEN HOOK
 */
export function useProtocols() {
  const [protocols, setProtocols] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial load
    const loadedProtocols = getProtocols();
    setProtocols(loadedProtocols);
    setIsLoading(false);

    // Listen for external changes
    const handleDataChange = (event: CustomEvent) => {
      if (event.detail.key === 'mazerationProtocols') {
        setProtocols([...event.detail.value]);
      }
    };

    window.addEventListener('appDataChanged', handleDataChange as EventListener);
    
    return () => {
      window.removeEventListener('appDataChanged', handleDataChange as EventListener);
    };
  }, []);

  const updateProtocols = useCallback(async (newProtocols: any[]) => {
    setProtocols(newProtocols);
    await saveProtocols(newProtocols);
  }, []);

  const addProtocol = useCallback(async (protocol: any) => {
    const updatedProtocols = [...protocols, protocol];
    await updateProtocols(updatedProtocols);
  }, [protocols, updateProtocols]);

  const updateProtocol = useCallback(async (protocolId: string, updates: Partial<any>) => {
    const updatedProtocols = protocols.map(protocol => 
      protocol.id === protocolId ? { ...protocol, ...updates } : protocol
    );
    await updateProtocols(updatedProtocols);
  }, [protocols, updateProtocols]);

  const deleteProtocol = useCallback(async (protocolId: string) => {
    const updatedProtocols = protocols.filter(protocol => protocol.id !== protocolId);
    await updateProtocols(updatedProtocols);
  }, [protocols, updateProtocols]);

  return {
    protocols,
    isLoading,
    updateProtocols,
    addProtocol,
    updateProtocol,
    deleteProtocol
  };
}

/**
 * ✅ DASHBOARD-TASKS HOOK
 */
export function useDashboardTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial load from app data manager
    const data = appDataManager.getData();
    setTasks(data.dashboardTasks);
    setIsLoading(false);

    // Listen for external changes
    const handleDataChange = (event: CustomEvent) => {
      if (event.detail.key === 'dashboardTasks') {
        setTasks([...event.detail.value]);
      }
    };

    window.addEventListener('appDataChanged', handleDataChange as EventListener);
    
    return () => {
      window.removeEventListener('appDataChanged', handleDataChange as EventListener);
    };
  }, []);

  const updateTasks = useCallback(async (newTasks: any[]) => {
    setTasks(newTasks);
    await saveTasks(newTasks);
  }, []);

  const addTask = useCallback(async (task: any) => {
    const updatedTasks = [...tasks, task];
    await updateTasks(updatedTasks);
  }, [tasks, updateTasks]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<any>) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    );
    await updateTasks(updatedTasks);
  }, [tasks, updateTasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    await updateTasks(updatedTasks);
  }, [tasks, updateTasks]);

  return {
    tasks,
    isLoading,
    updateTasks,
    addTask,
    updateTask,
    deleteTask
  };
}

/**
 * ⚙️ APP-EINSTELLUNGEN HOOK
 */
export function useAppSettings() {
  const [settings, setSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load all settings
    const data = appDataManager.getData();
    setSettings({
      dataPath: data.dataPath,
      oneDrivePath: data.oneDrivePath,
      oneDriveConfig: data.oneDriveConfig,
      githubToken: data.githubToken,
      githubEnabled: data.githubEnabled,
      inventoryCategories: data.inventoryCategories
    });
    setIsLoading(false);
  }, []);

  const updateSetting = useCallback(async (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
    await appDataManager.saveData(key as any, value);
  }, []);

  return {
    settings,
    isLoading,
    updateSetting
  };
}

/**
 * 📊 APP-STATUS HOOK
 */
export function useAppDataStatus() {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    const updateStatus = () => {
      const newStatus = appDataManager.getDataStatus();
      setStatus(newStatus);
    };

    updateStatus();
    
    // Update status every 10 seconds
    const interval = setInterval(updateStatus, 10000);
    
    return () => clearInterval(interval);
  }, []);

  return status;
}