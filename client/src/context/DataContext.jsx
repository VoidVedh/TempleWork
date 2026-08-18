import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_paid: 0,
    paid_count: 0,
    today_paid: 0,
    total_unpaid: 0,
    unpaid_count: 0,
    total_expenses: 0,
    expense_count: 0,
    today_expenses: 0,
    net_balance: 0,
    budget_total: 0,
    budget_used_pct: 0,
    budget_remaining_pct: 100
  });
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDashboardStats = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await apiRequest('/dashboard/stats');
      setStats(res.stats);
      setRecentReceipts(res.recent_receipts || []);
      setRecentExpenses(res.recent_expenses || []);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  return (
    <DataContext.Provider value={{
      stats,
      recentReceipts,
      recentExpenses,
      loading,
      refreshStats: fetchDashboardStats
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
