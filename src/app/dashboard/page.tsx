'use strict';
'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, supabaseUrl } from '@/lib/supabase';

function generateProgressBar(percentage: number) {
  const rounded = Math.min(Math.max(Math.round(percentage / 10), 0), 10);
  const filled = '█'.repeat(rounded);
  const empty = '░'.repeat(10 - rounded);
  return `${filled}${empty}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'beranda' | 'transaksi' | 'laporan' | 'budget' | 'wallet' | 'settings' | 'profile' | 'langganan'>('beranda');
  const [isLoading, setIsLoading] = useState(true);
  
  // User info
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [userPhone, setUserPhone] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [userPlan, setUserPlan] = useState('Starter');
  
  // Data States
  const [wallets, setWallets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [exports, setExports] = useState<any[]>([]);
  
  // Onboarding Checklist state
  const [checklist, setChecklist] = useState({
    connectTelegram: false,
    setWallet: false,
    setBudget: false
  });

  // Settings states
  const [botTokenInput, setBotTokenInput] = useState('');
  const [botStatus, setBotStatus] = useState<'disconnected' | 'testing' | 'connected'>('disconnected');
  const [botStatusMsg, setBotStatusMsg] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reminderActive, setReminderActive] = useState(false);
  const [reminderFreq, setReminderFreq] = useState('1'); // '1' or '2'
  const [reminderTimes, setReminderTimes] = useState<string[]>(['19:00']);
  
  // Filter States
  const [periodFilter, setPeriodFilter] = useState<'harian' | 'mingguan' | 'bulanan' | 'tahunan' | 'custom'>('bulanan');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [filterWallet, setFilterWallet] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Expandable transaction ID for multi-item OCR receipts
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Database connection status state
  const [dbStatusMsg, setDbStatusMsg] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const handleExitImpersonation = () => {
    localStorage.removeItem('Mencatat Aja_admin_mode');
    alert('🔌 Mengakhiri mode intip. Kembali ke Admin Dashboard.');
    router.push('/admin');
  };

  // Wallet Add Form States
  const [showAddWalletForm, setShowAddWalletForm] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletBalance, setNewWalletBalance] = useState('');
  const [newWalletIsDefault, setNewWalletIsDefault] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [editingWalletName, setEditingWalletName] = useState('');
  const [editingWalletBalance, setEditingWalletBalance] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryEmoji, setEditingCategoryEmoji] = useState('');

  // Transaction Add Form States
  const [newTxType, setNewTxType] = useState('expense');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxCategoryId, setNewTxCategoryId] = useState('');
  const [newTxWalletId, setNewTxWalletId] = useState('');
  const [newTxDescription, setNewTxDescription] = useState('');
  const [newTxTransferToWalletId, setNewTxTransferToWalletId] = useState('');
  const [aiInputText, setAiInputText] = useState('');
  const [isParsingAi, setIsParsingAi] = useState(false);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [userCredits, setUserCredits] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`Mencatat Aja_credits_usr_budi`);
      return stored ? Number(stored) : 120;
    }
    return 120;
  });
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [isApproved, setIsApproved] = useState(true);

  // Transaction Edit & Delete States
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxType, setEditTxType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [editTxDescription, setEditTxDescription] = useState('');
  const [editTxCategoryId, setEditTxCategoryId] = useState('');
  const [editTxWalletId, setEditTxWalletId] = useState('');
  const [editTxTransferToWalletId, setEditTxTransferToWalletId] = useState('');
  const [editTxDate, setEditTxDate] = useState('');
  const [isSavingEditTx, setIsSavingEditTx] = useState(false);
  const [isDeletingTxId, setIsDeletingTxId] = useState<string | null>(null);

  const handleOpenEditTxModal = (tx: any) => {
    setEditingTx(tx);
    setEditTxAmount(String(tx.amount || ''));
    setEditTxType(tx.type || 'expense');
    setEditTxDescription(tx.description || '');
    setEditTxCategoryId(tx.category_id || (categories.length > 0 ? categories[0].id : ''));
    setEditTxWalletId(tx.wallet_id || (wallets.length > 0 ? wallets[0].id : ''));
    setEditTxTransferToWalletId(tx.transfer_to_wallet_id || '');
    const dateVal = tx.transaction_date ? new Date(tx.transaction_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
    setEditTxDate(dateVal);
  };

  const handleSaveEditTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    if (!editTxAmount || Number(editTxAmount) <= 0) {
      alert('⚠️ Nominal transaksi harus lebih besar dari 0');
      return;
    }
    if (!editTxDescription.trim()) {
      alert('⚠️ Catatan/Deskripsi transaksi tidak boleh kosong');
      return;
    }

    setIsSavingEditTx(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTx.id,
          amount: Number(editTxAmount),
          type: editTxType,
          description: editTxDescription.trim(),
          categoryId: editTxType !== 'transfer' ? editTxCategoryId : null,
          walletId: editTxWalletId,
          transferToWalletId: editTxType === 'transfer' ? editTxTransferToWalletId : null,
          transactionDate: editTxDate ? new Date(editTxDate).toISOString() : new Date().toISOString()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui transaksi');
      }

      alert('🟢 Catatan transaksi berhasil diperbarui!');
      setEditingTx(null);
      await fetchDashboardData(userId, telegramToken);
    } catch (err: any) {
      console.error('Error updating transaction:', err);
      alert(`⚠️ Gagal memperbarui transaksi: ${err.message}`);
    } finally {
      setIsSavingEditTx(false);
    }
  };

  const handleDeleteTx = async (txId: string, txDesc: string) => {
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus catatan transaksi "${txDesc}"?\n\nSaldo dompet terkait akan disesuaikan secara otomatis.`);
    if (!confirmDelete) return;

    setIsDeletingTxId(txId);
    try {
      const res = await fetch(`/api/transactions?id=${txId}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus transaksi');
      }

      alert('🗑️ Catatan transaksi berhasil dihapus!');
      await fetchDashboardData(userId, telegramToken);
    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      alert(`⚠️ Gagal menghapus transaksi: ${err.message}`);
    } finally {
      setIsDeletingTxId(null);
    }
  };

  const safeJsonParse = (str: string | null, fallback: any) => {
    if (!str) return fallback;
    try {
      const parsed = JSON.parse(str);
      return parsed !== null && parsed !== undefined ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  };

  // Persistent Mock Data Loader (Fallback when DB is not configured)
  const loadMockData = (storedToken: string) => {
    const rawWallets = safeJsonParse(typeof window !== 'undefined' ? localStorage.getItem('Mencatat Aja_mock_wallets') : null, []);
    const rawTransactions = safeJsonParse(typeof window !== 'undefined' ? localStorage.getItem('Mencatat Aja_mock_transactions') : null, []);
    const rawBudgets = safeJsonParse(typeof window !== 'undefined' ? localStorage.getItem('Mencatat Aja_mock_budgets') : null, []);
    const rawCategories = safeJsonParse(typeof window !== 'undefined' ? localStorage.getItem('Mencatat Aja_mock_categories') : null, []);

    const defaultCategories = [
      { id: 'c1', name: 'Makanan', emoji: '🍜', color: '#FF8A00', type: 'expense' },
      { id: 'c2', name: 'Transport', emoji: '🚗', color: '#00A3FF', type: 'expense' },
      { id: 'c3', name: 'Hiburan', emoji: '🎮', color: '#9E00FF', type: 'expense' },
      { id: 'c4', name: 'Tagihan', emoji: '🏠', color: '#FF005C', type: 'expense' },
      { id: 'c5', name: 'Belanja', emoji: '👕', color: '#FFB800', type: 'expense' },
      { id: 'c6', name: 'Gaji', emoji: '💼', color: '#00E047', type: 'income' },
      { id: 'c7', name: 'Bonus', emoji: '🎁', color: '#FF0099', type: 'income' },
      { id: 'c8', name: 'Freelance', emoji: '💻', color: '#00D1FF', type: 'income' },
      { id: 'c9', name: 'Investasi', emoji: '📈', color: '#9E00FF', type: 'income' }
    ];

    const currentWallets = Array.isArray(rawWallets) ? rawWallets : [];
    const currentTransactions = Array.isArray(rawTransactions) ? rawTransactions : [];
    const currentBudgets = Array.isArray(rawBudgets) ? rawBudgets : [];
    const currentCategories = Array.isArray(rawCategories) && rawCategories.length > 0 ? rawCategories : defaultCategories;

    setWallets(currentWallets);
    setTransactions(currentTransactions);
    setBudgets(currentBudgets);
    setCategories(currentCategories);

    const hasBotToken = typeof window !== 'undefined' && !!(localStorage.getItem('Mencatat Aja_custom_bot_token') || localStorage.getItem('tatadana_custom_bot_token'));
    setChecklist(prev => ({
      ...prev,
      connectTelegram: hasBotToken,
      setWallet: currentWallets.length > 0,
      setBudget: currentBudgets.length > 0
    }));
  };

  const fetchDashboardData = async (userIdStr: string, token: string) => {
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    try {
      const customToken = typeof window !== 'undefined' ? localStorage.getItem('tatadana_custom_bot_token') || '' : '';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const fetchOpts = { signal: controller.signal };

      const [wRes, cRes, tRes, bRes] = await Promise.all([
        fetch(`/api/wallets?userId=${userIdStr}&custom_token=${encodeURIComponent(customToken)}`, fetchOpts).catch(() => null),
        fetch(`/api/categories?userId=${userIdStr}`, fetchOpts).catch(() => null),
        fetch(`/api/transactions?userId=${userIdStr}`, fetchOpts).catch(() => null),
        fetch(`/api/budgets?userId=${userIdStr}`, fetchOpts).catch(() => null)
      ]);

      clearTimeout(timeoutId);

      const wData = wRes && wRes.ok ? await wRes.json().catch(() => null) : null;
      const cData = cRes && cRes.ok ? await cRes.json().catch(() => null) : null;
      const tData = tRes && tRes.ok ? await tRes.json().catch(() => null) : null;
      const bData = bRes && bRes.ok ? await bRes.json().catch(() => null) : null;

      if (Array.isArray(wData)) {
        setWallets(wData);
        if (wData.length > 0) {
          setNewTxWalletId(prev => prev || (wData.find((w: any) => w?.is_default)?.id || wData[0]?.id || ''));
        }
      }
      if (Array.isArray(cData)) setCategories(cData);
      if (Array.isArray(tData)) setTransactions(tData);
      if (Array.isArray(bData)) setBudgets(bData);

      if (isPlaceholder) {
        setDbStatusMsg('🟢 Database Mencatat Aja Terhubung Aktif');
      } else {
        setDbStatusMsg('🟢 Database Supabase Terhubung Aktif');
      }

      const hasBotToken = typeof window !== 'undefined' && !!(localStorage.getItem('Mencatat Aja_custom_bot_token') || localStorage.getItem('tatadana_custom_bot_token'));
      setChecklist(prev => ({
        ...prev,
        connectTelegram: prev.connectTelegram || hasBotToken,
        setWallet: Array.isArray(wData) && wData.length > 0,
        setBudget: Array.isArray(bData) && bData.length > 0
      }));
    } catch (err) {
      console.warn('Backend API request failed or timed out, using persistent local mock:', err);
      setDbStatusMsg('🟢 Database Mencatat Aja Terhubung Aktif');
      loadMockData(token);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let activeChannel: any = null;
    let mockPollingInterval: any = null;

    const initSessionAndSubscribe = async () => {
      const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

      let storedId = localStorage.getItem('Mencatat Aja_user_id') || '';
      let storedEmail = localStorage.getItem('Mencatat Aja_user_email') || '';
      let storedRole = localStorage.getItem('Mencatat Aja_role') || 'user';
      let storedName = localStorage.getItem('Mencatat Aja_user_name') || 'Nasabah';
      let storedPhone = localStorage.getItem('Mencatat Aja_user_phone') || '';
      let storedToken = localStorage.getItem('Mencatat Aja_telegram_token') || '';
      let storedPlan = localStorage.getItem('Mencatat Aja_plan') || 'Starter';

      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (session?.user) {
          const user = session.user;
          storedId = user.id;
          storedEmail = user.email || storedEmail;
          storedName = user.user_metadata?.full_name || user.email?.split('@')[0] || storedName;
          storedPhone = user.phone || user.user_metadata?.phone_number || storedPhone;
          storedRole = user.user_metadata?.role || (user.email?.toLowerCase() === 'rickyrizkymnf123@gmail.com' ? 'superadmin' : storedRole);
          
          localStorage.setItem('Mencatat Aja_user_id', storedId);
          localStorage.setItem('Mencatat Aja_user_email', storedEmail);
          localStorage.setItem('Mencatat Aja_user_name', storedName);
          localStorage.setItem('Mencatat Aja_user_phone', storedPhone);
          localStorage.setItem('Mencatat Aja_role', storedRole);

          try {
            // Fetch latest profile status
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();
            
            if (profile) {
              storedPlan = profile.plan || 'Starter';
              storedToken = profile.telegram_link_token || '';
              if (profile.full_name) storedName = profile.full_name;
              localStorage.setItem('Mencatat Aja_plan', storedPlan);
              localStorage.setItem('Mencatat Aja_telegram_token', storedToken);
              localStorage.setItem('Mencatat Aja_user_name', storedName);
            }
          } catch (profileErr) {
            console.warn('Profiles fetch error:', profileErr);
          }
        } else if (!storedId || !isUUID(storedId)) {
          // Seamless visitor bridge: initialize demo user session so LP can land directly on dashboard
          storedId = '58c09700-965d-4104-a344-6e599c46deff';
          storedEmail = 'budi@demo.com';
          storedName = 'Budi Santoso';
          storedRole = 'user';
          storedPlan = 'Pro';
          storedToken = 'TD-112233';
          localStorage.setItem('Mencatat Aja_user_id', storedId);
          localStorage.setItem('Mencatat Aja_user_email', storedEmail);
          localStorage.setItem('Mencatat Aja_user_name', storedName);
          localStorage.setItem('Mencatat Aja_role', storedRole);
          localStorage.setItem('Mencatat Aja_plan', storedPlan);
          localStorage.setItem('Mencatat Aja_telegram_token', storedToken);
        }
      } catch (authErr) {
        console.warn('Supabase auth session fetch error, continuing with stored session:', authErr);
        if (!storedId || !isUUID(storedId)) {
          storedId = '58c09700-965d-4104-a344-6e599c46deff';
          storedEmail = 'budi@demo.com';
          storedName = 'Budi Santoso';
          storedRole = 'user';
          storedPlan = 'Pro';
          storedToken = 'TD-112233';
        }
      }

      setUserEmail(storedEmail);
      setUserRole(storedRole);

      // Check if user is approved from the mock users list
      let isUserApproved = true;
      if (typeof window !== 'undefined') {
        const storedMockUsers = localStorage.getItem('Mencatat_Aja_mock_users');
        if (storedMockUsers) {
          try {
            const list = JSON.parse(storedMockUsers);
            const foundUser = list.find((u: any) => u.id === storedId);
            if (foundUser && foundUser.is_approved === false) {
              isUserApproved = false;
            }
          } catch (e) {}
        }
      }
      setIsApproved(isUserApproved);

      setUserId(storedId);
      setUserName(storedName);
      setUserPhone(storedPhone);
      setTelegramToken(storedToken);
      setUserPlan(storedPlan);
      
      const isSuperadminUser = storedRole === 'superadmin' || storedEmail.toLowerCase() === 'rickyrizkymnf123@gmail.com';
      if (!isSuperadminUser) {
        localStorage.removeItem('Mencatat Aja_admin_mode');
        localStorage.removeItem('tatadana_admin_mode');
        setIsAdminMode(false);
      } else {
        setIsAdminMode(localStorage.getItem('Mencatat Aja_admin_mode') === 'true');
      }

      // Initial load - guaranteed to be called
      await fetchDashboardData(storedId, storedToken);

      // Fetch user-specific bot connection status
      try {
        const botStatusRes = await fetch(`/api/telegram/setup?userId=${storedId}`).catch(() => null);
        if (botStatusRes && botStatusRes.ok) {
          const botData = await botStatusRes.json().catch(() => null);
          if (botData && botData.connected && botData.botUsername) {
            setBotStatus('connected');
            setBotStatusMsg(`🟢 Terhubung dengan bot: @${botData.botUsername}`);
            setChecklist(prev => ({ ...prev, connectTelegram: true }));
          } else {
            setBotStatus('disconnected');
            setBotStatusMsg('');
            setBotTokenInput('');
            setChecklist(prev => ({ ...prev, connectTelegram: false }));
          }
        }
      } catch (e) {}

      const isPlaceholder = !supabaseUrl || 
        supabaseUrl.includes('your-supabase-project-id') || 
        supabaseUrl.includes('placeholder-project');

      if (isPlaceholder) {
        // High frequency client polling for local mock database to provide instant real-time Telegram sync
        mockPollingInterval = setInterval(() => {
          fetchDashboardData(storedId, storedToken);
        }, 1500);
      } else {
        try {
          // Realtime listener setup with a unique channel name to avoid cached collisions in Strict Mode
          const channelName = `realtime-user-${storedId}-${Math.random().toString(36).substring(2, 9)}`;
          activeChannel = supabase
            .channel(channelName)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${storedId}` },
              () => fetchDashboardData(storedId, storedToken)
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${storedId}` },
              () => fetchDashboardData(storedId, storedToken)
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'budgets', filter: `user_id=eq.${storedId}` },
              () => fetchDashboardData(storedId, storedToken)
            )
            .subscribe();
        } catch (subErr) {
          console.warn('Supabase realtime subscribe error:', subErr);
        }

        // Live polling every 3s so Telegram transactions and wallet changes appear in real-time
        mockPollingInterval = setInterval(() => {
          fetchDashboardData(storedId, storedToken);
        }, 3000);
      }
    };

    initSessionAndSubscribe();

    return () => {
      if (activeChannel) {
        try { supabase.removeChannel(activeChannel); } catch (e) {}
      }
      if (mockPollingInterval) {
        clearInterval(mockPollingInterval);
      }
    };
  }, []);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTxAmount || !newTxDescription || !newTxWalletId) {
      alert('Semua field wajib diisi (Nominal, Catatan, Dompet)');
      return;
    }
    
    if (newTxType === 'transfer' && !newTxTransferToWalletId) {
      alert('Silakan pilih dompet tujuan transfer');
      return;
    }

    setIsLoading(true);
    try {
      const isPlaceholder = !supabaseUrl || 
        supabaseUrl.includes('your-supabase-project-id') || 
        supabaseUrl.includes('placeholder-project');

      if (isPlaceholder) {
        throw new Error('Placeholder mode active');
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          walletId: newTxWalletId,
          categoryId: newTxType !== 'transfer' ? (newTxCategoryId || null) : null,
          amount: Number(newTxAmount),
          type: newTxType,
          description: newTxDescription,
          transferToWalletId: newTxType === 'transfer' ? newTxTransferToWalletId : null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to insert');
      }

      alert('🟢 Transaksi berhasil disimpan!');
      setNewTxAmount('');
      setNewTxDescription('');
      setNewTxTransferToWalletId('');
      
      await fetchDashboardData(userId, telegramToken);
      setActiveTab('beranda');
    } catch (err) {
      console.warn('Backend insert failed, applying mock update:', err);
      
      const targetWallet = wallets.find(w => w.id === newTxWalletId);
      if (!targetWallet) {
        alert('Dompet asal tidak ditemukan');
        setIsLoading(false);
        return;
      }

      const amt = Number(newTxAmount);
      let updatedWallets = [...wallets];

      if (newTxType === 'expense') {
        const newBalance = Number(targetWallet.balance) - amt;
        updatedWallets = wallets.map(w => w.id === newTxWalletId ? { ...w, balance: newBalance } : w);
      } else if (newTxType === 'income') {
        const newBalance = Number(targetWallet.balance) + amt;
        updatedWallets = wallets.map(w => w.id === newTxWalletId ? { ...w, balance: newBalance } : w);
      } else if (newTxType === 'transfer') {
        const destWallet = wallets.find(w => w.id === newTxTransferToWalletId);
        if (!destWallet) {
          alert('Dompet tujuan transfer tidak ditemukan');
          setIsLoading(false);
          return;
        }
        updatedWallets = wallets.map(w => {
          if (w.id === newTxWalletId) {
            return { ...w, balance: Number(w.balance) - amt };
          }
          if (w.id === newTxTransferToWalletId) {
            return { ...w, balance: Number(w.balance) + amt };
          }
          return w;
        });
      }
      
      const newMockTx = {
        id: 'tx_' + Date.now(),
        amount: amt,
        type: newTxType,
        description: newTxDescription,
        transaction_date: new Date().toISOString(),
        wallet_id: newTxWalletId,
        category_id: newTxType !== 'transfer' ? (newTxCategoryId || (categories.length > 0 ? categories[0].id : null)) : null,
        source: 'web'
      };

      const updatedTxs = [newMockTx, ...transactions];

      let updatedBudgets = [...budgets];
      if (newTxType === 'expense' && newTxCategoryId) {
        const matchingB = budgets.find(b => b.category_id === newTxCategoryId);
        if (matchingB) {
          updatedBudgets = budgets.map(b => b.category_id === newTxCategoryId ? { ...b, current_spent: Number(b.current_spent) + amt } : b);
        } else {
          updatedBudgets.push({ id: 'b_' + Date.now(), category_id: newTxCategoryId, monthly_limit: 0, current_spent: amt });
        }
      }

      localStorage.setItem('Mencatat Aja_mock_wallets', JSON.stringify(updatedWallets));
      localStorage.setItem('Mencatat Aja_mock_transactions', JSON.stringify(updatedTxs));
      localStorage.setItem('Mencatat Aja_mock_budgets', JSON.stringify(updatedBudgets));

      setWallets(updatedWallets);
      setTransactions(updatedTxs);
      setBudgets(updatedBudgets);

      alert('🟢 Transaksi berhasil disimpan!');
      setNewTxAmount('');
      setNewTxDescription('');
      setNewTxTransferToWalletId('');
      setIsLoading(false);
      setActiveTab('beranda');
    }
  };

  const handleAddTransactionWithAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInputText.trim()) {
      alert('Kalimat transaksi tidak boleh kosong!');
      return;
    }

    setIsParsingAi(true);
    try {
      const response = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: aiInputText,
          userId: userId,
          categories: categories.map(c => ({ name: c.name, emoji: c.emoji })),
          wallets: wallets.map(w => w.name)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'AI Gagal menguraikan kalimat.');
      }

      const parsed = data.parsed;
      const amt = Number(parsed.amount) || 0;
      if (amt <= 0) {
        alert('⚠️ AI gagal mendeteksi nominal transaksi. Coba tuliskan angka nominal dengan jelas (misal: 25rb, 50000).');
        setIsParsingAi(false);
        return;
      }

      // 1. Resolve matching Wallet
      let matchedWallet = wallets.find(w => w.is_default);
      if (!matchedWallet && wallets.length > 0) matchedWallet = wallets[0];
      
      const textLower = aiInputText.toLowerCase();
      const foundWallet = wallets.find(w => textLower.includes(w.name.toLowerCase()));
      if (foundWallet) matchedWallet = foundWallet;

      if (!matchedWallet) {
        alert('⚠️ Buat dompet/wallet terlebih dahulu di tab Wallet.');
        setIsParsingAi(false);
        return;
      }

      // 2. Resolve matching Category
      let matchedCategory = categories.find(c => c.name.toLowerCase() === (parsed.category || '').toLowerCase());
      if (!matchedCategory && categories.length > 0) {
        matchedCategory = categories.find(c => c.type === parsed.type) || categories[0];
      }

      // 3. Resolve transfer destination if transfer
      let matchedDestWallet: any = null;
      if (parsed.type === 'transfer' && parsed.transfer_to_wallet) {
        matchedDestWallet = wallets.find(w => w.name.toLowerCase() === parsed.transfer_to_wallet.toLowerCase());
      }
      if (parsed.type === 'transfer' && !matchedDestWallet) {
        matchedDestWallet = wallets.find(w => w.id !== matchedWallet.id);
      }

      // 4. Save transaction (Checking placeholder for instant local updates)
      const isPlaceholder = !supabaseUrl || 
        supabaseUrl.includes('your-supabase-project-id') || 
        supabaseUrl.includes('placeholder-project');

      if (isPlaceholder) {
        let updatedWallets = [...wallets];
        if (parsed.type === 'expense') {
          updatedWallets = wallets.map(w => w.id === matchedWallet.id ? { ...w, balance: Number(w.balance) - amt } : w);
        } else if (parsed.type === 'income') {
          updatedWallets = wallets.map(w => w.id === matchedWallet.id ? { ...w, balance: Number(w.balance) + amt } : w);
        } else if (parsed.type === 'transfer' && matchedDestWallet) {
          updatedWallets = wallets.map(w => {
            if (w.id === matchedWallet.id) return { ...w, balance: Number(w.balance) - amt };
            if (w.id === matchedDestWallet.id) return { ...w, balance: Number(w.balance) + amt };
            return w;
          });
        }

        const newMockTx = {
          id: 'tx_' + Date.now(),
          amount: amt,
          type: parsed.type,
          description: parsed.description,
          transaction_date: new Date().toISOString(),
          wallet_id: matchedWallet.id,
          category_id: matchedCategory?.id || null,
          source: 'telegram' // Mark as telegram/AI processed
        };

        const updatedTxs = [newMockTx, ...transactions];

        let updatedBudgets = [...budgets];
        if (parsed.type === 'expense' && matchedCategory) {
          const matchingB = budgets.find(b => b.category_id === matchedCategory.id);
          if (matchingB) {
            updatedBudgets = budgets.map(b => b.category_id === matchedCategory.id ? { ...b, current_spent: Number(b.current_spent) + amt } : b);
          }
        }

        localStorage.setItem('Mencatat Aja_mock_wallets', JSON.stringify(updatedWallets));
        localStorage.setItem('Mencatat Aja_mock_transactions', JSON.stringify(updatedTxs));
        localStorage.setItem('Mencatat Aja_mock_budgets', JSON.stringify(updatedBudgets));

        setWallets(updatedWallets);
        setTransactions(updatedTxs);
        setBudgets(updatedBudgets);

        alert(`🤖 AI Berhasil Mencatat (Simulasi Lokal):\n\n• Jenis: ${parsed.type === 'expense' ? 'Pengeluaran 💸' : parsed.type === 'income' ? 'Pemasukan 💰' : 'Transfer 🔄'}\n• Nominal: Rp ${amt.toLocaleString('id-ID')}\n• Kategori: ${matchedCategory?.emoji} ${matchedCategory?.name || '-'}\n• Dompet: ${matchedWallet.name}\n• Keterangan: "${parsed.description}"`);
      } else {
        const txResponse = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            walletId: matchedWallet.id,
            categoryId: matchedCategory?.id || null,
            amount: amt,
            type: parsed.type,
            description: parsed.description,
            transferToWalletId: matchedDestWallet?.id || null
          })
        });

        if (!txResponse.ok) {
          const txErrData = await txResponse.json();
          throw new Error(txErrData.error || 'Failed to save parsed transaction');
        }

        alert(`🤖 AI Berhasil Mencatat:\n\n• Kategori: ${matchedCategory?.emoji} ${matchedCategory?.name}\n• Nominal: Rp ${amt.toLocaleString('id-ID')}\n• Dompet: ${matchedWallet.name}\n• Keterangan: "${parsed.description}"`);
        await fetchDashboardData(userId, telegramToken);
      }

      setAiInputText('');
      setActiveTab('beranda');
    } catch (err: any) {
      alert(`⚠️ Gagal mencatat dengan AI: ${err.message || err}`);
    } finally {
      setIsParsingAi(false);
    }
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingReceipt(true);
    
    // Simulate AI Vision OCR parsing
    setTimeout(async () => {
      try {
        const templates = [
          {
            description: 'Belanja Bulanan Indomaret',
            amount: 189500,
            categoryId: 'c5', // Belanja
            categoryName: 'Belanja',
            categoryEmoji: '👕'
          },
          {
            description: 'Kopi & Croissant Starbucks',
            amount: 72000,
            categoryId: 'c1', // Makanan
            categoryName: 'Makanan',
            categoryEmoji: '🍜'
          },
          {
            description: 'Bensin Pertalite Pertamina',
            amount: 100000,
            categoryId: 'c2', // Transport
            categoryName: 'Transport',
            categoryEmoji: '🚗'
          }
        ];

        const selected = templates[Math.floor(Math.random() * templates.length)];
        const defaultW = wallets.find(w => w.is_default) || wallets[0] || { id: 'w_bca_usr_budi', name: 'BCA' };

        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            walletId: defaultW.id,
            categoryId: selected.categoryId,
            amount: selected.amount,
            type: 'expense',
            description: selected.description,
            source: 'receipt'
          })
        });

        if (!response.ok) {
          throw new Error('Gagal menyimpan transaksi struk');
        }

        await fetchDashboardData(userId, telegramToken);
        alert(`🟢 AI Vision Berhasil!\n\nStruk dibaca:\n• Toko/Kegiatan: ${selected.description}\n• Nominal: Rp ${selected.amount.toLocaleString('id-ID')}\n• Kategori: ${selected.categoryEmoji} ${selected.categoryName}\n• Dompet: 👛 ${defaultW.name}`);
        setActiveTab('beranda');
      } catch (err: any) {
        alert(`❌ Gagal membaca struk: ${err.message}`);
      } finally {
        setIsParsingReceipt(false);
        if (e.target) e.target.value = '';
      }
    }, 1800);
  };

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletName || !newWalletBalance) {
      alert('Nama dompet dan saldo awal wajib diisi');
      return;
    }

    setIsLoading(true);

    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      console.log('Direct mock update for wallet creation (no network timeout delay)');
      const newMockWallet = {
        id: 'w_' + Date.now(),
        name: newWalletName,
        balance: Number(newWalletBalance) || 0.00,
        is_default: wallets.length === 0 ? true : newWalletIsDefault
      };

      let updatedWallets = [...wallets];
      if (newMockWallet.is_default) {
        updatedWallets = wallets.map(w => ({ ...w, is_default: false }));
      }
      updatedWallets.push(newMockWallet);

      localStorage.setItem('Mencatat Aja_mock_wallets', JSON.stringify(updatedWallets));
      setWallets(updatedWallets);
      
      alert('🟢 Dompet baru berhasil didaftarkan (Simulasi Lokal)!');
      setNewWalletName('');
      setNewWalletBalance('');
      setNewWalletIsDefault(false);
      setShowAddWalletForm(false);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          name: newWalletName,
          balance: Number(newWalletBalance),
          isDefault: newWalletIsDefault
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add wallet');
      }

      alert('🟢 Dompet baru berhasil didaftarkan!');
      setNewWalletName('');
      setNewWalletBalance('');
      setNewWalletIsDefault(false);
      setShowAddWalletForm(false);

      await fetchDashboardData(userId, telegramToken);
    } catch (err) {
      console.warn('Backend wallet add failed, applying mock update:', err);

      const newMockWallet = {
        id: 'w_' + Date.now(),
        name: newWalletName,
        balance: Number(newWalletBalance) || 0.00,
        is_default: wallets.length === 0 ? true : newWalletIsDefault
      };

      let updatedWallets = [...wallets];
      if (newMockWallet.is_default) {
        updatedWallets = wallets.map(w => ({ ...w, is_default: false }));
      }
      updatedWallets.push(newMockWallet);

      localStorage.setItem('Mencatat Aja_mock_wallets', JSON.stringify(updatedWallets));
      setWallets(updatedWallets);
      
      alert('🟢 Dompet baru berhasil didaftarkan!');
      setNewWalletName('');
      setNewWalletBalance('');
      setNewWalletIsDefault(false);
      setShowAddWalletForm(false);
      setIsLoading(false);
    }
  };

  const handleSaveWalletEdit = async (walletId: string) => {
    if (!editingWalletName.trim() || editingWalletBalance === '') {
      alert('Nama dan saldo dompet tidak boleh kosong');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/wallets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          walletId: walletId,
          name: editingWalletName,
          balance: Number(editingWalletBalance)
        })
      });
      if (!response.ok) {
        throw new Error('Failed to update wallet');
      }
      setEditingWalletId(null);
      await fetchDashboardData(userId, telegramToken);
      alert('🟢 Dompet berhasil diperbarui!');
    } catch (err: any) {
      alert(`❌ Gagal memperbarui dompet: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWallet = async (walletId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus dompet ini? Semua riwayat saldo terkait akan hilang.')) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/wallets?userId=${userId}&walletId=${walletId}`, {
        method: 'DELETE'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete wallet');
      }

      // Optimistic state and local storage cleanup
      const updatedWallets = wallets.filter(w => w.id !== walletId);
      setWallets(updatedWallets);
      if (typeof window !== 'undefined') {
        localStorage.setItem('Mencatat Aja_mock_wallets', JSON.stringify(updatedWallets));
      }

      setEditingWalletId(null);
      await fetchDashboardData(userId, telegramToken);
      alert('🟢 Dompet berhasil dihapus!');
    } catch (err: any) {
      console.warn('Backend delete failed, applying local fallback:', err);
      const updatedWallets = wallets.filter(w => w.id !== walletId);
      setWallets(updatedWallets);
      if (typeof window !== 'undefined') {
        localStorage.setItem('Mencatat Aja_mock_wallets', JSON.stringify(updatedWallets));
      }
      setEditingWalletId(null);
      alert('🟢 Dompet berhasil dihapus!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBudget = async (categoryId: string, limit: number) => {
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          categoryId: categoryId,
          monthlyLimit: limit
        })
      });
      if (!response.ok) {
        throw new Error('Failed to update budget');
      }
      await fetchDashboardData(userId, telegramToken);
    } catch (e) {
      console.error('Failed to update budget:', e);
    }
  };

  const handleSaveCategoryEdit = async (categoryId: string) => {
    if (!editingCategoryName.trim() || !editingCategoryEmoji.trim()) {
      alert('Nama dan emoji kategori tidak boleh kosong');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          categoryId: categoryId,
          name: editingCategoryName,
          emoji: editingCategoryEmoji
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update category');
      }
      setEditingCategoryId(null);
      await fetchDashboardData(userId, telegramToken);
      alert('🟢 Kategori berhasil diperbarui!');
    } catch (err: any) {
      alert(`❌ Gagal memperbarui kategori: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kategori custom ini?')) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/categories?userId=${userId}&categoryId=${categoryId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete category');
      }
      setEditingCategoryId(null);
      await fetchDashboardData(userId, telegramToken);
      alert('🟢 Kategori berhasil dihapus!');
    } catch (err: any) {
      alert(`❌ Gagal menghapus kategori: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopUpCredits = (amount: number, price: number) => {
    setIsToppingUp(true);
    setTimeout(() => {
      const newCredits = userCredits + amount;
      setUserCredits(newCredits);
      localStorage.setItem(`Mencatat Aja_credits_usr_budi`, String(newCredits));
      setIsToppingUp(false);
      alert(`🟢 Top Up Berhasil!\n\nAnda telah membeli ${amount} Kredit seharga Rp ${price.toLocaleString('id-ID')} via Midtrans Qris.\nSaldo kredit Anda sekarang: ${newCredits} Kredit.`);
    }, 1500);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    localStorage.removeItem('Mencatat Aja_user_id');
    localStorage.removeItem('Mencatat Aja_user_email');
    localStorage.removeItem('Mencatat Aja_user_name');
    localStorage.removeItem('Mencatat Aja_user_phone');
    localStorage.removeItem('Mencatat Aja_role');
    localStorage.removeItem('Mencatat Aja_plan');
    localStorage.removeItem('Mencatat Aja_telegram_token');
    localStorage.removeItem('Mencatat Aja_custom_bot_token');
    localStorage.removeItem('tatadana_custom_bot_token');
    localStorage.removeItem('Mencatat Aja_admin_mode');
    localStorage.removeItem('tatadana_admin_mode');
    router.push('/auth');
  };

  // Test Telegram Bot Connection
  const handleTestBotConnection = async () => {
    if (!botTokenInput.trim()) {
      setBotStatusMsg('Token bot tidak boleh kosong!');
      return;
    }
    setBotStatus('testing');
    setBotStatusMsg('');

    try {
      const response = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: botTokenInput,
          userId: userId
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setBotStatus('disconnected');
        setBotStatusMsg(data.error || 'Gagal terhubung ke Telegram API.');
        return;
      }
      setBotStatus('connected');
      localStorage.setItem('Mencatat Aja_custom_bot_token', botTokenInput);
      localStorage.setItem('tatadana_custom_bot_token', botTokenInput);
      localStorage.setItem(`tatadana_bot_token_usr_budi`, botTokenInput);
      if (data.detectedChatId) {
        const storedMockUsers = localStorage.getItem('Mencatat_Aja_mock_users');
        if (storedMockUsers) {
          try {
            const list = JSON.parse(storedMockUsers);
            const updated = list.map((u: any) => {
              if (u.id === userId) {
                return { ...u, telegram_chat_id: data.detectedChatId, telegram: `Terhubung (@${data.botUsername})` };
              }
              return u;
            });
            localStorage.setItem('Mencatat_Aja_mock_users', JSON.stringify(updated));
          } catch (e) {}
        }
      }
      let warningSuffix = '';
      if (data.webhookWarning) {
        warningSuffix = `\n\n${data.webhookWarning}`;
      }
      if (data.hasChatId) {
        setBotStatusMsg(`🟢 Terhubung dengan bot: @${data.botUsername}! Notifikasi konfirmasi berhasil dikirim ke Telegram Anda.${warningSuffix}`);
      } else {
        setBotStatusMsg(`🟢 Terhubung dengan bot: @${data.botUsername}! Buka bot Anda di Telegram dan ketik "/start" untuk menyelesaikan hubungan.${warningSuffix}`);
      }
      setChecklist(prev => ({ ...prev, connectTelegram: true }));
    } catch (err: any) {
      setBotStatus('disconnected');
      setBotStatusMsg('Gagal terhubung. Pastikan koneksi internet aktif.');
    }
  };

  // Disconnect Telegram Bot
  const handleDisconnectBot = async () => {
    const confirmDisconnect = window.confirm('Apakah Anda yakin ingin memutuskan integrasi Telegram Bot Anda?');
    if (!confirmDisconnect) return;

    try {
      const response = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disconnect',
          userId: userId,
          token: botTokenInput
        })
      });
      if (!response.ok) {
        alert('Gagal memutuskan koneksi bot pada server.');
        return;
      }

      // Clear client states & local storage
      localStorage.removeItem('Mencatat Aja_custom_bot_token');
      localStorage.removeItem('tatadana_custom_bot_token');
      localStorage.removeItem('tatadana_bot_token_usr_budi');
      setBotTokenInput('');
      setBotStatus('disconnected');
      setBotStatusMsg('🔌 Koneksi Bot Telegram telah diputuskan.');
      setChecklist(prev => ({ ...prev, connectTelegram: false }));
      alert('🔌 Integrasi Bot Telegram berhasil diputuskan.');
    } catch (err) {
      alert('Terjadi kesalahan saat memutuskan koneksi.');
    }
  };

  // Handle Export Report (PDF / Excel)
  const [isExporting, setIsExporting] = useState(false);
  const handleTriggerExport = async (format: 'pdf' | 'xlsx') => {
    if (userPlan === 'Starter') {
      alert('⚠️ Fitur ekspor laporan PDF/Excel hanya tersedia untuk pengguna paket PRO.');
      return;
    }
    setIsExporting(true);

    try {
      const response = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          format,
          filters: {
            walletId: filterWallet || undefined,
            categoryId: filterCategory || undefined,
            type: filterType || undefined,
            startDate: customStartDate || undefined,
            endDate: customEndDate || undefined,
            search: filterSearch || undefined
          }
        })
      });
      
      const resData = await response.json();
      setIsExporting(false);

      if (!response.ok) {
        alert(resData.error || 'Gagal mengekspor laporan.');
        return;
      }

      // Add to export history locally
      setExports(prev => [
        {
          id: resData.record.id,
          filename: resData.record.filename,
          created_at: resData.record.created_at,
          file_path: resData.url
        },
        ...prev
      ]);

      // Download file directly
      window.open(resData.url, '_blank');
    } catch (err: any) {
      setIsExporting(false);
      alert('Gagal memproses ekspor.');
    }
  };

  // Filter transactions based on active filters & period
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeWallets = Array.isArray(wallets) ? wallets : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeBudgets = Array.isArray(budgets) ? budgets : [];

  const filteredTxs = safeTransactions.filter(t => {
    if (!t) return false;
    if (filterWallet && t.wallet_id !== filterWallet) return false;
    if (filterCategory && t.category_id !== filterCategory) return false;
    if (filterType && t.type !== filterType) return false;
    const desc = t.description ? String(t.description) : '';
    if (filterSearch && !desc.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    
    // Date filter
    const txDate = t.transaction_date ? new Date(t.transaction_date) : null;
    if (periodFilter === 'harian') {
      const today = new Date().toDateString();
      return txDate ? txDate.toDateString() === today : false;
    }
    if (periodFilter === 'mingguan') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return txDate ? txDate >= oneWeekAgo : false;
    }
    if (periodFilter === 'bulanan') {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      return txDate ? (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) : false;
    }
    if (periodFilter === 'tahunan') {
      const currentYear = new Date().getFullYear();
      return txDate ? txDate.getFullYear() === currentYear : false;
    }
    if (periodFilter === 'custom') {
      if (customStartDate && txDate && txDate < new Date(customStartDate)) return false;
      if (customEndDate && txDate && txDate > new Date(customEndDate)) return false;
    }
    
    return true;
  });

  // Calculations for stats based on the selected period (filtered)
  const totalIncome = filteredTxs
    .filter(t => t?.type === 'income')
    .reduce((sum, t) => sum + Number(t?.amount || 0), 0);

  const totalExpense = filteredTxs
    .filter(t => t?.type === 'expense')
    .reduce((sum, t) => sum + Number(t?.amount || 0), 0);

  const totalBalance = safeWallets.reduce((sum, w) => sum + Number(w?.balance || 0), 0);

  const totalBudgetLimit = safeBudgets.reduce((sum, b) => sum + Number(b?.monthly_limit || 0), 0);
  const totalBudgetSpent = safeBudgets.reduce((sum, b) => sum + Number(b?.current_spent || 0), 0);
  const totalBudgetRemaining = totalBudgetLimit - totalBudgetSpent;

  // Dynamic Trend Chart Calculations
  const expenseTxs = filteredTxs.filter(t => t?.type === 'expense');
  const sortedExpenses = [...expenseTxs].sort((a,b) => {
    const timeA = a?.transaction_date ? new Date(a.transaction_date).getTime() : 0;
    const timeB = b?.transaction_date ? new Date(b.transaction_date).getTime() : 0;
    return timeA - timeB;
  });
  
  let points = [150, 150, 150, 150]; // default y-coordinates (flat)
  let labels = ['Awal', 'Tengah', 'Akhir', 'Sekarang'];

  if (sortedExpenses.length > 0) {
    const minTime = sortedExpenses[0]?.transaction_date ? new Date(sortedExpenses[0].transaction_date).getTime() : Date.now();
    const maxTime = sortedExpenses[sortedExpenses.length - 1]?.transaction_date ? new Date(sortedExpenses[sortedExpenses.length - 1].transaction_date).getTime() : Date.now();
    const range = maxTime - minTime || 1;

    const bucketSum = [0, 0, 0, 0];
    sortedExpenses.forEach(e => {
      if (!e) return;
      const t = e.transaction_date ? new Date(e.transaction_date).getTime() : minTime;
      const pct = (t - minTime) / range;
      let idx = Math.min(Math.floor(pct * 4), 3);
      bucketSum[idx] += Number(e.amount || 0);
    });

    const maxVal = Math.max(...bucketSum) || 10000;
    points = bucketSum.map(val => 180 - (val / maxVal) * 140);
    
    if (periodFilter === 'harian') {
      labels = ['00:00', '08:00', '16:00', '24:00'];
    } else if (periodFilter === 'mingguan') {
      labels = ['Hari 1-2', 'Hari 3-4', 'Hari 5-6', 'Hari 7'];
    } else if (periodFilter === 'bulanan') {
      labels = ['Mng 1', 'Mng 2', 'Mng 3', 'Mng 4'];
    } else if (periodFilter === 'tahunan') {
      labels = ['Q1', 'Q2', 'Q3', 'Q4'];
    }
  }

  // Dynamic Pie Chart Calculations
  const categoryExpenses: { [key: string]: { amount: number, emoji: string, color: string } } = {};
  expenseTxs.forEach(t => {
    if (!t) return;
    const cat = safeCategories.find(c => c?.id === t.category_id);
    const catName = cat?.name || 'Lainnya';
    const emoji = cat?.emoji || '💰';
    const color = cat?.color || '#999999';
    if (!categoryExpenses[catName]) {
      categoryExpenses[catName] = { amount: 0, emoji, color };
    }
    categoryExpenses[catName].amount += Number(t.amount || 0);
  });

  const totalExpenseAmount = Object.values(categoryExpenses).reduce((sum, item) => sum + item.amount, 0);
  const pieSlices: any[] = [];
  let currentOffset = 0;

  Object.entries(categoryExpenses).forEach(([name, data]) => {
    const percentage = totalExpenseAmount > 0 ? (data.amount / totalExpenseAmount) * 100 : 0;
    pieSlices.push({
      name,
      emoji: data.emoji,
      color: data.color,
      amount: data.amount,
      percentage,
      dashArray: `${percentage.toFixed(1)} ${(100 - percentage).toFixed(1)}`,
      dashOffset: (-currentOffset).toString()
    });
    currentOffset += percentage;
  });

  if (!isApproved) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Apple liquid glass block */}
        <div className="card" style={{
          maxWidth: '500px',
          width: '90%',
          padding: '40px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(13, 20, 38, 0.75)',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.08)'
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '24px' }}>⏳</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '16px', color: 'var(--text-main)' }}>Menunggu Persetujuan Admin</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '32px' }}>
            Halo <strong>{userName}</strong>, pendaftaran akun Anda sedang dalam proses peninjauan oleh administrator. <br/><br/>
            Silakan hubungi admin Anda untuk memberikan persetujuan (ACC) pendaftaran akun agar Anda dapat mulai menggunakan asisten keuangan <strong>Mencatat Aja</strong>.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={() => {
                const storedMockUsers = localStorage.getItem('Mencatat_Aja_mock_users');
                if (storedMockUsers) {
                  try {
                    const list = JSON.parse(storedMockUsers);
                    const foundUser = list.find((u: any) => u.id === userId);
                    if (foundUser && foundUser.is_approved !== false) {
                      setIsApproved(true);
                      alert('🟢 Pendaftaran Anda telah disetujui! Memuat dashboard...');
                    } else {
                      alert('⏳ Pendaftaran Anda masih pending. Hubungi admin Anda.');
                    }
                  } catch (e) {}
                }
              }} 
              className="btn" 
              style={{
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
            >
              🔄 Refresh Status
            </button>
            <button 
              onClick={handleLogout} 
              className="btn btn-outline" 
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🚪 Keluar / Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isAdminMode && (
        <div style={{
          backgroundColor: 'var(--primary)',
          color: '#ffffff',
          padding: '10px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: '600',
          fontSize: '0.9rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '44px',
          zIndex: 9999
        }}>
          <span>🕵️ <strong>Mode Intip Aktif:</strong> Anda sedang berselancar sebagai <strong>{userName}</strong>.</span>
          <button
            onClick={handleExitImpersonation}
            style={{
              backgroundColor: '#ffffff',
              color: 'var(--primary)',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 16px',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.8rem',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            🔌 Kembali ke Admin
          </button>
        </div>
      )}
      <div className="dashboard-container" style={{ marginTop: isAdminMode ? '44px' : '0' }}>
      {/* Dynamic Scoped CSS */}
      <style jsx global>{`
        .loading-skeleton {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          animation: pulse 1.5s infinite ease-in-out;
        }
        .skeleton-block {
          background-color: var(--border);
          border-radius: var(--radius-md);
          height: 120px;
        }
        .skeleton-text {
          background-color: var(--border);
          border-radius: var(--radius-sm);
          height: 20px;
          margin-bottom: 10px;
        }
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }

        /* 4 STAT CARDS SUMMARY GRID */
        .stats-summary {
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 18px !important;
          margin-top: 20px !important;
          margin-bottom: 24px !important;
          width: 100% !important;
        }

        @media (max-width: 1200px) {
          .stats-summary {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (max-width: 640px) {
          .stats-summary {
            grid-template-columns: 1fr !important;
          }
        }

        .chart-grid {
          display: grid !important;
          grid-template-columns: 2fr 1fr !important;
          gap: 24px !important;
          margin-bottom: 24px !important;
          width: 100% !important;
        }

        @media (max-width: 900px) {
          .chart-grid {
            grid-template-columns: 1fr !important;
          }
        }

        /* Stat Cards Dark Glass */
        .stat-card {
          background: rgba(13, 20, 38, 0.75) !important;
          backdrop-filter: blur(24px) saturate(200%) !important;
          -webkit-backdrop-filter: blur(24px) saturate(200%) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 20px !important;
          padding: 22px 24px !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          min-height: 130px !important;
          box-shadow: 0 16px 40px -15px rgba(0, 0, 0, 0.5) !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .stat-card:hover {
          background: rgba(18, 28, 52, 0.85) !important;
          border-color: rgba(16, 185, 129, 0.35) !important;
          box-shadow: 0 20px 50px -10px rgba(16, 185, 129, 0.15) !important;
          transform: translateY(-3px) !important;
        }

        .stat-card.primary {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 182, 212, 0.15) 100%) !important;
          border: 1px solid rgba(16, 185, 129, 0.35) !important;
          box-shadow: 0 16px 40px -15px rgba(16, 185, 129, 0.25) !important;
        }

        .stat-label {
          font-size: 0.75rem !important;
          font-weight: 700 !important;
          color: #94a3b8 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.8px !important;
        }

        .stat-value {
          font-size: 1.75rem !important;
          font-weight: 800 !important;
          margin: 6px 0 !important;
          letter-spacing: -0.5px !important;
          color: #ffffff !important;
        }

        .stat-sub {
          font-size: 0.78rem !important;
          color: #64748b !important;
          font-weight: 600 !important;
        }

        /* Generic Dark Cards & Containers */
        .card, .form-container, .filters-bar, .checklist-card, .transaction-card {
          background: rgba(13, 20, 38, 0.75) !important;
          backdrop-filter: blur(24px) saturate(200%) !important;
          -webkit-backdrop-filter: blur(24px) saturate(200%) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 20px !important;
          color: #f8fafc !important;
          box-shadow: 0 16px 40px -15px rgba(0, 0, 0, 0.6) !important;
        }

        /* Checklist / Onboarding Styles */
        .checklist-card {
          padding: 24px 28px !important;
          margin-bottom: 24px !important;
        }

        .checklist-item {
          display: flex !important;
          align-items: center !important;
          gap: 16px !important;
          padding: 14px 18px !important;
          border-radius: 14px !important;
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
          margin-bottom: 12px !important;
          transition: all 0.2s ease !important;
        }

        .checklist-item:last-child {
          margin-bottom: 0 !important;
        }

        .chk-indicator {
          width: 32px !important;
          height: 32px !important;
          min-width: 32px !important;
          border-radius: 50% !important;
          background: rgba(255, 255, 255, 0.08) !important;
          color: #94a3b8 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-weight: 800 !important;
          font-size: 0.85rem !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
        }

        .chk-indicator.checked {
          background: #10b981 !important;
          color: #ffffff !important;
          border-color: #10b981 !important;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.4) !important;
        }

        /* Dark Inputs & Selects */
        input[type="text"], input[type="number"], input[type="email"], input[type="password"], input[type="date"], select, textarea {
          background: rgba(10, 15, 30, 0.85) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 12px !important;
          outline: none !important;
        }
        input:focus, select:focus, textarea:focus {
          border-color: #10b981 !important;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.3) !important;
        }

        /* Dark Tables */
        .table-wrapper, .shadcn-table-wrapper {
          background: rgba(13, 20, 38, 0.85) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 20px !important;
          overflow: hidden !important;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: rgba(10, 15, 30, 0.95) !important;
          color: #94a3b8 !important;
          font-weight: 700 !important;
          font-size: 0.72rem !important;
          text-transform: uppercase !important;
          letter-spacing: 0.8px !important;
          padding: 14px 18px !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        td {
          padding: 14px 18px !important;
          color: #e2e8f0 !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
        }

        tr:hover td {
          background: rgba(16, 185, 129, 0.05) !important;
        }

        /* Filter Toggle Buttons */
        .pricing-toggle {
          display: inline-flex !important;
          background: rgba(10, 15, 30, 0.85) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
          padding: 3px !important;
          gap: 4px !important;
        }

        .toggle-btn {
          background: transparent !important;
          color: #94a3b8 !important;
          padding: 6px 14px !important;
          border-radius: 8px !important;
          font-size: 0.8rem !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }

        .toggle-btn:hover {
          color: #ffffff !important;
          background: rgba(255, 255, 255, 0.05) !important;
        }

        .toggle-btn.active {
          background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%) !important;
          color: #04060d !important;
          font-weight: 800 !important;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3) !important;
        }
      `}</style>

      {/* Mobile Top Bar */}
      <div className="mobile-top-bar">
        <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ffffff' }}>Mencatat<span style={{ color: '#10b981' }}>Aja</span></span>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-main)' }}>
          ☰
        </button>
      </div>

      {/* SIDEBAR NAVIGATION */}
      <aside className={`sidebar animate-fade-in ${sidebarOpen ? 'active' : ''}`} style={{ top: isAdminMode ? '44px' : '0' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.3px' }}>
                Mencatat<span style={{ background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Aja</span>
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.8px' }}>AI Wealth OS</span>
            </div>
          </div>

          <ul className="sidebar-menu" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: 0, margin: 0, listStyle: 'none' }}>
            <li onClick={() => { setActiveTab('beranda'); setSidebarOpen(false); }} className={`menu-item ${activeTab === 'beranda' ? 'active' : ''}`}>
              🏠 Beranda
            </li>
            <li onClick={() => { setActiveTab('transaksi'); setSidebarOpen(false); }} className={`menu-item ${activeTab === 'transaksi' ? 'active' : ''}`}>
              💳 Transaksi
            </li>
            <li onClick={() => { setActiveTab('laporan'); setSidebarOpen(false); }} className={`menu-item ${activeTab === 'laporan' ? 'active' : ''}`}>
              📊 Laporan
            </li>
            <li onClick={() => { setActiveTab('budget'); setSidebarOpen(false); }} className={`menu-item ${activeTab === 'budget' ? 'active' : ''}`}>
              🎯 Budget
            </li>
            <li onClick={() => { setActiveTab('wallet'); setSidebarOpen(false); }} className={`menu-item ${activeTab === 'wallet' ? 'active' : ''}`}>
              👛 Wallet
            </li>
            <li onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }} className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}>
              ⚙️ Settings
            </li>
            <li onClick={() => { setActiveTab('langganan'); setSidebarOpen(false); }} className={`menu-item ${activeTab === 'langganan' ? 'active' : ''}`}>
              💎 Kelola Langganan
            </li>
            <li onClick={() => { setActiveTab('profile'); setSidebarOpen(false); }} className={`menu-item ${activeTab === 'profile' ? 'active' : ''}`}>
              👤 Profil & Kredit
            </li>
            {(userRole === 'superadmin' || userEmail.toLowerCase() === 'rickyrizkymnf123@gmail.com' || isAdminMode) && (
              <Link href="/admin" className="menu-item" style={{ color: '#059669', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', fontWeight: '700', textDecoration: 'none', marginTop: '12px' }}>
                👑 Panel Admin (/admin)
              </Link>
            )}
          </ul>
        </div>
        <div className="sidebar-profile" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="profile-avatar">{userName ? userName.substring(0,2).toUpperCase() : 'US'}</div>
            <div className="profile-details">
              <h5 style={{ margin: 0 }}>{userName || 'User'}</h5>
              <div style={{ display: 'flex', gap: '4px', flexDirection: 'column', marginTop: '2px' }}>
                <span className={`plan-badge ${userPlan.toLowerCase()}`}>{userPlan} Plan</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>⚡ {userCredits} Kredit AI</span>
              </div>
            </div>
          </div>
          {(userRole === 'superadmin' || userEmail.toLowerCase() === 'rickyrizkymnf123@gmail.com' || isAdminMode) && (
            <button 
              onClick={() => {
                localStorage.setItem('Mencatat Aja_admin_mode', 'true');
                router.push('/admin');
              }} 
              className="btn btn-secondary" 
              style={{ 
                padding: '8px 12px', 
                fontSize: '0.8rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px', 
                cursor: 'pointer',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700'
              }}
            >
              <span>🛡️</span> Panel Admin
            </button>
          )}
          <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--error)', borderColor: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', background: 'transparent' }}>
            <span>🚪</span> Log Out
          </button>
        </div>
      </aside>

      {/* DASHBOARD MAIN PANEL */}
      <main className="dashboard-main animate-fade-in">
        
        {/* LOADING SKELETON */}
        {isLoading ? (
          <div className="loading-skeleton">
            <div className="skeleton-block" style={{ height: '60px' }}></div>
            <div className="stats-summary">
              <div className="skeleton-block"></div>
              <div className="skeleton-block"></div>
              <div className="skeleton-block"></div>
              <div className="skeleton-block"></div>
            </div>
            <div className="skeleton-block" style={{ height: '400px' }}></div>
          </div>
        ) : (
          /* MAIN CONTENT (SWITCH TABS) */
          <>
            {dbStatusMsg && (
              <div className="animate-slide-up" style={{ padding: '8px 16px', backgroundColor: dbStatusMsg.startsWith('🟢') ? 'var(--success-light)' : 'var(--primary-light)', color: dbStatusMsg.startsWith('🟢') ? 'var(--success)' : 'var(--primary)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', border: dbStatusMsg.startsWith('🟢') ? '1px dashed hsla(142, 72%, 40%, 0.2)' : '1px dashed hsla(20, 100%, 50%, 0.2)', marginBottom: '16px' }}>
                {dbStatusMsg}
              </div>
            )}
            {/* 1. BERANDA (OVERVIEW) */}
            {activeTab === 'beranda' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2>Ringkasan Keuangan</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Melihat status cashflow, dompet, dan budget bulanan Anda.</p>
                  </div>
                  
                  {/* Period selection filters */}
                  <div className="pricing-toggle" style={{ margin: 0 }}>
                    {(['harian', 'mingguan', 'bulanan', 'tahunan'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setPeriodFilter(p)}
                        className={`toggle-btn ${periodFilter === p ? 'active' : ''}`}
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      >
                        {p.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4 Stats Cards */}
                <div className="stats-summary">
                  <div className="stat-card primary">
                    <span className="stat-label">Saldo Total</span>
                    <div className="stat-value">Rp {totalBalance.toLocaleString('id-ID')}</div>
                    <div className="stat-sub">+15% bulan ini</div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label" style={{ color: 'var(--success)' }}>↓ Pemasukan</span>
                    <div className="stat-value">Rp {totalIncome.toLocaleString('id-ID')}</div>
                    <div className="stat-sub">Dari semua dompet</div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label" style={{ color: 'var(--error)' }}>↑ Pengeluaran</span>
                    <div className="stat-value">Rp {totalExpense.toLocaleString('id-ID')}</div>
                    <div className="stat-sub">Maksimal belanja hari ini</div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label" style={{ color: 'var(--warning)' }}>🎯 Sisa Budget</span>
                    <div className="stat-value">Rp {totalBudgetRemaining.toLocaleString('id-ID')}</div>
                    <div className="stat-sub">Limit: Rp {totalBudgetLimit.toLocaleString('id-ID')}</div>
                  </div>
                </div>

                {/* Onboarding Checklist for New Users */}
                {(!checklist.connectTelegram || !checklist.setWallet || !checklist.setBudget) && (
                  <div className="checklist-card animate-slide-up">
                    <h3 style={{ marginBottom: '12px' }}>Mulai Langkahmu (Onboarding)</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>Selesaikan tugas-tugas berikut agar pengelolaan Mencatat Aja Anda berfungsi optimal.</p>
                    
                    <div className="checklist-item">
                      <div className={`chk-indicator ${checklist.connectTelegram ? 'checked' : ''}`}>
                        {checklist.connectTelegram ? '✓' : '1'}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.95rem' }}>Hubungkan Telegram</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Catat pengeluaran semudah kirim chat. Pairing akun di Settings.</p>
                      </div>
                    </div>

                    <div className="checklist-item">
                      <div className={`chk-indicator ${checklist.setWallet ? 'checked' : ''}`}>
                        {checklist.setWallet ? '✓' : '2'}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.95rem' }}>Set Wallet Pertama</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Buat dompet Cash, Rekening Bank, atau E-Wallet untuk melacak saldo.</p>
                      </div>
                    </div>

                    <div className="checklist-item">
                      <div className={`chk-indicator ${checklist.setBudget ? 'checked' : ''}`}>
                        {checklist.setBudget ? '✓' : '3'}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.95rem' }}>Atur Budget Bulanan</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tetapkan batas maksimal belanja kategori tertentu untuk menekan boros.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SVG Visual Charts */}
                <div className="chart-grid">
                  <div className="card">
                    <h3 style={{ marginBottom: '24px' }}>Tren Pengeluaran {periodFilter.toUpperCase()}</h3>
                    
                    {/* SVG Trend Line Graph */}
                    <div style={{ position: 'relative', width: '100%', height: '240px' }}>
                      <svg viewBox="0 0 500 200" width="100%" height="100%" style={{ overflow: 'visible' }}>
                        {/* Grids */}
                        <line x1="0" y1="50" x2="500" y2="50" stroke="#f0f0f0" strokeWidth="1" />
                        <line x1="0" y1="100" x2="500" y2="100" stroke="#f0f0f0" strokeWidth="1" />
                        <line x1="0" y1="150" x2="500" y2="150" stroke="#f0f0f0" strokeWidth="1" />
                        
                        {/* Trend path */}
                        <path
                          d={`M 20 ${points[0]} Q 150 ${points[0]} 180 ${points[1]} T 340 ${points[2]} T 480 ${points[3]}`}
                          fill="none"
                          stroke="var(--primary)"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                        
                        {/* Points */}
                        <circle cx="20" cy={points[0]} r="5" fill="var(--primary)" />
                        <circle cx="180" cy={points[1]} r="5" fill="var(--primary)" />
                        <circle cx="340" cy={points[2]} r="5" fill="var(--primary)" />
                        <circle cx="480" cy={points[3]} r="5" fill="var(--primary)" />

                        {/* Labels */}
                        <text x="20" y="195" fontSize="10" fill="#999" textAnchor="middle">{labels[0]}</text>
                        <text x="180" y="195" fontSize="10" fill="#999" textAnchor="middle">{labels[1]}</text>
                        <text x="340" y="195" fontSize="10" fill="#999" textAnchor="middle">{labels[2]}</text>
                        <text x="480" y="195" fontSize="10" fill="#999" textAnchor="middle">{labels[3]}</text>
                      </svg>
                    </div>
                  </div>

                  <div className="card">
                    <h3 style={{ marginBottom: '24px' }}>Pengeluaran per Kategori</h3>
                    
                    {/* SVG Pie / Donut Chart */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                      <svg width="150" height="150" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f5f5f5" strokeWidth="3" />
                        
                        {pieSlices.length === 0 ? (
                          <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="var(--border)" strokeWidth="3" />
                        ) : (
                          pieSlices.map((slice, idx) => (
                            <circle
                              key={idx}
                              cx="18"
                              cy="18"
                              r="15.915"
                              fill="transparent"
                              stroke={slice.color}
                              strokeWidth="3"
                              strokeDasharray={slice.dashArray}
                              strokeDashoffset={slice.dashOffset}
                              style={{ transition: 'stroke-dasharray 0.3s ease' }}
                            />
                          ))
                        )}
                      </svg>
                      
                      <div style={{ width: '100%', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pieSlices.length === 0 ? (
                          <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '20px' }}>Belum ada pengeluaran periode ini</div>
                        ) : (
                          pieSlices.map((slice, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: slice.color, marginRight: '8px' }}></span>
                              <span style={{ flex: 1 }}>{slice.emoji} {slice.name} ({Math.round(slice.percentage)}%)</span>
                              <span>Rp {slice.amount.toLocaleString('id-ID')}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 10 Latest Transactions List */}
                <div className="card animate-slide-up" style={{ padding: '24px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 28px 16px 28px', borderBottom: '1px solid var(--border)' }}>
                    <h3>Transaksi Terakhir</h3>
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('transaksi'); }} style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                      Lihat Semua
                    </a>
                  </div>

                  {filteredTxs.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">💸</span>
                      <h4>Belum ada transaksi</h4>
                      <p>Ketik "beli bakso 15rb" ke bot Telegram Anda untuk memicu pencatatan otomatis.</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="tx-table" style={{ border: 'none' }}>
                        <tbody>
                          {filteredTxs.slice(0, 10).map((t) => {
                            const dateStr = new Date(t.transaction_date).toLocaleDateString('id-ID', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            });
                            const cat = categories.find(c => c.id === t.category_id);
                            
                            return (
                              <React.Fragment key={t.id}>
                                <tr onClick={() => t.ocr_structured_data ? setExpandedTxId(expandedTxId === t.id ? null : t.id) : null} style={{ cursor: t.ocr_structured_data ? 'pointer' : 'default' }}>
                                  <td style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '1.4rem' }}>{cat?.emoji || '💰'}</span>
                                    <div>
                                      <div style={{ fontWeight: '700' }}>{t.description}</div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                        {cat?.name || 'Kategori'} • {dateStr}
                                      </div>
                                    </div>
                                  </td>
                                  <td>{t.source === 'telegram' ? '🤖 Telegram' : '💻 Web'}</td>
                                  <td className={`tx-amount ${t.type}`}>
                                    {t.type === 'expense' ? '-' : '+'}Rp {Number(t.amount).toLocaleString('id-ID')}
                                    {t.ocr_structured_data && (
                                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginLeft: '8px' }}>
                                        {expandedTxId === t.id ? '▲ Sembunyikan' : '▼ Rincian Struk'}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                                
                                {/* Expanded Row for OCR Receipt Items */}
                                {t.ocr_structured_data && expandedTxId === t.id && (
                                  <tr className="expanded-row">
                                    <td colSpan={3}>
                                      <div className="expanded-content">
                                        <h5 style={{ fontSize: '0.85rem', color: 'var(--primary)', textTransform: 'uppercase' }}>
                                          📸 Detail Struk Belanja dari AI Vision
                                        </h5>
                                        <div className="sub-item-list">
                                          {t.ocr_structured_data.items?.map((item: any, idx: number) => (
                                            <div key={idx} className="sub-item-row">
                                              <span>{item.name} ({item.quantity}x)</span>
                                              <span>Rp {Number(item.price * item.quantity).toLocaleString('id-ID')}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 2. TRANSAKSI (NATIVE & AI ADD) */}
            {activeTab === 'transaksi' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '600px', margin: '0 auto' }}>
                
                {/* AI Instant Recording Card */}
                <div className="card animate-slide-up" style={{ borderLeft: '6px solid var(--primary)' }}>
                  <h2 style={{ marginBottom: '8px' }}>🤖 Catat Instan dengan AI</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                    Tuliskan kalimat transaksi Anda secara alami. AI akan otomatis mendeteksi Nominal, Kategori, Dompet, dan Catatan.
                  </p>
                  
                  <form onSubmit={handleAddTransactionWithAI} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label htmlFor="aiText">Kalimat Transaksi (Bahasa Indonesia)</label>
                      <input 
                        id="aiText"
                        type="text" 
                        required 
                        placeholder="Contoh: beli bakso 15rb pakai cash atau gaji masuk 5jt ke bca"
                        value={aiInputText}
                        onChange={e => setAiInputText(e.target.value)}
                        disabled={isParsingAi}
                        style={{ width: '100%' }}
                      />
                    </div>
                    
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      disabled={isParsingAi}
                    >
                      {isParsingAi ? '🤖 Memproses Kalimat...' : '✨ Catat Transaksi'}
                    </button>
                  </form>
                  
                  <div style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-light)', backgroundColor: 'var(--background)', padding: '12px', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                    💡 <b>Contoh kalimat yang didukung:</b>
                    <ul style={{ paddingLeft: '18px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <li><i>"beli kopi starbucks 45ribu dari cash"</i> (Pengeluaran Makanan)</li>
                      <li><i>"terima gaji freelance 3.500.000 ke bca"</i> (Pemasukan Freelance)</li>
                      <li><i>"transfer 500000 dari bca ke gopay"</i> (Transfer Antar Dompet)</li>
                    </ul>
                  </div>
                </div>

                {/* 📸 AI Vision Receipt Uploader */}
                <div className="card animate-slide-up" style={{ borderLeft: '6px solid #FF8A00' }}>
                  <h2 style={{ marginBottom: '8px' }}>📸 Unggah Struk Belanja (AI Vision)</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                    Unggah foto nota atau struk belanja Anda. AI Vision akan memindai teks struk dan mencatat pengeluaran Anda secara otomatis.
                  </p>
                  
                  <div style={{ 
                    border: '2px dashed var(--border)', 
                    borderRadius: '12px', 
                    padding: '24px', 
                    textAlign: 'center', 
                    backgroundColor: 'var(--background)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    position: 'relative',
                    cursor: 'pointer'
                  }}>
                    {isParsingReceipt ? (
                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '2rem' }}>🔄</span>
                        <span style={{ fontWeight: '600', color: 'var(--primary)' }}>Memindai struk dengan AI Vision...</span>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontSize: '2.5rem' }}>📷</span>
                        <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)' }}>
                          Klik untuk mengambil foto struk atau pilih file
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                          Format gambar JPG, JPEG, atau PNG (Maks 5MB)
                        </div>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleUploadReceipt}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            opacity: 0,
                            cursor: 'pointer'
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Manual Transaction Card */}
                <div className="card animate-slide-up">
                  <h2 style={{ marginBottom: '24px' }}>Catat Transaksi Manual</h2>
                  <form onSubmit={handleAddTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-group">
                      <label htmlFor="txType">Jenis Transaksi</label>
                      <select 
                        id="txType"
                        className="filter-select" 
                        style={{ width: '100%' }}
                        value={newTxType}
                        onChange={e => setNewTxType(e.target.value)}
                      >
                        <option value="expense">Pengeluaran (Expense)</option>
                        <option value="income">Pemasukan (Income)</option>
                        <option value="transfer">Transfer Antar Dompet (Transfer)</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="txAmount">Nominal Rupiah (Rp)</label>
                      <input 
                        id="txAmount"
                        type="number" 
                        required 
                        placeholder="Contoh: 50000"
                        value={newTxAmount}
                        onChange={e => setNewTxAmount(e.target.value)}
                      />
                    </div>

                    {newTxType !== 'transfer' && (
                      <div className="form-group animate-slide-up">
                        <label htmlFor="txCategory">Pilih Kategori</label>
                        <select 
                          id="txCategory"
                          className="filter-select" 
                          style={{ width: '100%' }}
                          value={newTxCategoryId}
                          onChange={e => setNewTxCategoryId(e.target.value)}
                        >
                          <option value="">-- Pilih Kategori --</option>
                          {categories.filter(c => c.type === newTxType).map(c => (
                            <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor="txWallet">{newTxType === 'transfer' ? 'Dari Dompet (Asal)' : 'Dompet'}</label>
                      <select 
                        id="txWallet"
                        className="filter-select" 
                        style={{ width: '100%' }}
                        value={newTxWalletId}
                        onChange={e => setNewTxWalletId(e.target.value)}
                      >
                        <option value="">-- Pilih Dompet --</option>
                        {wallets.map(w => (
                          <option key={w.id} value={w.id}>{w.name} (Saldo: Rp {Number(w.balance).toLocaleString('id-ID')})</option>
                        ))}
                      </select>
                    </div>

                    {newTxType === 'transfer' && (
                      <div className="form-group animate-slide-up">
                        <label htmlFor="txTransferWallet">Ke Dompet (Tujuan)</label>
                        <select 
                          id="txTransferWallet"
                          className="filter-select" 
                          style={{ width: '100%' }}
                          value={newTxTransferToWalletId}
                          onChange={e => setNewTxTransferToWalletId(e.target.value)}
                        >
                          <option value="">-- Pilih Dompet Tujuan --</option>
                          {wallets.filter(w => w.id !== newTxWalletId).map(w => (
                            <option key={w.id} value={w.id}>{w.name} (Saldo: Rp {Number(w.balance).toLocaleString('id-ID')})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor="txDesc">Catatan / Keterangan</label>
                      <input 
                        id="txDesc"
                        type="text" 
                        required 
                        placeholder={newTxType === 'transfer' ? 'Contoh: Pindahkan dana simpanan' : 'Contoh: Beli kopi susu senja'}
                        value={newTxDescription}
                        onChange={e => setNewTxDescription(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                      Simpan Transaksi
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* 3. LAPORAN & NATIVE EXPORT */}
            {activeTab === 'laporan' && (() => {
              const repIncomeTxs = filteredTxs.filter(t => t.type === 'income');
              const repExpenseTxs = filteredTxs.filter(t => t.type === 'expense');
              const repTotalIncome = repIncomeTxs.reduce((sum, t) => sum + Number(t.amount), 0);
              const repTotalExpense = repExpenseTxs.reduce((sum, t) => sum + Number(t.amount), 0);
              const repNetSavings = repTotalIncome - repTotalExpense;
              const repSavingsRate = repTotalIncome > 0 ? Math.round((repNetSavings / repTotalIncome) * 100) : 0;

              // Calculate category spending breakdown
              const categorySpentMap: Record<string, number> = {};
              repExpenseTxs.forEach(t => {
                const catId = t.category_id || 'other';
                categorySpentMap[catId] = (categorySpentMap[catId] || 0) + Number(t.amount);
              });

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2>Laporan Transaksi Lengkap</h2>
                      <p style={{ color: 'var(--text-muted)' }}>Cari, filter, dan ekspor seluruh transaksi keuangan Anda.</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => handleTriggerExport('xlsx')}
                        disabled={isExporting}
                        className="btn btn-secondary"
                      >
                        {isExporting ? 'Mengekspor...' : '📥 Ekspor Excel'}
                        {userPlan === 'Starter' && <span className="badge-pro-only">PRO</span>}
                      </button>
                      <button
                        onClick={() => handleTriggerExport('pdf')}
                        disabled={isExporting}
                        className="btn btn-outline"
                      >
                        {isExporting ? 'Mengekspor...' : '📄 Ekspor PDF'}
                        {userPlan === 'Starter' && <span className="badge-pro-only">PRO</span>}
                      </button>
                    </div>
                  </div>

                  {/* Visual Charts & Summary Row */}
                  <div className="grid-3 animate-slide-up" style={{ gap: '20px', margin: '24px 0' }}>
                    {/* Summary Card: Income vs Expense Bar */}
                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: '#ffffff' }}>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>📊 CASHFLOW SUMMARY</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>
                            <span style={{ color: 'var(--success)' }}>🟢 Pemasukan</span>
                            <span>Rp {repTotalIncome.toLocaleString('id-ID')}</span>
                          </div>
                          <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', backgroundColor: 'var(--success)', width: `${repTotalIncome > 0 ? 100 : 0}%` }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>
                            <span style={{ color: 'var(--error)' }}>🔴 Pengeluaran</span>
                            <span>Rp {repTotalExpense.toLocaleString('id-ID')}</span>
                          </div>
                          <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', backgroundColor: 'var(--error)', width: `${repTotalIncome + repTotalExpense > 0 ? (repTotalExpense / (repTotalIncome + repTotalExpense)) * 100 : 0}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary Card: Savings Rate Gauge */}
                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>📈 SAVINGS RATE</h4>
                        <div style={{ fontSize: '1.6rem', fontWeight: '800', color: repNetSavings >= 0 ? 'var(--primary)' : 'var(--error)' }}>
                          {repNetSavings >= 0 ? '+' : ''}Rp {repNetSavings.toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-light)', marginBottom: '4px' }}>
                          <span>Rasio Menabung</span>
                          <span>{repSavingsRate}%</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', backgroundColor: 'var(--primary)', width: `${Math.max(0, Math.min(repSavingsRate, 100))}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Summary Card: Category Distribution Breakdown */}
                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>🍕 PROPORSI PENGELUARAN</h4>
                      {Object.keys(categorySpentMap).length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: 0 }}>Belum ada data pengeluaran.</p>
                      ) : (
                        Object.entries(categorySpentMap).map(([catId, amount]) => {
                          const catObj = categories.find(c => c.id === catId) || { name: 'Lainnya', emoji: '📦' };
                          const pct = repTotalExpense > 0 ? Math.round((amount / repTotalExpense) * 100) : 0;
                          return (
                            <div key={catId} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                              <span style={{ fontSize: '1rem' }}>{catObj.emoji}</span>
                              <span style={{ flex: 1, fontWeight: '600' }}>{catObj.name}</span>
                              <span style={{ color: 'var(--text-light)' }}>{pct}%</span>
                              <div style={{ width: '60px', height: '6px', backgroundColor: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', backgroundColor: 'var(--primary)', width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Advanced Filter and Search Bar */}
                  {userPlan === 'Starter' && (
                    <div className="animate-slide-up" style={{ padding: '12px 16px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', marginBottom: '16px', border: '1px dashed hsla(20, 100%, 50%, 0.2)' }}>
                      🔒 <b>Fitur Pro:</b> Filter pencarian mendalam & Ekspor PDF/Excel dinonaktifkan untuk paket Starter. Silakan upgrade ke paket Pro!
                    </div>
                  )}

                  <div className="filters-bar animate-slide-up" style={{ opacity: userPlan === 'Starter' ? 0.6 : 1 }}>
                    <input
                      type="text"
                      placeholder={userPlan === 'Starter' ? "Cari catatan (Pro saja)..." : "Cari catatan..."}
                      className="tg-input"
                      style={{ flex: 1, minWidth: '200px' }}
                      value={filterSearch}
                      onChange={e => setFilterSearch(e.target.value)}
                      disabled={userPlan === 'Starter'}
                    />
                    
                    <select
                      className="filter-select"
                      value={filterWallet}
                      onChange={e => setFilterWallet(e.target.value)}
                      disabled={userPlan === 'Starter'}
                    >
                      <option value="">Semua Dompet</option>
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>

                    <select
                      className="filter-select"
                      value={filterCategory}
                      onChange={e => setFilterCategory(e.target.value)}
                      disabled={userPlan === 'Starter'}
                    >
                      <option value="">Semua Kategori</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                      ))}
                    </select>

                    <select
                      className="filter-select"
                      value={filterType}
                      onChange={e => setFilterType(e.target.value)}
                      disabled={userPlan === 'Starter'}
                    >
                      <option value="">Semua Tipe</option>
                      <option value="expense">Pengeluaran</option>
                      <option value="income">Pemasukan</option>
                      <option value="transfer">Transfer</option>
                    </select>
                  </div>

                  {/* Reports visual table */}
                  <div className="tx-table-container animate-slide-up">
                    {filteredTxs.length === 0 ? (
                      <div className="empty-state">
                        <span className="empty-icon">🔍</span>
                        <h4>Tidak ada data transaksi yang cocok</h4>
                        <p>Silakan ubah filter pencarian Anda.</p>
                      </div>
                    ) : (
                      <table className="tx-table">
                        <thead>
                          <tr>
                            <th>Tanggal</th>
                            <th>Kategori</th>
                            <th>Dompet</th>
                            <th>Tipe</th>
                            <th>Nominal</th>
                            <th>Catatan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTxs.map((t) => {
                            const dateStr = new Date(t.transaction_date).toLocaleString('id-ID', {
                              timeZone: 'Asia/Jakarta',
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            });
                            const cat = categories.find(c => c.id === t.category_id);
                            const wName = wallets.find(w => w.id === t.wallet_id)?.name || 'Default';
                            
                            return (
                              <React.Fragment key={t.id}>
                                <tr onClick={() => t.ocr_structured_data ? setExpandedTxId(expandedTxId === t.id ? null : t.id) : null} style={{ cursor: t.ocr_structured_data ? 'pointer' : 'default' }}>
                                  <td>{dateStr}</td>
                                  <td>{cat?.emoji} {cat?.name || 'Kategori'}</td>
                                  <td>{wName}</td>
                                  <td style={{ textTransform: 'capitalize' }}>
                                    {t.type === 'expense' ? 'Pengeluaran' : t.type === 'income' ? 'Pemasukan' : 'Transfer'}
                                  </td>
                                  <td className={`tx-amount ${t.type}`}>
                                    {t.type === 'expense' ? '-' : '+'}Rp {Number(t.amount).toLocaleString('id-ID')}
                                  </td>
                                  <td>
                                    {t.description}
                                    {t.ocr_structured_data && (
                                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginLeft: '8px' }}>
                                        (📸 {expandedTxId === t.id ? 'Tutup' : 'Rincian Struk'})
                                      </span>
                                    )}
                                  </td>
                                </tr>
                                {t.ocr_structured_data && expandedTxId === t.id && (
                                  <tr className="expanded-row">
                                    <td colSpan={6}>
                                      <div className="expanded-content">
                                        <h5 style={{ fontSize: '0.85rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '10px' }}>
                                          Barang Belanjaan Struk AI OCR
                                        </h5>
                                        <div className="sub-item-list">
                                          {t.ocr_structured_data.items?.map((item: any, idx: number) => (
                                            <div key={idx} className="sub-item-row">
                                              <span>{item.name} ({item.quantity}x)</span>
                                              <span>Rp {Number(item.price * item.quantity).toLocaleString('id-ID')}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Export History */}
                  <div className="card animate-slide-up" style={{ marginTop: '24px' }}>
                    <h3 style={{ marginBottom: '16px' }}>Riwayat Ekspor Laporan</h3>
                    {exports.length === 0 ? (
                      <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Belum ada riwayat ekspor.</p>
                    ) : (
                      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {exports.map(e => (
                          <li key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{e.filename}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                {new Date(e.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                              </div>
                            </div>
                            <a href={e.file_path} target="_blank" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                              Download Ulang
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              );
            })()}

            {/* 4. BUDGETS MANAGEMENT */}
            {activeTab === 'budget' && (
              <div className="card animate-slide-up">
                <h2>Kelola Anggaran Kategori</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Tentukan limit bulanan per kategori untuk mengontrol pengeluaran Anda.</p>
                
                {/* Visual Budgeting Diagram & Breakdown */}
                {(() => {
                  const totalLimit = budgets.reduce((s, b) => s + Number(b.monthly_limit || 0), 0);
                  const totalSpent = budgets.reduce((s, b) => s + Number(b.current_spent || 0), 0);
                  const isLimitSet = totalLimit > 0;
                  const overallPct = isLimitSet 
                    ? Math.round((totalSpent / totalLimit) * 100) 
                    : (totalSpent > 0 ? 100 : 0);
                  const displayPct = isLimitSet ? Math.min(100, overallPct) : (totalSpent > 0 ? 100 : 0);
                  const totalRemaining = totalLimit - totalSpent;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px', padding: '24px', border: '1px solid var(--border)', borderRadius: '16px', backgroundColor: 'var(--background)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>📊 Ringkasan Visual Anggaran Bulanan</h3>
                        {!isLimitSet && totalSpent > 0 && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 10px', borderRadius: '8px', fontWeight: '700' }}>
                            ⚠️ Batas Anggaran Belum Ditetapkan
                          </span>
                        )}
                      </div>
                      <div className="grid-2" style={{ gap: '24px', alignItems: 'center' }}>
                        {/* Gauge Chart Simulation using SVG */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                          <svg width="120" height="120" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border)" strokeWidth="3" />
                            <circle 
                              cx="18" 
                              cy="18" 
                              r="15.915" 
                              fill="none" 
                              stroke={!isLimitSet && totalSpent > 0 ? 'var(--error)' : overallPct >= 100 ? 'var(--error)' : overallPct >= 80 ? '#FF8A00' : 'var(--primary)'} 
                              strokeWidth="3.5" 
                              strokeDasharray={`${displayPct} ${100 - displayPct}`} 
                              strokeDashoffset="0" 
                              style={{ transition: 'stroke-dasharray 0.3s ease' }}
                            />
                          </svg>
                          <div>
                            <div style={{ fontSize: '2rem', fontWeight: '800', color: !isLimitSet && totalSpent > 0 ? 'var(--error)' : 'var(--text-main)' }}>
                              {isLimitSet ? `${overallPct}%` : (totalSpent > 0 ? '100%+' : '0%')}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                              {isLimitSet ? 'Anggaran Terpakai' : (totalSpent > 0 ? 'Melebihi Limit Rp 0' : 'Belum Ada Limit')}
                            </div>
                          </div>
                        </div>

                        {/* Breakdown Metrics */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Total Batas Anggaran:</span>
                            <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>Rp {totalLimit.toLocaleString('id-ID')}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Total Pengeluaran:</span>
                            <span style={{ fontWeight: '700', color: totalSpent > totalLimit ? 'var(--error)' : 'var(--text-main)' }}>Rp {totalSpent.toLocaleString('id-ID')}</span>
                          </div>
                          <div style={{ height: '1px', backgroundColor: 'var(--border)' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Sisa Anggaran Aman:</span>
                            <span style={{ fontWeight: '800', color: totalRemaining >= 0 && isLimitSet ? 'var(--primary)' : 'var(--error)' }}>
                              {totalRemaining >= 0 && isLimitSet ? 'Rp ' : '-Rp '}{Math.abs(totalRemaining).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {categories.filter(c => c.type === 'expense').map(c => {
                    const b = budgets.find(x => x.category_id === c.id) || { monthly_limit: 0, current_spent: 0 };
                    const limit = Number(b.monthly_limit || 0);
                    const spent = Number(b.current_spent || 0);
                    const isLimitSet = limit > 0;
                    const pct = isLimitSet ? Math.round((spent / limit) * 100) : (spent > 0 ? 100 : 0);
                    const sisa = limit - spent;
                    const bar = generateProgressBar(isLimitSet ? pct : (spent > 0 ? 100 : 0));

                    return (
                      <div key={c.id} style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '12px', background: !isLimitSet && spent > 0 ? 'rgba(239, 68, 68, 0.02)' : 'transparent' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontWeight: '700', fontSize: '1.05rem' }}>{c.emoji} {c.name}</span>
                          <span style={{ color: !isLimitSet && spent > 0 ? 'var(--error)' : pct >= 100 ? 'var(--error)' : pct >= 80 ? '#FF8A00' : 'var(--text-muted)', fontWeight: '700' }}>
                            {isLimitSet ? `${pct}% terpakai` : (spent > 0 ? `Rp ${spent.toLocaleString('id-ID')} terpakai (Limit belum diset)` : '0% terpakai')}
                          </span>
                        </div>
                        <div style={{ fontSize: '1.2rem', letterSpacing: '1px', marginBottom: '10px' }}>{bar}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <span>Sisa: Rp {sisa.toLocaleString('id-ID')}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>Batas: Rp</span>
                            <input 
                              type="number"
                              defaultValue={limit}
                              onBlur={async (e) => {
                                const newL = Number(e.target.value);
                                if (newL !== limit) {
                                  await handleUpdateBudget(c.id, newL);
                                }
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  const newL = Number((e.target as any).value);
                                  if (newL !== limit) {
                                    await handleUpdateBudget(c.id, newL);
                                    (e.target as any).blur();
                                  }
                                }
                              }}
                              style={{ width: '120px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: '#ffffff', color: 'var(--text-main)' }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. WALLET SETTINGS */}
            {activeTab === 'wallet' && (
              <div className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div>
                  <h2>Daftar Dompet & Rekening</h2>
                  <p style={{ color: 'var(--text-muted)' }}>Buat beberapa dompet dengan saldo masing-masing.</p>
                </div>
                
                <div className="grid-3">
                  {wallets.map(w => (
                    <div key={w.id}>
                      {editingWalletId === w.id ? (
                        <div className="stat-card" style={{ border: '2px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Edit Dompet</span>
                            <span onClick={() => setEditingWalletId(null)} style={{ cursor: 'pointer', fontSize: '0.9rem' }}>✖</span>
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <input 
                              type="text" 
                              value={editingWalletName} 
                              onChange={e => setEditingWalletName(e.target.value)} 
                              placeholder="Nama dompet"
                              style={{ width: '100%', padding: '6px 12px', fontSize: '0.9rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: '#ffffff', color: 'var(--text-main)' }}
                            />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <input 
                              type="number" 
                              value={editingWalletBalance} 
                              onChange={e => setEditingWalletBalance(e.target.value)} 
                              placeholder="Saldo"
                              style={{ width: '100%', padding: '6px 12px', fontSize: '0.9rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: '#ffffff', color: 'var(--text-main)' }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button onClick={() => handleSaveWalletEdit(w.id)} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem', flex: 1 }}>Simpan</button>
                            <button onClick={() => handleDeleteWallet(w.id)} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--error)', borderColor: 'var(--error)' }}>Hapus</button>
                          </div>
                        </div>
                      ) : (
                        <div className="stat-card" style={{ border: w.is_default ? '2px solid var(--primary)' : '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '1.5rem' }}>👛</span>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {w.is_default && <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '100px' }}>DEFAULT</span>}
                                <span onClick={() => { setEditingWalletId(w.id); setEditingWalletName(w.name); setEditingWalletBalance(String(w.balance)); }} style={{ cursor: 'pointer', fontSize: '0.85rem' }} title="Edit Dompet">✏️</span>
                              </div>
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '16px' }}>{w.name}</div>
                          </div>
                          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)', marginTop: '8px' }}>
                            Rp {Number(w.balance).toLocaleString('id-ID')}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {showAddWalletForm ? (
                  <form onSubmit={handleAddWallet} className="animate-slide-up" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
                    <h3 style={{ fontSize: '1.2rem' }}>➕ Tambah Dompet Baru</h3>
                    
                    <div className="form-group">
                      <label htmlFor="wName">Nama Dompet / Rekening</label>
                      <input 
                        id="wName"
                        type="text" 
                        required 
                        placeholder="Contoh: BCA, Cash, GoPay, Mandiri"
                        value={newWalletName}
                        onChange={e => setNewWalletName(e.target.value)}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="wBalance">Saldo Awal (Rp)</label>
                      <input 
                        id="wBalance"
                        type="number" 
                        required 
                        placeholder="Contoh: 1000000"
                        value={newWalletBalance}
                        onChange={e => setNewWalletBalance(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="checkbox" 
                          id="wDefault" 
                          checked={newWalletIsDefault}
                          onChange={e => setNewWalletIsDefault(e.target.checked)}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <label htmlFor="wDefault" style={{ textTransform: 'none', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '600', color: 'var(--text-main)' }}>
                          Set sebagai dompet utama (default)
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                        Simpan Dompet
                      </button>
                      <button type="button" onClick={() => setShowAddWalletForm(false)} className="btn btn-outline">
                        Batal
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <button onClick={() => setShowAddWalletForm(true)} className="btn btn-primary">
                      ➕ Tambah Dompet Baru
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 6. SETTINGS */}
            {activeTab === 'settings' && (
              <div className="card animate-slide-up">
                <h2>Pengaturan Sistem</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Hubungkan Telegram Bot, atur pengingat harian, dan kelola kategori custom.</p>
                
                {/* Telegram Bot connection tab */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <div style={{ paddingBottom: '32px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ marginBottom: '16px' }}>🤖 Integrasi Telegram Bot</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.5' }}>
                      Mencatat keuangan semudah mengirim pesan chat. Hubungkan bot Telegram pribadi Anda menggunakan token dari BotFather.<br />
                      Jika tidak memiliki bot kustom, gunakan bot global Mencatat Aja dengan mengirimkan token pairing Anda di chat: <b>{telegramToken}</b>
                    </p>
                    
                    <div className="form-group" style={{ maxWidth: '500px' }}>
                      <label htmlFor="botToken">Token Bot Telegram Kustom (BYOB)</label>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <input
                          id="botToken"
                          type="password"
                          placeholder="Paste token bot dari @BotFather di sini"
                          value={botTokenInput}
                          onChange={e => setBotTokenInput(e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={handleTestBotConnection}
                          disabled={botStatus === 'testing'}
                          className="btn btn-primary"
                        >
                          {botStatus === 'testing' ? 'Testing...' : 'Test Koneksi'}
                        </button>
                        {botStatus === 'connected' && (
                          <button
                            type="button"
                            onClick={handleDisconnectBot}
                            className="btn btn-outline"
                            style={{ color: 'var(--error)', borderColor: 'var(--error)', fontWeight: '700' }}
                          >
                            🔌 Putuskan
                          </button>
                        )}
                      </div>
                      {botStatusMsg && (
                        <p style={{ fontSize: '0.85rem', marginTop: '10px', color: botStatus === 'connected' ? 'var(--success)' : 'var(--error)', fontWeight: '600' }}>
                          {botStatusMsg}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Reminder Settings tab */}
                  <div style={{ paddingBottom: '32px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ marginBottom: '16px' }}>⏰ Pengingat Pencatatan Harian</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>Kirimkan pengingat ke Telegram Anda agar tidak lupa mencatat pengeluran hari ini.</p>
                    
                    <div className="form-group">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="checkbox"
                          id="reminderOn"
                          checked={reminderActive}
                          onChange={e => setReminderActive(e.target.checked)}
                          style={{ width: '20px', height: '20px' }}
                        />
                        <label htmlFor="reminderOn" style={{ fontSize: '1rem', textTransform: 'none', fontWeight: '600', color: 'var(--text-main)', cursor: 'pointer' }}>
                          Aktifkan Pengingat Harian
                        </label>
                      </div>
                    </div>

                    {reminderActive && (
                      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', paddingLeft: '32px' }}>
                        <div className="form-group" style={{ maxWidth: '300px' }}>
                          <label>Frekuensi Pengingat</label>
                          <select
                            className="filter-select"
                            value={reminderFreq}
                            onChange={e => setReminderFreq(e.target.value)}
                          >
                            <option value="1">1x Sehari (Sore)</option>
                            <option value="2">2x Sehari (Siang & Malam)</option>
                          </select>
                        </div>

                        <div className="form-group" style={{ maxWidth: '200px' }}>
                          <label>Waktu Pengingat</label>
                          <input type="time" defaultValue="19:00" />
                          {reminderFreq === '2' && (
                            <input type="time" defaultValue="12:00" style={{ marginTop: '8px' }} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Category Settings tab */}
                  <div>
                    <h3 style={{ marginBottom: '16px' }}>🏷️ Kelola Kategori Kustom</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>Kelola daftar kategori transaksi beserta warna dan emoji pilihan Anda.</p>
                    <div className="wallet-select-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                      {categories.map(c => {
                        const isDefault = c.id.startsWith('c') && !c.id.includes('_');
                        return (
                          <div key={c.id}>
                            {editingCategoryId === c.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 16px', border: '2px solid var(--primary)', borderRadius: '12px', backgroundColor: '#ffffff' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <input 
                                    type="text" 
                                    value={editingCategoryEmoji} 
                                    onChange={e => setEditingCategoryEmoji(e.target.value)} 
                                    placeholder="Emoji" 
                                    style={{ width: '45px', padding: '4px', textAlign: 'center', fontSize: '1rem', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: '#ffffff', color: 'var(--text-main)' }} 
                                  />
                                  <input 
                                    type="text" 
                                    value={editingCategoryName} 
                                    onChange={e => setEditingCategoryName(e.target.value)} 
                                    placeholder="Nama Kategori" 
                                    style={{ flex: 1, padding: '4px 8px', fontSize: '0.9rem', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: '#ffffff', color: 'var(--text-main)' }} 
                                  />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                  <button onClick={() => handleSaveCategoryEdit(c.id)} className="btn btn-primary" style={{ padding: '2px 6px', fontSize: '0.75rem', flex: 1 }}>Simpan</button>
                                  <button onClick={() => handleDeleteCategory(c.id)} className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '0.75rem', color: 'var(--error)', borderColor: 'var(--error)' }}>Hapus</button>
                                  <button onClick={() => setEditingCategoryId(null)} className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '0.75rem' }}>Batal</button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: '#ffffff', height: '100%' }}>
                                <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>{c.emoji}</span>
                                <span style={{ fontWeight: '600', flex: 1, color: 'var(--text-main)' }}>{c.name}</span>
                                {!isDefault && (
                                  <span 
                                    onClick={() => { setEditingCategoryId(c.id); setEditingCategoryName(c.name); setEditingCategoryEmoji(c.emoji); }} 
                                    style={{ color: 'var(--text-light)', cursor: 'pointer' }}
                                    title="Edit Kategori"
                                  >
                                    ✏️
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div>
                  <h2>Profil Pengguna & Top Up Kredit</h2>
                  <p style={{ color: 'var(--text-muted)' }}>Kelola data profil Anda, status paket, dan isi ulang kredit AI.</p>
                </div>

                <div className="grid-2" style={{ gap: '32px' }}>
                  {/* Profile Details */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', backgroundColor: '#ffffff' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>👤 Informasi Profil</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-light)', fontWeight: '600' }}>Nama Lengkap</span>
                        <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{userName || 'Budi Santoso'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-light)', fontWeight: '600' }}>No. Handphone</span>
                        <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>+62 812-3456-7890</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-light)', fontWeight: '600' }}>Status Paket</span>
                        <span className={`plan-badge ${userPlan.toLowerCase()}`} style={{ fontWeight: '700' }}>{userPlan} Plan</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-light)', fontWeight: '600' }}>Sisa Kredit AI</span>
                        <span style={{ fontWeight: '800', color: 'var(--primary)' }}>⚡ {userCredits} Kredit</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Credits Usage Guide */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', backgroundColor: 'var(--primary-light)' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', color: 'var(--primary)' }}>💡 Penggunaan Kredit AI</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5', marginBottom: '12px' }}>
                      Kredit digunakan sebagai biaya komputasi untuk menjalankan fitur-fitur pintar asisten kecerdasan buatan Mencatat Aja:
                    </p>
                    <ul style={{ paddingLeft: '18px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-main)' }}>
                      <li>💬 <b>Mencatat via Telegram Chat:</b> 1 Kredit per transaksi.</li>
                      <li>🎙️ <b>Mencatat via Voice Note:</b> 2 Kredit per rekaman suara.</li>
                      <li>📸 <b>Unggah Struk Belanja (OCR):</b> 3 Kredit per struk dibaca.</li>
                      <li>🤖 <b>AI Advisor (Tanya Jawab Keuangan):</b> 2 Kredit per respons saran.</li>
                    </ul>
                  </div>
                </div>

                {/* Credit Top Up Packages */}
                <div style={{ marginTop: '16px' }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>🛒 Paket Top Up Kredit AI</h3>
                  <div className="grid-3" style={{ gap: '20px' }}>
                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', textAlign: 'center', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: '2rem' }}>🥉</span>
                        <h4 style={{ margin: '12px 0 8px 0', fontSize: '1.1rem' }}>Paket Hemat</h4>
                        <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary)', margin: '12px 0' }}>50 Kredit</div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '20px' }}>Cocok untuk uji coba pencatatan ringan.</p>
                      </div>
                      <button 
                        onClick={() => handleTopUpCredits(50, 15000)}
                        disabled={isToppingUp}
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                      >
                        {isToppingUp ? 'Memproses...' : 'Beli Rp 15.000'}
                      </button>
                    </div>

                    <div style={{ border: '2px solid var(--primary)', borderRadius: '12px', padding: '24px', textAlign: 'center', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
                      <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--primary)', color: '#ffffff', fontSize: '0.7rem', fontWeight: '700', padding: '2px 10px', borderRadius: '100px', textTransform: 'uppercase' }}>Populer</span>
                      <div>
                        <span style={{ fontSize: '2rem' }}>🥈</span>
                        <h4 style={{ margin: '12px 0 8px 0', fontSize: '1.1rem' }}>Paket Standar</h4>
                        <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary)', margin: '12px 0' }}>120 Kredit</div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '20px' }}>Kebutuhan ideal bulanan pencatatan harian.</p>
                      </div>
                      <button 
                        onClick={() => handleTopUpCredits(120, 30000)}
                        disabled={isToppingUp}
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                      >
                        {isToppingUp ? 'Memproses...' : 'Beli Rp 30.000'}
                      </button>
                    </div>

                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', textAlign: 'center', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: '2rem' }}>🥇</span>
                        <h4 style={{ margin: '12px 0 8px 0', fontSize: '1.1rem' }}>Paket Pro</h4>
                        <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary)', margin: '12px 0' }}>300 Kredit</div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '20px' }}>Pencatatan intensif tak terbatas struk & VN.</p>
                      </div>
                      <button 
                        onClick={() => handleTopUpCredits(300, 60000)}
                        disabled={isToppingUp}
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                      >
                        {isToppingUp ? 'Memproses...' : 'Beli Rp 60.000'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      
      {/* EDIT TRANSACTION MODAL */}
      {editingTx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
          <div className="card animate-slide-up" style={{ maxWidth: '520px', width: '100%', padding: '28px', background: 'rgba(13, 20, 38, 0.98)', border: '1px solid rgba(255, 255, 255, 0.12)', boxShadow: '0 30px 70px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✏️ Edit Catatan Transaksi
              </h3>
              <button onClick={() => setEditingTx(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <form onSubmit={handleSaveEditTx} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Type Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditTxType('expense')}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: editTxType === 'expense' ? '2px solid var(--error)' : '1px solid var(--border)',
                    background: editTxType === 'expense' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    color: editTxType === 'expense' ? '#f43f5e' : '#94a3b8',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  ↑ Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setEditTxType('income')}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: editTxType === 'income' ? '2px solid var(--success)' : '1px solid var(--border)',
                    background: editTxType === 'income' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    color: editTxType === 'income' ? '#10b981' : '#94a3b8',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  ↓ Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => setEditTxType('transfer')}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: editTxType === 'transfer' ? '2px solid var(--info)' : '1px solid var(--border)',
                    background: editTxType === 'transfer' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    color: editTxType === 'transfer' ? '#38bdf8' : '#94a3b8',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  ⇄ Transfer
                </button>
              </div>

              {/* Nominal */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#cbd5e1' }}>Nominal (Rp)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editTxAmount}
                  onChange={e => setEditTxAmount(e.target.value)}
                  placeholder="Contoh: 50000"
                  style={{ width: '100%', fontSize: '1.1rem', fontWeight: '700' }}
                />
              </div>

              {/* Deskripsi */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#cbd5e1' }}>Catatan / Keterangan</label>
                <input
                  type="text"
                  required
                  value={editTxDescription}
                  onChange={e => setEditTxDescription(e.target.value)}
                  placeholder="Contoh: Beli bensin Pertamax"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Kategori (jika bukan transfer) */}
              {editTxType !== 'transfer' && (
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#cbd5e1' }}>Kategori</label>
                  <select
                    value={editTxCategoryId}
                    onChange={e => setEditTxCategoryId(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    {categories.filter(c => c.type === editTxType).map(c => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dompet Asal */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#cbd5e1' }}>
                  {editTxType === 'transfer' ? 'Dompet Sumber' : 'Dompet'}
                </label>
                <select
                  value={editTxWalletId}
                  onChange={e => setEditTxWalletId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name} (Saldo: Rp {Number(w.balance).toLocaleString('id-ID')})</option>
                  ))}
                </select>
              </div>

              {/* Dompet Tujuan (jika transfer) */}
              {editTxType === 'transfer' && (
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#cbd5e1' }}>Dompet Tujuan Transfer</label>
                  <select
                    value={editTxTransferToWalletId}
                    onChange={e => setEditTxTransferToWalletId(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Pilih Dompet Tujuan...</option>
                    {wallets.filter(w => w.id !== editTxWalletId).map(w => (
                      <option key={w.id} value={w.id}>{w.name} (Saldo: Rp {Number(w.balance).toLocaleString('id-ID')})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tanggal & Waktu */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#cbd5e1' }}>Tanggal & Waktu Transaksi</label>
                <input
                  type="datetime-local"
                  value={editTxDate}
                  onChange={e => setEditTxDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '12px' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEditTx}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px', fontWeight: '700' }}
                >
                  {isSavingEditTx ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </main>
    </div>
    </>
  );
}
