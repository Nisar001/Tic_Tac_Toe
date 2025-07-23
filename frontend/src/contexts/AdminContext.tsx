import React, { createContext, useContext, useState, useCallback } from 'react';
import { adminService, AdminStats, AdminUser, AdminGame, SystemSettings } from '../services/admin';

interface AdminContextType {
  stats: AdminStats | null;
  users: AdminUser[];
  userPage: number;
  userTotalPages: number;
  games: AdminGame[];
  gamePage: number;
  gameTotalPages: number;
  settings: SystemSettings | null;
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
  fetchUsers: (page?: number) => Promise<void>;
  fetchGames: (page?: number) => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateUser: (id: string, data: Partial<AdminUser>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<SystemSettings>) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
};

export const AdminProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [games, setGames] = useState<AdminGame[]>([]);
  const [gamePage, setGamePage] = useState(1);
  const [gameTotalPages, setGameTotalPages] = useState(1);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch {
      setError('Failed to load stats');
    }
    setLoading(false);
  }, []);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getUsers({ page, limit: 10 });
      setUsers(res.users);
      setUserPage(page);
      setUserTotalPages(res.pagination.totalPages);
    } catch {
      setError('Failed to load users');
    }
    setLoading(false);
  }, []);

  const fetchGames = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getGames({ page, limit: 10 });
      setGames(res.games);
      setGamePage(page);
      setGameTotalPages(res.pagination.totalPages);
    } catch {
      setError('Failed to load games');
    }
    setLoading(false);
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getSystemSettings();
      setSettings(data);
    } catch {
      setError('Failed to load settings');
    }
    setLoading(false);
  }, []);

  const updateUser = useCallback(async (id: string, data: Partial<AdminUser>) => {
    setLoading(true);
    setError(null);
    try {
      await adminService.updateUser(id, data);
      await fetchUsers(userPage);
    } catch {
      setError('Failed to update user');
    }
    setLoading(false);
  }, [fetchUsers, userPage]);

  const deleteUser = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await adminService.deleteUser(id);
      await fetchUsers(userPage);
    } catch {
      setError('Failed to delete user');
    }
    setLoading(false);
  }, [fetchUsers, userPage]);

  const updateSettings = useCallback(async (settingsUpdate: Partial<SystemSettings>) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await adminService.updateSystemSettings(settingsUpdate);
      setSettings(updated);
    } catch {
      setError('Failed to update settings');
    }
    setLoading(false);
  }, []);

  return (
    <AdminContext.Provider value={{
      stats, users, userPage, userTotalPages, games, gamePage, gameTotalPages, settings, loading, error,
      fetchStats, fetchUsers, fetchGames, fetchSettings, updateUser, deleteUser, updateSettings
    }}>
      {children}
    </AdminContext.Provider>
  );
};


