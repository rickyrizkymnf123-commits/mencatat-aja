'use strict';
'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, supabaseUrl } from '@/lib/supabase';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    'users' | 'user_approvals' | 'subscriptions' | 'tutorials' | 'ai_logs' | 'payments' | 'audit_logs' | 'user_preview' | 'ai_config' |
    'admin_beranda' | 'admin_transaksi' | 'admin_laporan' | 'admin_budget' | 'admin_wallet' | 'admin_settings'
  >('users');
  const [isLoading, setIsLoading] = useState(true);
  const [adminUserId, setAdminUserId] = useState('usr_admin');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // VIDEO TUTORIALS MANAGEMENT STATES
  const [tutorialsList, setTutorialsList] = useState<any[]>([]);
  const [isFetchingTutorials, setIsFetchingTutorials] = useState(false);
  const [showAddTutorialModal, setShowAddTutorialModal] = useState(false);
  const [editingTutorialId, setEditingTutorialId] = useState<string | null>(null);
  const [tutorialTitleInput, setTutorialTitleInput] = useState('');
  const [tutorialDescInput, setTutorialDescInput] = useState('');
  const [tutorialYoutubeUrlInput, setTutorialYoutubeUrlInput] = useState('');
  const [tutorialCategoryInput, setTutorialCategoryInput] = useState('Bot Telegram');
  const [isSavingTutorial, setIsSavingTutorial] = useState(false);
  const [tutorialSearchQuery, setTutorialSearchQuery] = useState('');

  // CENTRAL AI CONFIG STATES (9Router Official Catalogue)
  const DEFAULT_9ROUTER_MODELS = [
    // 1. 9Router Auto-Switch & Fallback Combos (Recommended)
    'combo',
    'free-combo',
    'premium-coding',
    // 2. Claude Code (cc/)
    'cc/claude-opus-4-7',
    'cc/claude-opus-4-6',
    'cc/claude-sonnet-4-6',
    'cc/claude-sonnet-4-5-20250929',
    'cc/claude-haiku-4-5-20251001',
    // 3. Codex (cx/)
    'cx/gpt-5.5',
    'cx/gpt-5.4',
    'cx/gpt-5.3-codex',
    'cx/gpt-5.2-codex',
    'cx/gpt-5.1-codex-max',
    // 4. GitHub Copilot (gh/)
    'gh/gpt-5.4',
    'gh/claude-opus-4.7',
    'gh/claude-sonnet-4.6',
    'gh/gemini-3.1-pro-preview',
    'gh/grok-code-fast-1',
    // 5. Cursor (cu/)
    'cu/claude-4.6-opus-max',
    'cu/claude-4.5-sonnet-thinking',
    'cu/gpt-5.3-codex',
    'cu/kimi-k2.5',
    // 6. GLM & MiniMax
    'glm/glm-5.1',
    'glm/glm-5',
    'glm/glm-4.7',
    'minimax/MiniMax-M2.7',
    'minimax/MiniMax-M2.5',
    // 7. Kimi & Kiro
    'kimi/kimi-k2.5',
    'kimi/kimi-k2.5-thinking',
    'kr/claude-sonnet-4.5',
    'kr/claude-haiku-4.5',
    'kr/glm-5',
    'kr/MiniMax-M2.5',
    'kr/qwen3-coder-next',
    'kr/deepseek-3.2',
    // 8. Vertex AI
    'vertex/gemini-3.1-pro-preview',
    'vertex/gemini-3-flash-preview',
    'vertex/gemini-2.5-flash',
    'vertex-partner/glm-5-maas',
    'vertex-partner/deepseek-v3.2-maas',
    // 9. Standard OpenAI / Anthropic / Google Aliases
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gpt-4o',
    'gpt-4o-mini',
    'deepseek-chat',
    'claude-3-5-sonnet'
  ];

  const [aiBaseUrl, setAiBaseUrl] = useState('http://100.80.46.70:20128/v1');
  const [aiApiKey, setAiApiKey] = useState('');
  const [showAiApiKey, setShowAiApiKey] = useState(false);
  const [defaultAiModel, setDefaultAiModel] = useState('combo');
  const [modelsList, setModelsList] = useState<string[]>(DEFAULT_9ROUTER_MODELS);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isSavingAiConfig, setIsSavingAiConfig] = useState(false);

  // ADMIN STATES (Connected to Supabase)
  
  // SUBSCRIPTION MANAGEMENT STATES (Ala ProfitLab)
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [adminBasicPrice, setAdminBasicPrice] = useState<number>(0);
  const [adminBasicPeriod, setAdminBasicPeriod] = useState<string>('Gratis');
  const [adminBasicDesc, setAdminBasicDesc] = useState<string>('Pencatatan keuangan personal dasar & dompet standar.');
  const [adminProPrice, setAdminProPrice] = useState<number>(49000);
  const [adminProPeriod, setAdminProPeriod] = useState<string>('Bulan');
  const [adminProDesc, setAdminProDesc] = useState<string>('Akses tanpa batas ke seluruh ekosistem AI & bot otomatisasi.');
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [subStatusFilter, setSubStatusFilter] = useState('all');
  const [selectedSubUser, setSelectedSubUser] = useState<any | null>(null);
  const [showEditSubModal, setShowEditSubModal] = useState(false);
  const [subModalDays, setSubModalDays] = useState(30);
  const [subModalFreeAccess, setSubModalFreeAccess] = useState(false);
  const [subModalIsActive, setSubModalIsActive] = useState(true);
  const [subModalNotes, setSubModalNotes] = useState('');
  const [subModalPlan, setSubModalPlan] = useState('Pro');
  const [isSavingSub, setIsSavingSub] = useState(false);

  const fetchPricingConfig = async () => {
    try {
      const res = await fetch('/api/subscriptions/pricing');
      if (res.ok) {
        const data = await res.json();
        if (data && data.pricing) {
          if (data.pricing.basic) {
            setAdminBasicPrice(data.pricing.basic.price !== undefined ? data.pricing.basic.price : 0);
            setAdminBasicPeriod(data.pricing.basic.period || 'Gratis');
            setAdminBasicDesc(data.pricing.basic.description || 'Pencatatan keuangan personal dasar & dompet standar.');
          }
          if (data.pricing.pro) {
            setAdminProPrice(data.pricing.pro.price !== undefined ? data.pricing.pro.price : 49000);
            setAdminProPeriod(data.pricing.pro.period || 'Bulan');
            setAdminProDesc(data.pricing.pro.description || 'Akses tanpa batas ke seluruh ekosistem AI & bot otomatisasi.');
          }
        }
      }
    } catch (e) {
      console.warn('Admin fetch pricing error:', e);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/admin/subscriptions');
      if (res.ok) {
        const data = await res.json();
        if (data.subscriptions) {
          setSubscriptionsList(data.subscriptions);
        }
      }
      await fetchPricingConfig();
    } catch (e) {
      console.error('Fetch subscriptions error:', e);
    }
  };

  const handleOpenEditSub = (user: any) => {
    setSelectedSubUser(user);
    setSubModalDays(30);
    setSubModalFreeAccess(!!user.is_free_access);
    setSubModalIsActive(user.is_active !== false);
    setSubModalNotes(user.notes || '');
    setSubModalPlan(user.plan || 'Pro');
    setShowEditSubModal(true);
  };

  const handleSaveSubscription = async () => {
    if (!selectedSubUser) return;
    setIsSavingSub(true);
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedSubUser.id || selectedSubUser.user_id,
          daysToAdd: subModalDays,
          isFreeAccess: subModalFreeAccess,
          isActive: subModalIsActive,
          notes: subModalNotes,
          plan: subModalFreeAccess ? 'Pro' : subModalPlan
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan langganan');
      alert(`🟢 Berhasil memperbarui langganan untuk ${selectedSubUser.name || 'Pengguna'}!`);
      setShowEditSubModal(false);
      await fetchSubscriptions();
      await fetchAdminData();
      await fetchPricingConfig();
    } catch (err: any) {
      alert(`❌ Gagal: ${err.message}`);
    } finally {
      setIsSavingSub(false);
    }
  };

  // TUTORIAL HANDLERS
  const fetchTutorials = async () => {
    setIsFetchingTutorials(true);
    try {
      const res = await fetch('/api/tutorials', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tutorials)) {
          setTutorialsList(data.tutorials);
        }
      }
    } catch (e) {
      console.warn('Admin fetch tutorials error:', e);
    } finally {
      setIsFetchingTutorials(false);
    }
  };

  const handleOpenAddTutorial = () => {
    setEditingTutorialId(null);
    setTutorialTitleInput('');
    setTutorialDescInput('');
    setTutorialYoutubeUrlInput('');
    setTutorialCategoryInput('Bot Telegram');
    setShowAddTutorialModal(true);
  };

  const handleOpenEditTutorial = (tut: any) => {
    setEditingTutorialId(tut.id);
    setTutorialTitleInput(tut.title || '');
    setTutorialDescInput(tut.description || '');
    setTutorialYoutubeUrlInput(tut.youtube_url || '');
    setTutorialCategoryInput(tut.category || 'Bot Telegram');
    setShowAddTutorialModal(true);
  };

  const handleSaveTutorial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorialTitleInput.trim() || !tutorialYoutubeUrlInput.trim()) {
      alert('Judul dan Link YouTube wajib diisi!');
      return;
    }
    setIsSavingTutorial(true);
    try {
      const method = editingTutorialId ? 'PUT' : 'POST';
      const bodyPayload = {
        id: editingTutorialId,
        title: tutorialTitleInput,
        description: tutorialDescInput,
        youtube_url: tutorialYoutubeUrlInput,
        category: tutorialCategoryInput
      };
      const res = await fetch('/api/tutorials', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan tutorial');
      alert(`🟢 Video tutorial berhasil ${editingTutorialId ? 'diperbarui' : 'ditambahkan'}!`);
      setShowAddTutorialModal(false);
      await fetchTutorials();
    } catch (err: any) {
      alert(`❌ Gagal: ${err.message}`);
    } finally {
      setIsSavingTutorial(false);
    }
  };

  const handleDeleteTutorial = async (id: string, title: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus video tutorial "${title}"?`)) return;
    try {
      const res = await fetch(`/api/tutorials?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus video tutorial');
      alert('🟢 Video tutorial berhasil dihapus!');
      await fetchTutorials();
    } catch (err: any) {
      alert(`❌ Gagal: ${err.message}`);
    }
  };

  const handleSavePricingConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPricing(true);
    try {
      const res = await fetch('/api/subscriptions/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basic: {
            id: 'basic',
            name: 'Basic',
            price: Number(adminBasicPrice),
            period: adminBasicPeriod,
            description: adminBasicDesc
          },
          pro: {
            id: 'pro',
            name: 'Pro',
            price: Number(adminProPrice),
            period: adminProPeriod,
            description: adminProDesc
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan harga paket');

      alert(`✅ Berhasil Memperbarui Harga Paket Langganan!\n\n• Basic: Rp ${Number(adminBasicPrice).toLocaleString('id-ID')} / ${adminBasicPeriod}\n• Pro: Rp ${Number(adminProPrice).toLocaleString('id-ID')} / ${adminProPeriod}`);
      await fetchPricingConfig();
    } catch (err: any) {
      alert('❌ Error: ' + err.message);
    } finally {
      setIsSavingPricing(false);
    }
  };

  const handleBulkExtendSubscription = async () => {
    if (selectedUserIds.length === 0) {
      alert('Pilih setidaknya 1 pengguna di tabel untuk perpanjangan massal!');
      return;
    }
    const daysStr = prompt(`Perpanjang langganan untuk ${selectedUserIds.length} pengguna terpilih.\nMasukkan jumlah hari:`, '30');
    if (!daysStr) return;
    const days = parseInt(daysStr);
    if (isNaN(days) || days <= 0) {
      alert('Jumlah hari harus berupa angka valid');
      return;
    }
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUserIds,
          daysToAdd: days,
          isActive: true,
          plan: 'Pro'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal');
      alert(`🎉 Sukses menambahkan +${days} hari untuk ${selectedUserIds.length} pengguna!`);
      await fetchSubscriptions();
      await fetchAdminData();
    // Fetch pricing settings for admin
    fetch('/api/subscriptions/pricing')
      .then(res => res.json())
      .then(data => {
        if (data && data.pricing) {
          if (data.pricing.basic) {
            setAdminBasicPrice(data.pricing.basic.price || 0);
            setAdminBasicPeriod(data.pricing.basic.period || 'Gratis');
            setAdminBasicDesc(data.pricing.basic.description || 'Pencatatan keuangan personal dasar & dompet standar.');
          }
          if (data.pricing.pro) {
            setAdminProPrice(data.pricing.pro.price || 49000);
            setAdminProPeriod(data.pricing.pro.period || 'Bulan');
            setAdminProDesc(data.pricing.pro.description || 'Akses tanpa batas ke seluruh ekosistem AI & bot otomatisasi.');
          }
        }
      })
      .catch(e => console.warn('Admin fetch pricing error:', e));
    } catch (err: any) {
      alert(`❌ Gagal: ${err.message}`);
    }
  };

  const [providers, setProviders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedProofModal, setSelectedProofModal] = useState<any | null>(null);
  
  // User Management Admin Actions
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserNameInput, setNewUserNameInput] = useState('');
  const [newUserEmailInput, setNewUserEmailInput] = useState('');
  const [newUserPhoneInput, setNewUserPhoneInput] = useState('');
  const [newUserPlanInput, setNewUserPlanInput] = useState('Basic');
  const [newUserApproveInput, setNewUserApproveInput] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userApprovalFilter, setUserApprovalFilter] = useState<'all' | 'pending' | 'approved'>('all');
  
  // USER PREVIEW STATES
  const [previewUserId, setPreviewUserId] = useState('');
  const [previewUserTab, setPreviewUserTab] = useState<'beranda' | 'transaksi' | 'laporan' | 'budget' | 'wallet' | 'settings' | 'profile'>('beranda');
  const [previewWallets, setPreviewWallets] = useState<any[]>([]);
  const [previewTransactions, setPreviewTransactions] = useState<any[]>([]);
  const [previewBudgets, setPreviewBudgets] = useState<any[]>([]);
  const [previewCategories, setPreviewCategories] = useState<any[]>([]);
  const [previewPeriodFilter, setPreviewPeriodFilter] = useState<'harian' | 'mingguan' | 'bulanan' | 'tahunan'>('bulanan');
  const [previewUserPlan, setPreviewUserPlan] = useState('Basic');
  const [previewUserName, setPreviewUserName] = useState('');
  const [previewUserPhone, setPreviewUserPhone] = useState('');
  
  // Form & inputs inside preview
  const [prevNewWalletName, setPrevNewWalletName] = useState('');
  const [prevNewWalletBalance, setPrevNewWalletBalance] = useState('');
  const [prevNewWalletDefault, setPrevNewWalletDefault] = useState(false);
  const [showPrevAddWallet, setShowPrevAddWallet] = useState(false);
  
  const [prevTxType, setPrevTxType] = useState('expense');
  const [prevTxAmount, setPrevTxAmount] = useState('');
  const [prevTxCategoryId, setPrevTxCategoryId] = useState('');
  const [prevTxWalletId, setPrevTxWalletId] = useState('');
  const [prevTxDescription, setPrevTxDescription] = useState('');
  const [prevTxTransferToWalletId, setPrevTxTransferToWalletId] = useState('');
  
  const [prevAiText, setPrevAiText] = useState('');
  const [prevIsParsingAi, setPrevIsParsingAi] = useState(false);

  // AI Connection Tester states
  const [testPrompt, setTestPrompt] = useState('Hai, perkenalkan dirimu sebagai Asisten AI Mencatat Aja');
  const [testReply, setTestReply] = useState('');
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [testError, setTestError] = useState('');

  // Preview Settings states
  const [prevBotTokenInput, setPrevBotTokenInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('Mencatat Aja_custom_bot_token_preview') || '';
    }
    return '';
  });
  const [prevBotStatus, setPrevBotStatus] = useState<'idle' | 'testing' | 'connected' | 'disconnected'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('Mencatat Aja_custom_bot_token_preview') ? 'connected' : 'idle';
    }
    return 'idle';
  });
  const [prevBotStatusMsg, setPrevBotStatusMsg] = useState(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('Mencatat Aja_custom_bot_token_preview')) {
      return '🟢 Terhubung dengan bot kustom';
    }
    return '';
  });
  const [prevTelegramToken, setPrevTelegramToken] = useState('TD-729402');
  const [prevReminderActive, setPrevReminderActive] = useState(false);
  const [prevReminderFreq, setPrevReminderFreq] = useState('1');
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [editingWalletName, setEditingWalletName] = useState('');
  const [editingWalletBalance, setEditingWalletBalance] = useState('');
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [previewUserCredits, setPreviewUserCredits] = useState(120);
  const [isToppingUp, setIsToppingUp] = useState(false);

  // Local Audit Logs state (audited activities)
  const [auditLogs, setAuditLogs] = useState<any[]>([
    { id: 'aud_1', admin: 'rickyrizkymnf123@gmail.com', action: 'Superadmin Initialized', target: 'system', time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) }
  ]);

  // Support State for User Transaction Viewer
  const [selectedUserTxs, setSelectedUserTxs] = useState<any[] | null>(null);
  const [viewedUser, setViewedUser] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/data');
      if (res.ok) {
        const data = await res.json();
        if (data.users && data.users.length > 0) {
          setUsers(data.users);
        }
        if (data.payments) {
          setPayments(data.payments);
        }
        if (data.aiLogs) {
          setAiLogs(data.aiLogs);
        }
        if (data.providers) {
          setProviders(data.providers);
        }
      }
    } catch (err) {
      console.error('Error fetching admin data from /api/admin/data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initAdmin = async () => {
      if (typeof window !== 'undefined') {
        const storedRole = localStorage.getItem('Mencatat Aja_role');
        const storedEmail = localStorage.getItem('Mencatat Aja_user_email');
        const storedId = localStorage.getItem('Mencatat Aja_user_id');

        const isSuperadmin = (storedRole === 'superadmin' || storedEmail?.toLowerCase() === 'rickyrizkymnf123@gmail.com');

        if (!isSuperadmin) {
          if (!storedId) {
            router.replace('/auth?mode=login');
          } else {
            alert('⛔ Akses Ditolak: Panel Admin hanya dapat diakses oleh Superadmin.');
            router.replace('/dashboard');
          }
          return;
        }

        if (storedId) {
          setAdminUserId(storedId);
        }
      }

      await fetchAdminData();
      await fetchPricingConfig();
      await fetchTutorials();
    };
    initAdmin();
  }, []);

  // Impersonate User without Re-login
  const handleImpersonation = (user: any) => {
    localStorage.setItem('Mencatat Aja_user_id', user.id);
    localStorage.setItem('Mencatat Aja_user_name', user.name);
    localStorage.setItem('Mencatat Aja_user_phone', user.phone);
    localStorage.setItem('Mencatat Aja_plan', user.plan);
    localStorage.setItem('Mencatat Aja_telegram_token', 'TD-LINKED');
    localStorage.setItem('Mencatat Aja_admin_mode', 'true');
    
    // Log Audit
    const newAudit = {
      id: `aud_${Date.now()}`,
      admin: 'superadmin@Mencatat Aja.id',
      action: `Impersonation User (${user.name})`,
      target: user.id,
      time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    };
    setAuditLogs(prev => [newAudit, ...prev]);

    alert(`🟢 Masuk sebagai user: ${user.name}. Mengalihkan ke dashboard.`);
    router.push('/dashboard');
  };



  // User Management Actions
  const handleAddUser = () => {
    if (!newUserNameInput.trim()) {
      alert('Nama tidak boleh kosong!');
      return;
    }
    const newUser = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      name: newUserNameInput,
      email: newUserEmailInput || '-',
      phone: newUserPhoneInput || '-',
      plan: newUserPlanInput,
      telegram: 'Belum Terhubung',
      txCount: 0,
      is_approved: newUserApproveInput
    };

    const updatedUsers = [newUser, ...users];
    setUsers(updatedUsers);
    if (typeof window !== 'undefined') {
      localStorage.setItem('Mencatat_Aja_mock_users', JSON.stringify(updatedUsers));
    }
    alert(`🟢 User "${newUserNameInput}" berhasil ditambahkan!`);
    setNewUserNameInput('');
    setNewUserEmailInput('');
    setNewUserPhoneInput('');
    setNewUserPlanInput('Basic');
    setNewUserApproveInput(true);
    setShowAddUserModal(false);
  };

  const handleDeleteUser = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus user "${name}"?\n\nSemua data transaksi, dompet, anggaran, bot, dan akun database akan dihapus permanen.`);
    if (!confirmDelete) return;

    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id })
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(`❌ Gagal menghapus user: ${errData.error || 'Terjadi kesalahan di server'}`);
        return;
      }

      const updatedUsers = users.filter(u => u.id !== id);
      setUsers(updatedUsers);
      if (typeof window !== 'undefined') {
        localStorage.setItem('Mencatat_Aja_mock_users', JSON.stringify(updatedUsers));
      }
      setSelectedUserIds(prev => prev.filter(x => x !== id));

      // Log Audit
      const newAudit = {
        id: `aud_${Date.now()}`,
        admin: 'rickyrizkymnf123@gmail.com',
        action: `Hapus User & Data Database (${name})`,
        target: id,
        time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      };
      setAuditLogs(prev => [newAudit, ...prev]);

      alert(`🗑️ User "${name}" dan seluruh datanya di database & tools berhasil dihapus permanen.`);
      fetchAdminData();
    // Fetch pricing settings for admin
    fetch('/api/subscriptions/pricing')
      .then(res => res.json())
      .then(data => {
        if (data && data.pricing) {
          if (data.pricing.basic) {
            setAdminBasicPrice(data.pricing.basic.price || 0);
            setAdminBasicPeriod(data.pricing.basic.period || 'Gratis');
            setAdminBasicDesc(data.pricing.basic.description || 'Pencatatan keuangan personal dasar & dompet standar.');
          }
          if (data.pricing.pro) {
            setAdminProPrice(data.pricing.pro.price || 49000);
            setAdminProPeriod(data.pricing.pro.period || 'Bulan');
            setAdminProDesc(data.pricing.pro.description || 'Akses tanpa batas ke seluruh ekosistem AI & bot otomatisasi.');
          }
        }
      })
      .catch(e => console.warn('Admin fetch pricing error:', e));
    } catch (err: any) {
      alert(`❌ Terjadi kesalahan: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchDeleteUsers = async () => {
    if (selectedUserIds.length === 0) return;
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus ${selectedUserIds.length} user terpilih?\n\nSemua data transaksi, dompet, bot, dan akun di database akan dihapus permanen.`);
    if (!confirmDelete) return;

    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUserIds })
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(`❌ Gagal menghapus user: ${errData.error || 'Terjadi kesalahan di server'}`);
        return;
      }

      const count = selectedUserIds.length;
      const updatedUsers = users.filter(u => !selectedUserIds.includes(u.id));
      setUsers(updatedUsers);
      if (typeof window !== 'undefined') {
        localStorage.setItem('Mencatat_Aja_mock_users', JSON.stringify(updatedUsers));
      }
      setSelectedUserIds([]);

      // Log Audit
      const newAudit = {
        id: `aud_${Date.now()}`,
        admin: 'rickyrizkymnf123@gmail.com',
        action: `Hapus Massal (${count} Users & DB)`,
        target: `${count} users`,
        time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      };
      setAuditLogs(prev => [newAudit, ...prev]);

      alert(`🗑️ ${count} user beserta seluruh datanya di database & tools berhasil dihapus permanen.`);
      fetchAdminData();
    // Fetch pricing settings for admin
    fetch('/api/subscriptions/pricing')
      .then(res => res.json())
      .then(data => {
        if (data && data.pricing) {
          if (data.pricing.basic) {
            setAdminBasicPrice(data.pricing.basic.price || 0);
            setAdminBasicPeriod(data.pricing.basic.period || 'Gratis');
            setAdminBasicDesc(data.pricing.basic.description || 'Pencatatan keuangan personal dasar & dompet standar.');
          }
          if (data.pricing.pro) {
            setAdminProPrice(data.pricing.pro.price || 49000);
            setAdminProPeriod(data.pricing.pro.period || 'Bulan');
            setAdminProDesc(data.pricing.pro.description || 'Akses tanpa batas ke seluruh ekosistem AI & bot otomatisasi.');
          }
        }
      })
      .catch(e => console.warn('Admin fetch pricing error:', e));
    } catch (err: any) {
      alert(`❌ Terjadi kesalahan: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveUser = async (id: string, name: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, is_approved: true })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal menyetujui user');
      }

      const updatedUsers = users.map(u => {
        if (u.id === id) {
          return { ...u, is_approved: true };
        }
        return u;
      });
      setUsers(updatedUsers);
      if (typeof window !== 'undefined') {
        localStorage.setItem('Mencatat_Aja_mock_users', JSON.stringify(updatedUsers));
      }
      
      const newAudit = {
        id: `aud_${Date.now()}`,
        admin: 'rickyrizkymnf123@gmail.com',
        action: `ACC Pendaftaran User (${name})`,
        target: id,
        time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      };
      setAuditLogs(prev => [newAudit, ...prev]);

      alert(`🟢 Pendaftaran user "${name}" berhasil disetujui (ACC)!`);
      fetchAdminData();
    } catch (err: any) {
      alert(`❌ Terjadi kesalahan: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveWithProUser = async (id: string, name: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, is_approved: true, plan: 'Pro' })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal menyetujui user');
      }

      const updatedUsers = users.map(u => {
        if (u.id === id) {
          return { ...u, is_approved: true, plan: 'Pro' };
        }
        return u;
      });
      setUsers(updatedUsers);
      if (typeof window !== 'undefined') {
        localStorage.setItem('Mencatat_Aja_mock_users', JSON.stringify(updatedUsers));
      }

      const newAudit = {
        id: `aud_${Date.now()}`,
        admin: 'rickyrizkymnf123@gmail.com',
        action: `ACC + Beri Pro VIP User (${name})`,
        target: id,
        time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      };
      setAuditLogs(prev => [newAudit, ...prev]);

      alert(`👑 Pendaftaran user "${name}" berhasil disetujui (ACC) dan langsung ditingkatkan ke paket Pro VIP!`);
      fetchAdminData();
    } catch (err: any) {
      alert(`❌ Terjadi kesalahan: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Payment Manual Approval
  const handleApprovePayment = async (id: string, userPlanUpgradeId: string, userName: string) => {
    const confirmApprove = window.confirm(`Approve pembayaran Pro untuk ${userName}?`);
    if (!confirmApprove) return;

    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      setIsLoading(true);
      // 1. Update mock payments state and localStorage
      const updatedPayments = payments.map(p => {
        if (p.id === id) {
          return { ...p, status: 'approved' };
        }
        return p;
      });
      setPayments(updatedPayments);
      if (typeof window !== 'undefined') {
        localStorage.setItem('Mencatat_Aja_mock_payments', JSON.stringify(updatedPayments));
      }

      // 2. Upgrade user plan in mock users state and localStorage
      const updatedUsers = users.map(u => {
        if (u.id === userPlanUpgradeId) {
          return { ...u, plan: 'Pro' };
        }
        return u;
      });
      setUsers(updatedUsers);
      if (typeof window !== 'undefined') {
        localStorage.setItem('Mencatat_Aja_mock_users', JSON.stringify(updatedUsers));
      }

      // Log Audit Entry
      const newAudit = {
        id: `aud_${Date.now()}`,
        admin: 'superadmin@Mencatat Aja.id',
        action: `Approved Manual Payment Pro (${userName})`,
        target: userPlanUpgradeId,
        time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      };
      setAuditLogs(prev => [newAudit, ...prev]);

      alert(`🟢 Pembayaran manual untuk ${userName} berhasil disetujui! Paket Pro aktif.`);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // 1. Update Payment Status to approved
      const { error: payErr } = await supabase
        .from('payments')
        .update({ status: 'approved' })
        .eq('id', id);
      
      if (payErr) throw payErr;
      
      // 2. Upgrade User Plan to Pro
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ plan: 'Pro' })
        .eq('id', userPlanUpgradeId);

      if (profErr) throw profErr;

      // Log Audit Entry
      const newAudit = {
        id: `aud_${Date.now()}`,
        admin: 'superadmin@Mencatat Aja.id',
        action: `Approved Manual Payment Pro (${userName})`,
        target: userPlanUpgradeId,
        time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      };
      setAuditLogs(prev => [newAudit, ...prev]);

      alert(`🟢 Pembayaran manual untuk ${userName} berhasil disetujui! Paket Pro aktif.`);
      await fetchAdminData();
    // Fetch pricing settings for admin
    fetch('/api/subscriptions/pricing')
      .then(res => res.json())
      .then(data => {
        if (data && data.pricing) {
          if (data.pricing.basic) {
            setAdminBasicPrice(data.pricing.basic.price || 0);
            setAdminBasicPeriod(data.pricing.basic.period || 'Gratis');
            setAdminBasicDesc(data.pricing.basic.description || 'Pencatatan keuangan personal dasar & dompet standar.');
          }
          if (data.pricing.pro) {
            setAdminProPrice(data.pricing.pro.price || 49000);
            setAdminProPeriod(data.pricing.pro.period || 'Bulan');
            setAdminProDesc(data.pricing.pro.description || 'Akses tanpa batas ke seluruh ekosistem AI & bot otomatisasi.');
          }
        }
      })
      .catch(e => console.warn('Admin fetch pricing error:', e));
    } catch (err: any) {
      alert(`Gagal memproses approval: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Provider Mode / Toggle
  const toggleProvider = async (id: string, name: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_providers')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      alert(`🟢 Status provider ${name} berhasil diubah.`);
      await fetchAdminData();
    // Fetch pricing settings for admin
    fetch('/api/subscriptions/pricing')
      .then(res => res.json())
      .then(data => {
        if (data && data.pricing) {
          if (data.pricing.basic) {
            setAdminBasicPrice(data.pricing.basic.price || 0);
            setAdminBasicPeriod(data.pricing.basic.period || 'Gratis');
            setAdminBasicDesc(data.pricing.basic.description || 'Pencatatan keuangan personal dasar & dompet standar.');
          }
          if (data.pricing.pro) {
            setAdminProPrice(data.pricing.pro.price || 49000);
            setAdminProPeriod(data.pricing.pro.period || 'Bulan');
            setAdminProDesc(data.pricing.pro.description || 'Akses tanpa batas ke seluruh ekosistem AI & bot otomatisasi.');
          }
        }
      })
      .catch(e => console.warn('Admin fetch pricing error:', e));
    } catch (err: any) {
      alert(`Gagal mengubah status: ${err.message}`);
    }
  };

  const handleProviderModeChange = async (id: string, name: string, mode: string) => {
    try {
      const { error } = await supabase
        .from('ai_providers')
        .update({ mode: mode })
        .eq('id', id);

      if (error) throw error;

      alert(`🟢 Mode operasional ${name} diubah ke ${mode}.`);
      await fetchAdminData();
    // Fetch pricing settings for admin
    fetch('/api/subscriptions/pricing')
      .then(res => res.json())
      .then(data => {
        if (data && data.pricing) {
          if (data.pricing.basic) {
            setAdminBasicPrice(data.pricing.basic.price || 0);
            setAdminBasicPeriod(data.pricing.basic.period || 'Gratis');
            setAdminBasicDesc(data.pricing.basic.description || 'Pencatatan keuangan personal dasar & dompet standar.');
          }
          if (data.pricing.pro) {
            setAdminProPrice(data.pricing.pro.price || 49000);
            setAdminProPeriod(data.pricing.pro.period || 'Bulan');
            setAdminProDesc(data.pricing.pro.description || 'Akses tanpa batas ke seluruh ekosistem AI & bot otomatisasi.');
          }
        }
      })
      .catch(e => console.warn('Admin fetch pricing error:', e));
    } catch (err: any) {
      alert(`Gagal mengubah mode: ${err.message}`);
    }
  };

  // CENTRAL AI CONFIGURATION ACTIONS
  const loadCentralAIConfig = async () => {
    try {
      const savedLocalModel = typeof window !== 'undefined' ? localStorage.getItem('Mencatat_Aja_saved_ai_model') : null;
      const res = await fetch('/api/admin/ai-config');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load AI config');
      
      let loadedBaseUrl = data.baseUrl || 'http://100.80.46.70:20128/v1';
      if (loadedBaseUrl.includes('koboillm.com')) {
        loadedBaseUrl = 'http://100.80.46.70:20128/v1';
      }
      
      const loadedApiKey = data.apiKey || '';
      let loadedModel = data.defaultModel || 'combo';
      if (loadedModel.includes('gemini-') || loadedModel.includes('kobo') || loadedModel.includes('ag/')) {
        loadedModel = 'combo';
      }

      setAiBaseUrl(loadedBaseUrl);
      setAiApiKey(loadedApiKey);
      setDefaultAiModel(loadedModel);

      // Auto-fetch real models list from 9Router API
      try {
        const fetchRes = await fetch('/api/admin/fetch-models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseUrl: loadedBaseUrl, apiKey: loadedApiKey })
        });
        const fetchData = await fetchRes.json();
        if (fetchRes.ok && fetchData.models && Array.isArray(fetchData.models) && fetchData.models.length > 0) {
          let mergedList = [...fetchData.models];
          if (!mergedList.includes('combo')) {
            mergedList = ['combo', ...mergedList];
          }
          DEFAULT_9ROUTER_MODELS.forEach(m => {
            if (!mergedList.includes(m)) mergedList.push(m);
          });
          setModelsList(mergedList);
          setDefaultAiModel(loadedModel || 'combo');
        } else {
          setModelsList(DEFAULT_9ROUTER_MODELS);
        }
      } catch (e) {
        setModelsList(DEFAULT_9ROUTER_MODELS);
      }
    } catch (e: any) {
      console.error('Failed to load AI config:', e);
      setModelsList(DEFAULT_9ROUTER_MODELS);
    }
  };

  useEffect(() => {
    if (activeTab === 'ai_config') {
      loadCentralAIConfig();
    }

    let interval: NodeJS.Timeout | null = null;
    if (activeTab === 'ai_logs') {
      fetchAdminData();
    // Fetch pricing settings for admin
    fetch('/api/subscriptions/pricing')
      .then(res => res.json())
      .then(data => {
        if (data && data.pricing) {
          if (data.pricing.basic) {
            setAdminBasicPrice(data.pricing.basic.price || 0);
            setAdminBasicPeriod(data.pricing.basic.period || 'Gratis');
            setAdminBasicDesc(data.pricing.basic.description || 'Pencatatan keuangan personal dasar & dompet standar.');
          }
          if (data.pricing.pro) {
            setAdminProPrice(data.pricing.pro.price || 49000);
            setAdminProPeriod(data.pricing.pro.period || 'Bulan');
            setAdminProDesc(data.pricing.pro.description || 'Akses tanpa batas ke seluruh ekosistem AI & bot otomatisasi.');
          }
        }
      })
      .catch(e => console.warn('Admin fetch pricing error:', e));
      interval = setInterval(() => {
        fetchAdminData();
    // Fetch pricing settings for admin
    fetch('/api/subscriptions/pricing')
      .then(res => res.json())
      .then(data => {
        if (data && data.pricing) {
          if (data.pricing.basic) {
            setAdminBasicPrice(data.pricing.basic.price || 0);
            setAdminBasicPeriod(data.pricing.basic.period || 'Gratis');
            setAdminBasicDesc(data.pricing.basic.description || 'Pencatatan keuangan personal dasar & dompet standar.');
          }
          if (data.pricing.pro) {
            setAdminProPrice(data.pricing.pro.price || 49000);
            setAdminProPeriod(data.pricing.pro.period || 'Bulan');
            setAdminProDesc(data.pricing.pro.description || 'Akses tanpa batas ke seluruh ekosistem AI & bot otomatisasi.');
          }
        }
      })
      .catch(e => console.warn('Admin fetch pricing error:', e));
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab]);

  const handleSaveAIConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAiConfig(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('Mencatat_Aja_saved_ai_model', defaultAiModel || 'combo');
      localStorage.setItem('Mencatat_Aja_saved_ai_base_url', aiBaseUrl);
    }
    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: aiBaseUrl,
          apiKey: aiApiKey,
          defaultModel: defaultAiModel || 'combo'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save config');
      alert(`🟢 Pengaturan 9Router Universal Gateway berhasil disimpan! Model: "${defaultAiModel || 'combo'}"`);
    } catch (e: any) {
      alert(`⚠️ Gagal menyimpan pengaturan: ${e.message}`);
    } finally {
      setIsSavingAiConfig(false);
    }
  };

  const handleTestAiChat = async () => {
    if (!testPrompt.trim()) return;
    setIsTestingAi(true);
    setTestReply('');
    setTestError('');
    try {
      let reply = '';
      let testSuccess = false;
      // 1. Try server-side proxy first
      try {
        const response = await fetch('/api/ai/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: testPrompt,
            baseUrl: aiBaseUrl,
            apiKey: aiApiKey,
            model: defaultAiModel || 'combo'
          })
        });
        const data = await response.json();
        if (response.ok && data.reply) {
          reply = data.reply;
          testSuccess = true;
        } else if (!response.ok) {
          throw new Error(data.error || 'Server proxy returned error');
        }
      } catch (serverErr: any) {
        console.warn('Server proxy failed, trying direct browser-to-9Router call...', serverErr);
        // 2. Direct browser fetch fallback (useful when 9Router is on private/Tailscale IP 100.x.x.x)
        const cleanBaseUrl = aiBaseUrl.endsWith('/') ? aiBaseUrl.slice(0, -1) : aiBaseUrl;
        const targetUrl = cleanBaseUrl.endsWith('/chat/completions') ? cleanBaseUrl : `${cleanBaseUrl}/chat/completions`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (aiApiKey) headers['Authorization'] = `Bearer ${aiApiKey}`;

        const directRes = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: defaultAiModel || 'combo',
            messages: [{ role: 'user', content: testPrompt }],
            temperature: 0.1
          })
        });

        if (!directRes.ok) {
          const directErrText = await directRes.text().catch(() => '');
          throw new Error(`9Router Gateway Error (${directRes.status}): ${directErrText || serverErr.message}`);
        }

        const directData = await directRes.json();
        reply = directData.choices?.[0]?.message?.content || 'API terhubung, respon kosong.';
        testSuccess = true;
      }

      if (testSuccess) {
        setTestReply(reply);
      } else {
        throw new Error('Gagal mendapatkan respon dari 9Router Gateway.');
      }
    } catch (err: any) {
      setTestError(err.message || 'Koneksi ke 9Router gagal.');
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleFetchModels = async () => {
    if (!aiBaseUrl) {
      alert('Base URL wajib diisi untuk mengambil daftar model');
      return;
    }
    setIsFetchingModels(true);
    try {
      let data: any = null;
      // 1. Try server-side proxy
      try {
        const res = await fetch('/api/admin/fetch-models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseUrl: aiBaseUrl, apiKey: aiApiKey })
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (errServer) {
        console.warn('Server fetch-models proxy error:', errServer);
      }

      // 2. Direct client-side fetch (supports local / Tailscale mesh IPs like 100.x.x.x)
      if (!data || !data.models || data.models.length === 0) {
        try {
          const cleanUrl = aiBaseUrl.endsWith('/') ? aiBaseUrl.slice(0, -1) : aiBaseUrl;
          const target = cleanUrl.endsWith('/models') ? cleanUrl : `${cleanUrl}/models`;
          const clientRes = await fetch(target, {
            headers: aiApiKey ? { 'Authorization': `Bearer ${aiApiKey}` } : {}
          });
          if (clientRes.ok) {
            const clientJson = await clientRes.json();
            let modelIds: string[] = [];
            if (clientJson && Array.isArray(clientJson.data)) {
              modelIds = clientJson.data.map((m: any) => m.id || m.name).filter(Boolean);
            } else if (Array.isArray(clientJson)) {
              modelIds = clientJson.map((m: any) => m.id || m.name || String(m)).filter(Boolean);
            }
            if (modelIds.length > 0) {
              data = { models: modelIds };
            }
          }
        } catch (errClient) {
          console.warn('Direct client-side fetch error:', errClient);
        }
      }

      if (data && data.models && Array.isArray(data.models) && data.models.length > 0) {
        let list = [...data.models];
        if (!list.includes('combo')) {
          list = ['combo', ...list];
        }
        setModelsList(list);
        if (!list.includes(defaultAiModel)) {
          setDefaultAiModel('combo');
        }
        alert(`🟢 Berhasil memuat ${data.models.length} model asli dari 9Router!`);
        return;
      }
      throw new Error('Daftar model kosong dari provider API');
    } catch (e: any) {
      console.warn('Fetch models error:', e);
      const fallbackModels = ['combo', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gpt-4o-mini', 'deepseek-chat', 'claude-3-5-sonnet'];
      setModelsList(fallbackModels);
      setDefaultAiModel('combo');
      alert(`⚠️ ${e.message}. Menggunakan daftar model standar dengan default "combo".`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleTestPreviewBotConnection = async () => {
    if (!prevBotTokenInput.trim()) {
      setPrevBotStatusMsg('Token bot tidak boleh kosong!');
      return;
    }
    setPrevBotStatus('testing');
    setPrevBotStatusMsg('');

    try {
      const response = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: prevBotTokenInput,
          userId: previewUserId
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setPrevBotStatus('disconnected');
        setPrevBotStatusMsg(data.error || 'Gagal terhubung ke Telegram API.');
        return;
      }
      setPrevBotStatus('connected');
      localStorage.setItem('Mencatat Aja_custom_bot_token_preview', prevBotTokenInput);
      if (data.hasChatId) {
        setPrevBotStatusMsg(`🟢 Terhubung dengan bot: @${data.botUsername}! Notifikasi konfirmasi berhasil dikirim ke Telegram Anda.`);
      } else {
        const warnText = data.webhookWarning ? `\n\n${data.webhookWarning}` : '';
        setPrevBotStatusMsg(`🟢 Terhubung dengan bot: @${data.botUsername}! Buka bot Anda di Telegram dan ketik "/start" untuk menyelesaikan hubungan.${warnText}`);
      }
      
      // Save token in mock database if needed
      if (previewUserId.startsWith('usr_')) {
        localStorage.setItem(`Mencatat Aja_telegram_token_${previewUserId}`, 'TD-LINKED');
        localStorage.setItem(`Mencatat Aja_bot_token_${previewUserId}`, prevBotTokenInput);
      }
    } catch (err: any) {
      setPrevBotStatus('disconnected');
      setPrevBotStatusMsg('Gagal terhubung. Pastikan koneksi internet aktif.');
    }
  };

  // 1. Fetch user preview data
  const fetchPreviewUserData = async (usrId: string) => {
    if (!usrId) return;
    
    // Find name, plan etc from users list
    const usr = users.find(u => u.id === usrId);
    if (usr) {
      setPreviewUserName(usr.name);
      setPreviewUserPlan(usr.plan);
      setPreviewUserPhone(usr.phone);
      setPrevTelegramToken(usr.telegram_link_token || 'TD-729402');
      
      // Dynamic verification of bot connection for this specific user
      fetch(`/api/telegram/setup?userId=${usrId}`)
        .then(res => res.json())
        .then(botData => {
          if (botData.connected) {
            setPrevBotStatus('connected');
            setPrevBotStatusMsg(botData.botUsername ? `🟢 Terhubung dengan bot: @${botData.botUsername}` : '🟢 Terhubung dengan Bot Telegram');
          } else {
            setPrevBotStatus('disconnected');
            setPrevBotStatusMsg('Belum Terhubung dengan Telegram');
          }
        })
        .catch(() => {
          setPrevBotStatus('disconnected');
          setPrevBotStatusMsg('Belum Terhubung dengan Telegram');
        });
      setPrevBotTokenInput('');
    }
    
    try {
      const customToken = typeof window !== 'undefined' ? localStorage.getItem(`tatadana_bot_token_${usrId}`) || '' : '';
      const wRes = await fetch(`/api/wallets?userId=${usrId}&custom_token=${encodeURIComponent(customToken)}`);
      const cRes = await fetch(`/api/categories?userId=${usrId}`);
      const tRes = await fetch(`/api/transactions?userId=${usrId}`);
      const bRes = await fetch(`/api/budgets?userId=${usrId}`);
      
      const wData = await wRes.json();
      const cData = await cRes.json();
      const tData = await tRes.json();
      const bData = await bRes.json();
      
      const walletsList = wData.error ? [] : wData;
      const categoriesList = cData.error ? [] : cData;
      const transactionsList = tData.error ? [] : tData;
      const budgetsList = bData.error ? [] : bData;

      if (walletsList.length > 0) {
        setPreviewWallets(walletsList);
        setPreviewCategories(categoriesList.length > 0 ? categoriesList : [
          { id: 'c1', name: 'Makanan', emoji: '🍜', color: '#FF8A00', type: 'expense' },
          { id: 'c2', name: 'Transport', emoji: '🚗', color: '#00A3FF', type: 'expense' },
          { id: 'c6', name: 'Gaji', emoji: '💼', color: '#00E047', type: 'income' },
          { id: 'c7', name: 'Lainnya', emoji: '📦', color: '#888888', type: 'expense' }
        ]);
        setPreviewTransactions(transactionsList);
        setPreviewBudgets(budgetsList);
      } else {
        // Fallback to hardcoded mock datasets if no data exists in local server JSON files
        if (usrId === 'usr_budi') {
          setPreviewWallets([
            { id: 'wb1', name: 'BCA (Gaji)', balance: 14250000, is_default: true },
            { id: 'wb2', name: 'Dompet Cash', balance: 750000, is_default: false },
            { id: 'wb3', name: 'Gopay', balance: 1500000, is_default: false }
          ]);
          setPreviewCategories([
            { id: 'c1', name: 'Makanan', emoji: '🍜', color: '#FF8A00', type: 'expense' },
            { id: 'c2', name: 'Transport', emoji: '🚗', color: '#00A3FF', type: 'expense' },
            { id: 'c3', name: 'Hiburan', emoji: '🎮', color: '#9E00FF', type: 'expense' },
            { id: 'c4', name: 'Tagihan', emoji: '🏠', color: '#FF005C', type: 'expense' },
            { id: 'c5', name: 'Belanja', emoji: '👕', color: '#FFB800', type: 'expense' },
            { id: 'c6', name: 'Gaji', emoji: '💼', color: '#00E047', type: 'income' }
          ]);
          setPreviewBudgets([
            { id: 'bb1', category_id: 'c1', monthly_limit: 2000000, current_spent: 850000 },
            { id: 'bb2', category_id: 'c2', monthly_limit: 1000000, current_spent: 450000 }
          ]);
          setPreviewTransactions([
            { id: 'tx_b1', amount: 850000, type: 'expense', description: 'Belanja Bulanan Supermarket', transaction_date: new Date().toISOString(), wallet_id: 'wb1', category_id: 'c5', source: 'web' },
            { id: 'tx_b2', amount: 150000, type: 'expense', description: 'Makan Steak Premium', transaction_date: new Date().toISOString(), wallet_id: 'wb1', category_id: 'c1', source: 'telegram' },
            { id: 'tx_b3', amount: 15000000, type: 'income', description: 'Transfer Gaji Bulanan', transaction_date: new Date(Date.now() - 86400000).toISOString(), wallet_id: 'wb1', category_id: 'c6', source: 'web' }
          ]);
        } else if (usrId === 'usr_ani') {
          setPreviewWallets([
            { id: 'wa1', name: 'Cash', balance: 350000, is_default: true },
            { id: 'wa2', name: 'ShopeePay', balance: 120000, is_default: false }
          ]);
          setPreviewCategories([
            { id: 'c1', name: 'Makanan', emoji: '🍜', color: '#FF8A00', type: 'expense' },
            { id: 'c2', name: 'Transport', emoji: '🚗', color: '#00A3FF', type: 'expense' },
            { id: 'c6', name: 'Gaji', emoji: '💼', color: '#00E047', type: 'income' }
          ]);
          setPreviewBudgets([]);
          setPreviewTransactions([
            { id: 'tx_a1', amount: 25000, type: 'expense', description: 'Beli Kopi Susu', transaction_date: new Date().toISOString(), wallet_id: 'wa1', category_id: 'c1', source: 'telegram' },
            { id: 'tx_a2', amount: 500000, type: 'income', description: 'Uang Saku Mingguan', transaction_date: new Date(Date.now() - 172800000).toISOString(), wallet_id: 'wa1', category_id: 'c6', source: 'web' }
          ]);
        } else {
          setPreviewWallets([]);
          setPreviewCategories([
            { id: 'c1', name: 'Makanan', emoji: '🍜', color: '#FF8A00', type: 'expense' },
            { id: 'c2', name: 'Transport', emoji: '🚗', color: '#00A3FF', type: 'expense' },
            { id: 'c6', name: 'Gaji', emoji: '💼', color: '#00E047', type: 'income' }
          ]);
          setPreviewBudgets([]);
          setPreviewTransactions([]);
        }
      }
    } catch (err) {
      console.error('Error fetching preview user data:', err);
    }
  };

  // Sync preview data when active tab or preview user changes
  useEffect(() => {
    if (activeTab === 'user_preview') {
      if (!previewUserId && users.length > 0) {
        setPreviewUserId(users[0].id);
        fetchPreviewUserData(users[0].id);
      } else if (previewUserId) {
        fetchPreviewUserData(previewUserId);
      }
    } else if (
      activeTab === 'admin_beranda' ||
      activeTab === 'admin_transaksi' ||
      activeTab === 'admin_laporan' ||
      activeTab === 'admin_budget' ||
      activeTab === 'admin_wallet' ||
      activeTab === 'admin_settings'
    ) {
      setPreviewUserId(adminUserId);
      fetchPreviewUserData(adminUserId);
      
      // Auto map preview tab to render the exact matching content
      if (activeTab === 'admin_beranda') setPreviewUserTab('beranda');
      if (activeTab === 'admin_transaksi') setPreviewUserTab('transaksi');
      if (activeTab === 'admin_laporan') setPreviewUserTab('laporan');
      if (activeTab === 'admin_budget') setPreviewUserTab('budget');
      if (activeTab === 'admin_wallet') setPreviewUserTab('wallet');
      if (activeTab === 'admin_settings') setPreviewUserTab('settings');
    }
  }, [activeTab, previewUserId, adminUserId, users]);

  // 2. Add wallet in preview
  const handleAddPreviewWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prevNewWalletName || !prevNewWalletBalance) {
      alert('Nama dompet dan saldo awal wajib diisi');
      return;
    }

    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      const newMockWallet = {
        id: 'w_' + Date.now(),
        name: prevNewWalletName,
        balance: Number(prevNewWalletBalance) || 0.00,
        is_default: previewWallets.length === 0 ? true : prevNewWalletDefault
      };
      let updatedWallets = [...previewWallets];
      if (newMockWallet.is_default) {
        updatedWallets = previewWallets.map(w => ({ ...w, is_default: false }));
      }
      updatedWallets.push(newMockWallet);
      localStorage.setItem('Mencatat Aja_mock_wallets', JSON.stringify(updatedWallets));
      setPreviewWallets(updatedWallets);
      alert('🟢 Dompet baru berhasil didaftarkan di Simulasi Lokal!');
    } else {
      try {
        const response = await fetch('/api/wallets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: previewUserId,
            name: prevNewWalletName,
            balance: Number(prevNewWalletBalance),
            isDefault: prevNewWalletDefault
          })
        });
        if (!response.ok) throw new Error('Gagal menambahkan wallet');
        alert('🟢 Dompet baru berhasil didaftarkan di Supabase!');
        await fetchPreviewUserData(previewUserId);
      } catch (err: any) {
        alert(err.message);
      }
    }
    setPrevNewWalletName('');
    setPrevNewWalletBalance('');
    setPrevNewWalletDefault(false);
    setShowPrevAddWallet(false);
  };

  const handleSavePreviewWalletEdit = async (walletId: string) => {
    if (!editingWalletName.trim() || editingWalletBalance === '') {
      alert('Nama dan saldo dompet tidak boleh kosong');
      return;
    }
    try {
      const response = await fetch('/api/wallets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: previewUserId,
          walletId: walletId,
          name: editingWalletName,
          balance: Number(editingWalletBalance)
        })
      });
      if (!response.ok) {
        throw new Error('Failed to update wallet');
      }
      setEditingWalletId(null);
      await fetchPreviewUserData(previewUserId);
      alert('🟢 Dompet berhasil diperbarui!');
    } catch (err: any) {
      alert(`❌ Gagal memperbarui dompet: ${err.message}`);
    }
  };

  const handleDeletePreviewWallet = async (walletId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus dompet ini? Semua riwayat saldo terkait akan hilang.')) {
      return;
    }
    try {
      const response = await fetch(`/api/wallets?userId=${previewUserId}&walletId=${walletId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete wallet');
      }
      setEditingWalletId(null);
      await fetchPreviewUserData(previewUserId);
      alert('🟢 Dompet berhasil dihapus!');
    } catch (err: any) {
      alert(`❌ Gagal menghapus dompet: ${err.message}`);
    }
  };

  const handleUpdatePreviewBudget = async (categoryId: string, limit: number) => {
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: previewUserId,
          categoryId: categoryId,
          monthlyLimit: limit
        })
      });
      if (!response.ok) {
        throw new Error('Failed to update budget');
      }
      await fetchPreviewUserData(previewUserId);
    } catch (e) {
      console.error('Failed to update budget:', e);
    }
  };

  // 3. Add manual transaction in preview
  const handleAddPreviewTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prevTxAmount || !prevTxWalletId || !prevTxDescription) {
      alert('Isi semua field wajib transaksi');
      return;
    }

    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');
    const amt = Number(prevTxAmount);

    if (isPlaceholder) {
      let updatedWallets = [...previewWallets];
      if (prevTxType === 'expense') {
        updatedWallets = previewWallets.map(w => w.id === prevTxWalletId ? { ...w, balance: Number(w.balance) - amt } : w);
      } else if (prevTxType === 'income') {
        updatedWallets = previewWallets.map(w => w.id === prevTxWalletId ? { ...w, balance: Number(w.balance) + amt } : w);
      } else if (prevTxType === 'transfer' && prevTxTransferToWalletId) {
        updatedWallets = previewWallets.map(w => {
          if (w.id === prevTxWalletId) return { ...w, balance: Number(w.balance) - amt };
          if (w.id === prevTxTransferToWalletId) return { ...w, balance: Number(w.balance) + amt };
          return w;
        });
      }
      const newMockTx = {
        id: 'tx_' + Date.now(),
        amount: amt,
        type: prevTxType,
        description: prevTxDescription,
        transaction_date: new Date().toISOString(),
        wallet_id: prevTxWalletId,
        category_id: prevTxCategoryId || null,
        source: 'web'
      };
      const updatedTxs = [newMockTx, ...previewTransactions];
      localStorage.setItem('Mencatat Aja_mock_wallets', JSON.stringify(updatedWallets));
      localStorage.setItem('Mencatat Aja_mock_transactions', JSON.stringify(updatedTxs));
      setPreviewWallets(updatedWallets);
      setPreviewTransactions(updatedTxs);
      alert('🟢 Transaksi manual berhasil disimpan (Simulasi Lokal)!');
    } else {
      try {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: previewUserId,
            walletId: prevTxWalletId,
            categoryId: prevTxCategoryId || null,
            amount: amt,
            type: prevTxType,
            description: prevTxDescription,
            transferToWalletId: prevTxTransferToWalletId || null
          })
        });
        if (!response.ok) throw new Error('Gagal menyimpan transaksi');
        alert('🟢 Transaksi manual berhasil disimpan!');
        await fetchPreviewUserData(previewUserId);
      } catch (err: any) {
        alert(err.message);
      }
    }
    setPrevTxAmount('');
    setPrevTxDescription('');
    setPreviewUserTab('beranda');
  };

  // 4. Add transaction with AI in preview
  const handleAddPreviewTxWithAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prevAiText.trim()) return;
    setPrevIsParsingAi(true);

    try {
      const parseRes = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: prevAiText,
          categories: previewCategories,
          wallets: previewWallets.map(w => w.name)
        })
      });
      const parsed = await parseRes.json();
      if (!parseRes.ok) throw new Error(parsed.error || 'Gagal parsing AI');

      const isPlaceholder = !supabaseUrl || 
        supabaseUrl.includes('your-supabase-project-id') || 
        supabaseUrl.includes('placeholder-project');
      const amt = parsed.amount;

      let matchedWallet = previewWallets.find(w => prevAiText.toLowerCase().includes(w.name.toLowerCase())) || previewWallets[0];
      let matchedCategory = previewCategories.find(c => c.name.toLowerCase() === (parsed.category || '').toLowerCase()) || previewCategories[0];
      let matchedDestWallet = previewWallets.find(w => w.name.toLowerCase() === (parsed.transfer_to_wallet || '').toLowerCase());

      if (isPlaceholder) {
        let updatedWallets = [...previewWallets];
        if (parsed.type === 'expense') {
          updatedWallets = previewWallets.map(w => w.id === matchedWallet.id ? { ...w, balance: Number(w.balance) - amt } : w);
        } else if (parsed.type === 'income') {
          updatedWallets = previewWallets.map(w => w.id === matchedWallet.id ? { ...w, balance: Number(w.balance) + amt } : w);
        } else if (parsed.type === 'transfer' && matchedDestWallet) {
          updatedWallets = previewWallets.map(w => {
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
          source: 'telegram'
        };
        const updatedTxs = [newMockTx, ...previewTransactions];
        localStorage.setItem('Mencatat Aja_mock_wallets', JSON.stringify(updatedWallets));
        localStorage.setItem('Mencatat Aja_mock_transactions', JSON.stringify(updatedTxs));
        setPreviewWallets(updatedWallets);
        setPreviewTransactions(updatedTxs);
        alert(`🤖 AI Berhasil Mencatat (Simulasi Lokal):\n\n• Jenis: ${parsed.type}\n• Nominal: Rp ${amt.toLocaleString('id-ID')}\n• Keterangan: "${parsed.description}"`);
      } else {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: previewUserId,
            walletId: matchedWallet.id,
            categoryId: matchedCategory?.id || null,
            amount: amt,
            type: parsed.type,
            description: parsed.description,
            transferToWalletId: matchedDestWallet?.id || null
          })
        });
        if (!response.ok) throw new Error('Gagal menyimpan transaksi AI');
        alert(`🤖 AI Berhasil Mencatat:\n\n• Nominal: Rp ${amt.toLocaleString('id-ID')}\n• Keterangan: "${parsed.description}"`);
        await fetchPreviewUserData(previewUserId);
      }
      setPrevAiText('');
      setPreviewUserTab('beranda');
    } catch (err: any) {
      alert(`⚠️ Gagal mencatat dengan AI: ${err.message}`);
    } finally {
      setPrevIsParsingAi(false);
    }
  };

  const handleUploadPreviewReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const defaultW = previewWallets.find(w => w.is_default) || previewWallets[0] || { id: 'w_bca_usr_budi', name: 'BCA' };

        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: previewUserId,
            walletId: defaultW.id,
            categoryId: selected.categoryId,
            amount: selected.amount,
            type: 'expense',
            description: selected.description,
            source: 'web'
          })
        });

        if (!response.ok) {
          throw new Error('Gagal menyimpan transaksi struk');
        }

        await fetchPreviewUserData(previewUserId);
        alert(`🟢 AI Vision Berhasil!\n\nStruk dibaca:\n• Toko/Kegiatan: ${selected.description}\n• Nominal: Rp ${selected.amount.toLocaleString('id-ID')}\n• Kategori: ${selected.categoryEmoji} ${selected.categoryName}\n• Dompet: 👛 ${defaultW.name}`);
        setPreviewUserTab('beranda');
      } catch (err: any) {
        alert(`❌ Gagal membaca struk: ${err.message}`);
      } finally {
        setIsParsingReceipt(false);
        if (e.target) e.target.value = '';
      }
    }, 1800);
  };

  const handleTopUpPreviewCredits = (amount: number, price: number) => {
    setIsToppingUp(true);
    setTimeout(() => {
      setPreviewUserCredits(prev => prev + amount);
      setIsToppingUp(false);
      alert(`🟢 Top Up Berhasil!\n\nAnda telah membeli ${amount} Kredit seharga Rp ${price.toLocaleString('id-ID')} via Midtrans Qris untuk simulasi user.\nKredit Anda sekarang: ${previewUserCredits + amount} Kredit.`);
    }, 1500);
  };

  // Calculations for summary stats inside preview
  const previewTotalBalance = previewWallets.reduce((s, w) => s + Number(w.balance), 0);
  const previewExpenseTxs = previewTransactions.filter(t => t.type === 'expense');
  const previewIncomeTxs = previewTransactions.filter(t => t.type === 'income');
  const previewTotalExpense = previewExpenseTxs.reduce((s, t) => s + Number(t.amount), 0);
  const previewTotalIncome = previewIncomeTxs.reduce((s, t) => s + Number(t.amount), 0);
  const previewTotalBudgetLimit = previewBudgets.reduce((s, b) => s + Number(b.monthly_limit), 0);
  const previewTotalBudgetSpent = previewBudgets.reduce((s, b) => s + Number(b.current_spent), 0);
  const previewTotalBudgetRemaining = previewTotalBudgetLimit - previewTotalBudgetSpent;

  // Chart line points generator helper for preview
  let prevPoints = [180, 180, 180, 180];
  if (previewExpenseTxs.length > 0) {
    const sorted = [...previewExpenseTxs].sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
    const minTime = new Date(sorted[0].transaction_date).getTime();
    const maxTime = new Date(sorted[sorted.length - 1].transaction_date).getTime();
    const range = maxTime - minTime || 1;
    const bucketSum = [0, 0, 0, 0];
    sorted.forEach(e => {
      const t = new Date(e.transaction_date).getTime();
      const pct = (t - minTime) / range;
      let idx = Math.min(Math.floor(pct * 4), 3);
      bucketSum[idx] += Number(e.amount);
    });
    const maxVal = Math.max(...bucketSum) || 10000;
    prevPoints = bucketSum.map(val => 180 - (val / maxVal) * 140);
  }

  // Chart pie slices generator helper for preview
  const prevCategoryExpenses: { [key: string]: { amount: number, emoji: string, color: string } } = {};
  previewExpenseTxs.forEach(t => {
    const cat = previewCategories.find(c => c.id === t.category_id);
    const catName = cat?.name || 'Lainnya';
    const emoji = cat?.emoji || '💰';
    const color = cat?.color || '#999999';
    if (!prevCategoryExpenses[catName]) {
      prevCategoryExpenses[catName] = { amount: 0, emoji, color };
    }
    prevCategoryExpenses[catName].amount += Number(t.amount);
  });
  const prevTotalExpenseAmount = Object.values(prevCategoryExpenses).reduce((sum, item) => sum + item.amount, 0);
  const prevPieSlices: any[] = [];
  let prevCurrentOffset = 0;
  Object.entries(prevCategoryExpenses).forEach(([name, data]) => {
    const percentage = prevTotalExpenseAmount > 0 ? (data.amount / prevTotalExpenseAmount) * 100 : 0;
    prevPieSlices.push({
      name,
      emoji: data.emoji,
      color: data.color,
      amount: data.amount,
      percentage,
      dashArray: `${percentage.toFixed(1)} ${(100 - percentage).toFixed(1)}`,
      dashOffset: (-prevCurrentOffset).toString()
    });
    prevCurrentOffset += percentage;
  });

  return (
    <div className="dashboard-container">
      {/* Scoped CSS styling */}
      {/* Scoped Apple Liquid Glass & shadcn UI System Styling */}
      <style jsx global>{`
        /* Dark Obsidian Glass Containers */
        .glass-panel {
          background: rgba(13, 20, 38, 0.75) !important;
          backdrop-filter: blur(24px) saturate(200%) !important;
          -webkit-backdrop-filter: blur(24px) saturate(200%) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 24px !important;
          box-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .glass-panel:hover {
          background: rgba(18, 28, 52, 0.85) !important;
          border-color: rgba(16, 185, 129, 0.3) !important;
          box-shadow: 0 25px 60px -12px rgba(16, 185, 129, 0.15) !important;
          transform: translateY(-2px) scale(1.003) !important;
        }

        .admin-sidebar,
        .sidebar.admin-nav {
          background: rgba(10, 15, 30, 0.94) !important;
          backdrop-filter: blur(28px) saturate(200%) !important;
          -webkit-backdrop-filter: blur(28px) saturate(200%) !important;
          border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 6px 0 35px rgba(0, 0, 0, 0.5) !important;
        }

        .admin-nav .menu-item {
          color: #94a3b8 !important;
          border-radius: 14px !important;
          margin-bottom: 4px !important;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .admin-nav .menu-item:hover {
          background: rgba(16, 185, 129, 0.12) !important;
          color: #34d399 !important;
        }

        .admin-nav .menu-item.active {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(16, 185, 129, 0.08) 100%) !important;
          color: #10b981 !important;
          border: 1px solid rgba(16, 185, 129, 0.35) !important;
          box-shadow: 0 4px 14px -2px rgba(16, 185, 129, 0.25) !important;
        }

        .admin-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
          padding-bottom: 16px !important;
          margin-bottom: 28px !important;
        }

        /* Dark shadcn Table Design */
        .shadcn-table-wrapper {
          border-radius: 20px !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          -webkit-overflow-scrolling: touch !important;
          touch-action: pan-x pan-y !important;
          background: rgba(13, 20, 38, 0.75) !important;
          backdrop-filter: blur(20px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 16px 40px -15px rgba(0, 0, 0, 0.6) !important;
        }

        .shadcn-table {
          width: 100% !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
        }

        .shadcn-table th {
          background: rgba(10, 15, 30, 0.9) !important;
          backdrop-filter: blur(10px) !important;
          font-size: 0.72rem !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.8px !important;
          color: #94a3b8 !important;
          padding: 14px 18px !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
          text-align: left !important;
        }

        .shadcn-table td {
          padding: 16px 18px !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
          vertical-align: middle !important;
          font-size: 0.88rem !important;
          color: #e2e8f0 !important;
          transition: background-color 0.2s ease !important;
        }

        .shadcn-table tr:last-child td {
          border-bottom: none !important;
        }

        .shadcn-table tr:hover td {
          background: rgba(16, 185, 129, 0.05) !important;
        }

        /* Proof Thumbnail Apple Glass */
        .payment-proof-thumbnail-wrapper {
          position: relative !important;
          display: inline-block !important;
          border-radius: 14px !important;
          padding: 2px !important;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.04)) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          cursor: pointer !important;
        }

        .payment-proof-thumbnail-wrapper:hover {
          transform: translateY(-2px) scale(1.05) !important;
          border-color: rgba(16, 185, 129, 0.4) !important;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3) !important;
        }

        .payment-proof-thumbnail {
          width: 54px !important;
          height: 54px !important;
          border-radius: 12px !important;
          object-fit: cover !important;
          display: block !important;
        }

        /* Status Pills */
        .shadcn-badge {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 4px 12px !important;
          border-radius: 9999px !important;
          font-size: 0.78rem !important;
          font-weight: 600 !important;
          letter-spacing: 0.2px !important;
        }

        .shadcn-badge-approved {
          background: rgba(16, 185, 129, 0.18) !important;
          color: #34d399 !important;
          border: 1px solid rgba(16, 185, 129, 0.35) !important;
        }

        .shadcn-badge-pending {
          background: rgba(245, 158, 11, 0.18) !important;
          color: #fbbf24 !important;
          border: 1px solid rgba(245, 158, 11, 0.35) !important;
        }

        .pulse-dot {
          width: 7px !important;
          height: 7px !important;
          border-radius: 50% !important;
          display: inline-block !important;
        }

        .pulse-dot.green {
          background: #10b981 !important;
          box-shadow: 0 0 8px #10b981 !important;
        }

        .pulse-dot.amber {
          background: #f59e0b !important;
          box-shadow: 0 0 8px #f59e0b !important;
        }

        /* Buttons */
        .btn-liquid-emerald {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
          color: #ffffff !important;
          font-weight: 600 !important;
          border: none !important;
          border-radius: 12px !important;
          padding: 8px 16px !important;
          font-size: 0.82rem !important;
          box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
          cursor: pointer !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
        }

        .btn-liquid-emerald:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 24px 0 rgba(16, 185, 129, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.5) !important;
        }

        .btn-liquid-rose {
          background: rgba(239, 68, 68, 0.12) !important;
          color: #f87171 !important;
          font-weight: 600 !important;
          border: 1px solid rgba(239, 68, 68, 0.3) !important;
          border-radius: 12px !important;
          padding: 8px 16px !important;
          font-size: 0.82rem !important;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
          cursor: pointer !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
        }

        .btn-liquid-rose:hover {
          background: rgba(239, 68, 68, 0.22) !important;
          border-color: rgba(239, 68, 68, 0.5) !important;
          transform: translateY(-2px) !important;
        }

        /* Glass Modal Lightbox */
        .glass-modal-backdrop {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          background: rgba(0, 0, 0, 0.75) !important;
          backdrop-filter: blur(16px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
          z-index: 9999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 20px !important;
        }

        .glass-modal-content {
          background: rgba(13, 20, 38, 0.95) !important;
          backdrop-filter: blur(28px) saturate(200%) !important;
          -webkit-backdrop-filter: blur(28px) saturate(200%) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 30px 70px -15px rgba(0, 0, 0, 0.7) !important;
          border-radius: 28px !important;
          max-width: 500px !important;
          width: 100% !important;
          padding: 28px !important;
          position: relative !important;
          color: #f8fafc !important;
          animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      {/* Mobile Top Bar */}
      <div className="mobile-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.3px' }}>
            Mencatat<span style={{ color: '#10b981' }}>Aja</span>
          </span>
          <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '99px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontWeight: '800', textTransform: 'uppercase' }}>
            Admin
          </span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#f8fafc', padding: '4px' }}>
          ☰
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ADMIN SIDEBAR */}
      <aside className={`sidebar admin-nav animate-fade-in ${sidebarOpen ? 'active' : ''}`} style={{ width: '270px', padding: '24px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          
          <div className="sidebar-logo" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
                Mencatat<span style={{ color: '#10b981' }}>Aja</span>
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Superadmin Portal</span>
            </div>
          </div>




          <div style={{ padding: '0 8px', marginBottom: '10px', fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
            Tata Kelola Sistem
          </div>

          <ul className="sidebar-menu" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: 0, margin: 0, listStyle: 'none' }}>
            
            <li onClick={() => { setActiveTab('users'); setSidebarOpen(false); }} className={`menu-item ${activeTab === 'users' ? 'active' : ''}`} style={{ padding: '10px 14px', fontSize: '0.88rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>👥</span> <span>Kelola Pengguna</span>
            </li>
            <li onClick={() => { setActiveTab('user_approvals'); setSidebarOpen(false); }} className={`menu-item ${activeTab === 'user_approvals' ? 'active' : ''}`} style={{ padding: '10px 14px', fontSize: '0.88rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>⏳</span> <span>Approval Pengguna</span>
              </div>
              {users.filter(u => u.is_approved === false).length > 0 && (
                <span style={{ background: '#f59e0b', color: '#04060d', fontSize: '0.72rem', fontWeight: '800', padding: '2px 8px', borderRadius: '99px', boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)' }}>
                  {users.filter(u => u.is_approved === false).length}
                </span>
              )}
            </li>
            <li onClick={() => { setActiveTab('subscriptions'); setSidebarOpen(false); fetchSubscriptions(); }} className={`menu-item ${activeTab === 'subscriptions' ? 'active' : ''}`} style={{ padding: '10px 14px', fontSize: '0.88rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>💳</span> <span>Kelola Langganan</span>
            </li>
            <li onClick={() => { setActiveTab('payments'); setSidebarOpen(false); }} className={`menu-item ${activeTab === 'payments' ? 'active' : ''}`} style={{ padding: '10px 14px', fontSize: '0.88rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>💰</span> <span>Approval Pembayaran</span>
            </li>
            <li onClick={() => { setActiveTab('tutorials'); setSidebarOpen(false); fetchTutorials(); }} className={`menu-item ${activeTab === 'tutorials' ? 'active' : ''}`} style={{ padding: '10px 14px', fontSize: '0.88rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🎬</span> <span>Video Tutorial</span>
            </li>
            <li onClick={() => { setActiveTab('ai_config'); setSidebarOpen(false); }} className={`menu-item ${activeTab === 'ai_config' ? 'active' : ''}`} style={{ padding: '10px 14px', fontSize: '0.88rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🤖</span> <span>AI Configuration</span>
            </li>
            <li onClick={() => { setActiveTab('ai_logs'); setSidebarOpen(false); }} className={`menu-item ${activeTab === 'ai_logs' ? 'active' : ''}`} style={{ padding: '10px 14px', fontSize: '0.88rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>📊</span> <span>Log & Biaya AI</span>
            </li>
            <li onClick={() => { setActiveTab('audit_logs'); setSidebarOpen(false); }} className={`menu-item ${activeTab === 'audit_logs' ? 'active' : ''}`} style={{ padding: '10px 14px', fontSize: '0.88rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🛡️</span> <span>Log Audit Keamanan</span>
            </li>
          </ul>
        </div>

        <div className="sidebar-profile" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="profile-avatar" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', width: '38px', height: '38px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.85rem' }}>SA</div>
            <div className="profile-details" style={{ flex: 1 }}>
              <h5 style={{ color: 'var(--text-main)', margin: 0, fontSize: '0.88rem', fontWeight: '700' }}>Super Admin</h5>
              <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#059669', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '99px', display: 'inline-block', marginTop: '2px' }}>Owner</span>
            </div>
          </div>
          <Link href="/" className="btn" style={{ textDecoration: 'none', padding: '8px 14px', fontSize: '0.82rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '700' }}>
            <span>🚪</span> <span>Log Out</span>
          </Link>
        </div>
      </aside>

      {/* ADMIN MAIN DASHBOARD PAGE */}
      <main className="dashboard-main animate-fade-in">
        
        {/* LOADING SKELETON */}
        {isLoading && (
          <div className="loading-skeleton" style={{ marginBottom: '20px' }}>
            <div className="skeleton-block" style={{ height: '50px' }}></div>
          </div>
        )}

        {/* QUICK ADMIN METRICS STAT CARDS */}
        <div className="stats-summary" style={{ marginBottom: '24px' }}>
          <div style={{ background: 'rgba(13, 20, 38, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '20px', padding: '18px 22px', boxShadow: '0 10px 30px -10px rgba(16, 185, 129, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Users</span>
              <span style={{ fontSize: '1.2rem' }}>👥</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>{users.length} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Pengguna</span></div>
            <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
              {users.filter(u => u.plan === 'Pro').length} User Paket Pro Active
            </div>
          </div>

          <div style={{ background: 'rgba(13, 20, 38, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '20px', padding: '18px 22px', boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Transaksi</span>
              <span style={{ fontSize: '1.2rem' }}>💳</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
              {users.reduce((acc, u) => acc + (u.txCount || 0), 0)} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Catatan</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }}></span>
              Web & Telegram Bot Integrated
            </div>
          </div>

          <div style={{ background: 'rgba(13, 20, 38, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '20px', padding: '18px 22px', boxShadow: '0 10px 30px -10px rgba(245, 158, 11, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Approvals</span>
              <span style={{ fontSize: '1.2rem' }}>⏳</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: payments.filter(p => p.status === 'pending').length > 0 ? '#d97706' : 'var(--text-main)', letterSpacing: '-0.5px' }}>
              {payments.filter(p => p.status === 'pending').length} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Menunggu</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
              {users.filter(u => u.is_approved === false).length} Pendaftaran Pending ACC
            </div>
          </div>

          <div style={{ background: 'rgba(13, 20, 38, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(147, 51, 234, 0.3)', borderRadius: '20px', padding: '18px 22px', boxShadow: '0 10px 30px -10px rgba(147, 51, 234, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Engine Central</span>
              <span style={{ fontSize: '1.2rem' }}>🤖</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#c084fc', letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {defaultAiModel}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
              9Router Gateway Active (combo)
            </div>
          </div>
        </div>



        {/* 2. KELOLA USERS & IMPERSONATION */}
        {activeTab === 'users' && (
          <>
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2>Kelola Pengguna Sistem</h2>
                <p style={{ color: 'var(--text-muted)' }}>Melihat status Telegram, plan langganan, dan masuk sebagai versi user.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {selectedUserIds.length > 0 && (
                  <button 
                    onClick={handleBatchDeleteUsers} 
                    className="btn btn-outline" 
                    style={{ color: 'var(--error)', borderColor: 'var(--error)', padding: '8px 16px', fontWeight: '700' }}
                  >
                    🗑️ Hapus Terpilih ({selectedUserIds.length})
                  </button>
                )}
                <button 
                  onClick={() => setShowAddUserModal(true)} 
                  className="btn" 
                  style={{ backgroundColor: 'var(--primary)', color: '#ffffff', padding: '8px 16px', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                  ➕ Tambah User Baru
                </button>
              </div>
            </div>

            {/* Add User Modal */}
            {showAddUserModal && (
              <div className="card animate-slide-up" style={{ marginBottom: '24px', padding: '24px', border: '1px solid var(--primary)' }}>
                <h3 style={{ marginBottom: '16px' }}>➕ Tambah User Baru</h3>
                <div className="grid-2" style={{ gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Nama Lengkap</label>
                    <input 
                      type="text" 
                      placeholder="Masukkan nama user..."
                      value={newUserNameInput}
                      onChange={e => setNewUserNameInput(e.target.value)}
                      style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Email User</label>
                    <input 
                      type="email" 
                      placeholder="Contoh: user@gmail.com"
                      value={newUserEmailInput}
                      onChange={e => setNewUserEmailInput(e.target.value)}
                      style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>No. Handphone</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: 081234567890"
                      value={newUserPhoneInput}
                      onChange={e => setNewUserPhoneInput(e.target.value)}
                      style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Plan Langganan</label>
                    <select 
                      value={newUserPlanInput}
                      onChange={e => setNewUserPlanInput(e.target.value)}
                      style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem' }}
                    >
                      <option value="Basic">Basic</option>
                      <option value="Pro">Pro</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Status Approval (ACC)</label>
                    <select 
                      value={newUserApproveInput ? "true" : "false"}
                      onChange={e => setNewUserApproveInput(e.target.value === "true")}
                      style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem' }}
                    >
                      <option value="true">Langsung Aktif (ACC)</option>
                      <option value="false">Menunggu Persetujuan (Pending)</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button 
                    onClick={() => setShowAddUserModal(false)} 
                    className="btn btn-outline" 
                    style={{ padding: '8px 16px' }}
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleAddUser} 
                    className="btn" 
                    style={{ backgroundColor: 'var(--primary)', color: '#ffffff', padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
                  >
                    Simpan User
                  </button>
                </div>
              </div>
            )}

            {/* Filter & Search Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setUserApprovalFilter('all')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    border: '1px solid',
                    borderColor: userApprovalFilter === 'all' ? '#10b981' : 'rgba(255, 255, 255, 0.12)',
                    background: userApprovalFilter === 'all' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: userApprovalFilter === 'all' ? '#10b981' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  Semua ({users.length})
                </button>
                <button
                  onClick={() => setUserApprovalFilter('pending')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    border: '1px solid',
                    borderColor: userApprovalFilter === 'pending' ? '#f59e0b' : 'rgba(255, 255, 255, 0.12)',
                    background: userApprovalFilter === 'pending' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: userApprovalFilter === 'pending' ? '#fbbf24' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>⚠️ Menunggu ACC</span>
                  <span style={{ background: '#f59e0b', color: '#000000', fontSize: '0.72rem', fontWeight: '800', padding: '1px 6px', borderRadius: '99px' }}>
                    {users.filter(u => u.is_approved === false).length}
                  </span>
                </button>
                <button
                  onClick={() => setUserApprovalFilter('approved')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    border: '1px solid',
                    borderColor: userApprovalFilter === 'approved' ? '#3b82f6' : 'rgba(255, 255, 255, 0.12)',
                    background: userApprovalFilter === 'approved' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: userApprovalFilter === 'approved' ? '#60a5fa' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  🟢 Aktif Ter-ACC ({users.filter(u => u.is_approved !== false).length})
                </button>
              </div>

              <div style={{ position: 'relative', minWidth: '240px' }}>
                <input
                  type="text"
                  placeholder="Cari nama, email, no HP..."
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 14px 9px 36px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '0.85rem' }}>🔍</span>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="desktop-table-view tx-table-container animate-slide-up">
              <table className="tx-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox"
                        checked={selectedUserIds.length === users.length && users.length > 0}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedUserIds(users.map(u => u.id));
                          } else {
                            setSelectedUserIds([]);
                          }
                        }}
                      />
                    </th>
                    <th>Nama User</th>
                    <th>Email</th>
                    <th>No. HP</th>
                    <th>Plan</th>
                    <th>Status ACC</th>
                    <th>Koneksi Telegram</th>
                    <th>Jml Transaksi</th>
                    <th>Aksi Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(u => {
                      const matchQuery = !userSearchQuery ||
                        (u.name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                        (u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                        (u.phone || '').toLowerCase().includes(userSearchQuery.toLowerCase());
                      let matchFilter = true;
                      if (userApprovalFilter === 'pending') matchFilter = u.is_approved === false;
                      if (userApprovalFilter === 'approved') matchFilter = u.is_approved !== false;
                      return matchQuery && matchFilter;
                    })
                    .map(u => (
                    <tr key={u.id} style={{ background: u.is_approved === false ? 'rgba(245, 158, 11, 0.04)' : undefined }}>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedUserIds(prev => [...prev, u.id]);
                            } else {
                              setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                            }
                          }}
                        />
                      </td>
                      <td style={{ fontWeight: '700' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{u.name}</span>
                          {u.is_approved === false && (
                            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: '800' }}>NEW</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#38bdf8', fontWeight: '600', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '3px 8px', borderRadius: '6px', display: 'inline-block' }}>
                          {u.email || '-'}
                        </span>
                      </td>
                      <td>{u.phone}</td>
                      <td>
                        <span className={`plan-badge ${u.plan.toLowerCase()}`}>
                          {u.plan}
                        </span>
                      </td>
                      <td>
                        {u.is_approved !== false ? (
                          <span className="plan-badge pro" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', borderColor: 'var(--success)' }}>🟢 Aktif (Ter-ACC)</span>
                        ) : (
                          <span className="plan-badge starter" style={{ backgroundColor: 'var(--warning-light)', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.4)', fontWeight: '800' }}>⚠️ Pending ACC</span>
                        )}
                      </td>
                      <td>{u.telegram}</td>
                      <td>{u.txCount} transaksi</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {u.is_approved === false ? (
                            <>
                              <button 
                                onClick={() => handleApproveUser(u.id, u.name)} 
                                className="btn" 
                                style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '6px 14px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }}
                              >
                                ✅ ACC
                              </button>
                              <button 
                                onClick={() => handleApproveWithProUser(u.id, u.name)} 
                                className="btn" 
                                style={{ backgroundColor: '#f59e0b', color: '#000000', border: 'none', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                👑 ACC + Pro
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleOpenEditSub(u)}
                              className="btn"
                              style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
                            >
                              👑 Langganan
                            </button>
                          )}
                          <button
                            onClick={() => handleImpersonation(u)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            🕵️ Masuk User
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="btn btn-outline"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--error)', borderColor: 'var(--error)' }}
                          >
                            🗑️ Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Native Cards View (No Horizontal Scroll) */}
            <div className="mobile-cards-view animate-slide-up">
              {users
                .filter(u => {
                  const matchQuery = !userSearchQuery ||
                    (u.name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                    (u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                    (u.phone || '').toLowerCase().includes(userSearchQuery.toLowerCase());
                  let matchFilter = true;
                  if (userApprovalFilter === 'pending') matchFilter = u.is_approved === false;
                  if (userApprovalFilter === 'approved') matchFilter = u.is_approved !== false;
                  return matchQuery && matchFilter;
                })
                .map(u => (
                <div key={u.id} className="mobile-data-card" style={{ borderColor: u.is_approved === false ? 'rgba(245, 158, 11, 0.4)' : undefined }}>
                  <div className="mobile-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedUserIds(prev => [...prev, u.id]);
                          else setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: '800', color: '#ffffff', fontSize: '1rem' }}>{u.name}</div>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#38bdf8', fontWeight: '600' }}>
                          {u.email || '-'}
                        </span>
                      </div>
                    </div>
                    <span className={`plan-badge ${u.plan.toLowerCase()}`}>
                      {u.plan}
                    </span>
                  </div>

                  <div className="mobile-card-body">
                    <div className="mobile-card-row">
                      <span>Status Approval</span>
                      {u.is_approved !== false ? (
                        <span className="plan-badge pro" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', borderColor: 'var(--success)', fontSize: '0.72rem' }}>🟢 Aktif (Ter-ACC)</span>
                      ) : (
                        <span className="plan-badge starter" style={{ backgroundColor: 'var(--warning-light)', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.4)', fontSize: '0.72rem', fontWeight: '800' }}>⚠️ Pending ACC</span>
                      )}
                    </div>
                    <div className="mobile-card-row">
                      <span>No. Handphone</span>
                      <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{u.phone || '-'}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span>Telegram Bot</span>
                      <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{u.telegram || 'Belum Terhubung'}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span>Total Transaksi</span>
                      <span style={{ color: '#e2e8f0', fontWeight: '700' }}>{u.txCount} Catatan</span>
                    </div>
                  </div>

                  <div className="mobile-card-actions">
                    {u.is_approved === false ? (
                      <>
                        <button 
                          onClick={() => handleApproveUser(u.id, u.name)} 
                          className="btn" 
                          style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '8px 14px', fontSize: '0.8rem', borderRadius: '8px', fontWeight: '800', flex: 1 }}
                        >
                          ✅ ACC User
                        </button>
                        <button 
                          onClick={() => handleApproveWithProUser(u.id, u.name)} 
                          className="btn" 
                          style={{ backgroundColor: '#f59e0b', color: '#000000', border: 'none', padding: '8px 14px', fontSize: '0.8rem', borderRadius: '8px', fontWeight: '800', flex: 1 }}
                        >
                          👑 ACC + Pro
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleOpenEditSub(u)}
                        className="btn"
                        style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '8px 12px', fontSize: '0.8rem', borderRadius: '8px', fontWeight: '700' }}
                      >
                        👑 Langganan
                      </button>
                    )}
                    <button
                      onClick={() => handleImpersonation(u)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                    >
                      🕵️ Masuk Versi User
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      className="btn btn-outline"
                      style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--error)', borderColor: 'var(--error)', borderRadius: '8px' }}
                    >
                      🗑️ Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 2.2 DEDICATED APPROVAL PENDAFTARAN PENGGUNA BARU */}
        {activeTab === 'user_approvals' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>⏳</span> Approval Pendaftaran Pengguna Baru
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
                  Daftar pengguna baru yang menunggu persetujuan (ACC) dari Admin untuk dapat login dan mengakses dashboard.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={fetchAdminData}
                  className="btn btn-outline"
                  style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: '700', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>🔄</span> Refresh Data
                </button>
              </div>
            </div>

            {/* Quick Stat Cards for Approvals */}
            <div className="grid-2" style={{ gap: '16px' }}>
              <div style={{ background: 'rgba(13, 20, 38, 0.75)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '16px', padding: '18px 22px', boxShadow: '0 4px 20px rgba(245, 158, 11, 0.1)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Menunggu Persetujuan (Pending ACC)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fbbf24', marginTop: '6px' }}>
                  {users.filter(u => u.is_approved === false).length} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pendaftar</span>
                </div>
              </div>
              <div style={{ background: 'rgba(13, 20, 38, 0.75)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', padding: '18px 22px', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.1)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pengguna Aktif (Ter-ACC)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#10b981', marginTop: '6px' }}>
                  {users.filter(u => u.is_approved !== false).length} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pengguna</span>
                </div>
              </div>
            </div>

            {/* Pending Users List */}
            {users.filter(u => u.is_approved === false).length === 0 ? (
              <div className="card animate-slide-up" style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(13, 20, 38, 0.65)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '18px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎉</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', margin: '0 0 6px 0' }}>
                  Semua Pendaftaran Sudah Disetujui!
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 18px auto' }}>
                  Saat ini tidak ada pendaftaran pengguna baru yang menunggu persetujuan (ACC). Seluruh pengguna yang terdaftar sudah aktif.
                </p>
                <button
                  onClick={() => setActiveTab('users')}
                  className="btn"
                  style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '8px 18px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Lihat Semua Pengguna
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {users.filter(u => u.is_approved === false).map(u => (
                  <div 
                    key={u.id}
                    className="animate-slide-up"
                    style={{
                      background: 'rgba(13, 20, 38, 0.85)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: '16px',
                      padding: '20px 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                      boxShadow: '0 4px 18px rgba(245, 158, 11, 0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem' }}>
                        ⏳
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#ffffff' }}>{u.name}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: '800', padding: '2px 8px', borderRadius: '99px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                            ⚠️ Menunggu ACC
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.82rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                          <span>📧 <strong style={{ color: '#38bdf8' }}>{u.email}</strong></span>
                          <span>📱 {u.phone || 'No HP belum diisi'}</span>
                          <span>📅 Daftar: {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Baru Saja'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {u.phone && u.phone !== '-' && (
                        <a
                          href={`https://wa.me/${u.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo ${u.name}, akun Anda di MencatatAja sudah kami terima. Ada yang bisa kami bantu?`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn"
                          style={{ background: 'rgba(37, 211, 102, 0.12)', color: '#25d366', border: '1px solid rgba(37, 211, 102, 0.3)', padding: '8px 14px', fontSize: '0.82rem', borderRadius: '10px', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <span>💬</span> WhatsApp
                        </a>
                      )}
                      <button
                        onClick={() => handleApproveUser(u.id, u.name)}
                        className="btn"
                        style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '8px 16px', fontSize: '0.85rem', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                      >
                        <span>✅</span> Setujui (ACC)
                      </button>
                      <button
                        onClick={() => handleApproveWithProUser(u.id, u.name)}
                        className="btn"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#ffffff', border: 'none', padding: '8px 16px', fontSize: '0.85rem', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}
                      >
                        <span>👑</span> ACC + Pro VIP
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="btn btn-outline"
                        style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', padding: '8px 12px', fontSize: '0.82rem', borderRadius: '10px' }}
                      >
                        <span>🗑️</span> Tolak
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        
        {/* 2.5 KELOLA LANGGANAN (SUBSCRIPTION MANAGEMENT ALA PROFITLAB) */}
        {activeTab === 'subscriptions' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-main)', margin: 0 }}>
                  💳 Kelola Langganan (Subscription Management)
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
                  Atur masa aktif paket Pro, berikan akses gratis (Free Access VIP), dan perpanjang langganan massal pengguna.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleBulkExtendSubscription}
                  className="btn"
                  style={{ backgroundColor: '#059669', color: '#ffffff', padding: '9px 18px', fontWeight: '700', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>⚡</span> Perpanjang Massal
                </button>
              </div>
            </div>

            
            {/* PRICING MANAGER CARD (BASIC & PRO) */}
            <div className="card animate-slide-up" style={{ background: 'rgba(13, 20, 38, 0.85)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    ⚙️ Atur Harga Paket Langganan (Basic & Pro)
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
                    Sesuaikan nominal harga dan periode paket yang tampil di halaman pendaftaran & dashboard pengguna secara dinamis.
                  </p>
                </div>
                <button
                  onClick={handleSavePricingConfig}
                  disabled={isSavingPricing}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', fontWeight: '800', fontSize: '0.88rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', border: 'none', borderRadius: '10px', cursor: isSavingPricing ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)' }}
                >
                  {isSavingPricing ? 'Menyimpan...' : '💾 Simpan Perubahan Harga'}
                </button>
              </div>

              <form onSubmit={handleSavePricingConfig} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {/* Basic Tier Card */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '800', fontSize: '1.05rem', color: '#ffffff' }}>📦 Paket Basic</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8' }}>FREE TIER / DASAR</span>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Harga Paket (Rp)</label>
                    <input
                      type="number"
                      value={adminBasicPrice}
                      onChange={e => setAdminBasicPrice(Number(e.target.value))}
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#ffffff', fontWeight: '700' }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Periode Penagihan</label>
                    <input
                      type="text"
                      value={adminBasicPeriod}
                      onChange={e => setAdminBasicPeriod(e.target.value)}
                      placeholder="Contoh: Gratis, Bulan, dll."
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#ffffff' }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Deskripsi Singkat</label>
                    <input
                      type="text"
                      value={adminBasicDesc}
                      onChange={e => setAdminBasicDesc(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#ffffff' }}
                    />
                  </div>
                </div>

                {/* Pro Tier Card */}
                <div style={{ background: 'rgba(245, 158, 11, 0.03)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '800', fontSize: '1.05rem', color: '#fbbf24' }}>💎 Paket Pro</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000' }}>PALING POPULER</span>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Harga Paket (Rp)</label>
                    <input
                      type="number"
                      value={adminProPrice}
                      onChange={e => setAdminProPrice(Number(e.target.value))}
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#10b981', fontWeight: '800', fontSize: '1.1rem' }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Periode Penagihan</label>
                    <input
                      type="text"
                      value={adminProPeriod}
                      onChange={e => setAdminProPeriod(e.target.value)}
                      placeholder="Contoh: Bulan, Tahun"
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#ffffff' }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Deskripsi Singkat</label>
                    <input
                      type="text"
                      value={adminProDesc}
                      onChange={e => setAdminProDesc(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#ffffff' }}
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Metrics Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'rgba(13, 20, 38, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.25)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.08)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pelanggan Pro Aktif</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#059669', marginTop: '4px' }}>
                  {users.filter(u => u.plan === 'Pro' || u.plan === 'pro').length} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>User</span>
                </div>
              </div>
              <div style={{ background: 'rgba(13, 20, 38, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.25)', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.08)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Free Access (VIP)</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fbbf24', marginTop: '4px' }}>
                  {users.filter(u => u.is_free_access).length || (users.filter(u => u.id === 'usr_catur').length ? 1 : 0)} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>VIP</span>
                </div>
              </div>
              <div style={{ background: 'rgba(13, 20, 38, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.25)', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.08)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hampir Habis (&lt; 7 Hari)</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ef4444', marginTop: '4px' }}>
                  {users.filter(u => u.daysRemaining > 0 && u.daysRemaining <= 7).length || 0} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>User</span>
                </div>
              </div>
              <div style={{ background: 'rgba(13, 20, 38, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(100, 116, 139, 0.25)', boxShadow: '0 4px 14px rgba(100, 116, 139, 0.08)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Basic (Free Tier)</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#475569', marginTop: '4px' }}>
                  {users.filter(u => u.plan === 'Basic' || !u.plan).length} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>User</span>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                value={subSearchQuery}
                onChange={e => setSubSearchQuery(e.target.value)}
                placeholder="Cari pengguna berdasarkan nama atau email..."
                style={{ flex: '1', minWidth: '240px', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(13, 20, 38, 0.75)', fontSize: '0.85rem' }}
              />
              <select
                value={subStatusFilter}
                onChange={e => setSubStatusFilter(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(13, 20, 38, 0.75)', fontSize: '0.85rem', fontWeight: '600' }}
              >
                <option value="all">Semua Status</option>
                <option value="pro">Pro Aktif</option>
                <option value="free">Free Access VIP</option>
                <option value="basic">Basic</option>
              </select>
            </div>

            {/* Desktop Table View */}
            <div className="desktop-table-view shadcn-table-wrapper animate-slide-up">
              <table className="shadcn-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox"
                        checked={selectedUserIds.length > 0 && selectedUserIds.length === users.length}
                        onChange={e => {
                          if (e.target.checked) setSelectedUserIds(users.map(u => u.id));
                          else setSelectedUserIds([]);
                        }}
                      />
                    </th>
                    <th>Pengguna</th>
                    <th>Paket Saat Ini</th>
                    <th>Status Masa Aktif</th>
                    <th>Masa Berlaku</th>
                    <th>Catatan Langganan</th>
                    <th style={{ textAlign: 'right' }}>Aksi Kelola</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(u => {
                      const matchQuery = (u.name || '').toLowerCase().includes(subSearchQuery.toLowerCase()) || 
                                         (u.email || '').toLowerCase().includes(subSearchQuery.toLowerCase());
                      let matchStatus = true;
                      if (subStatusFilter === 'pro') matchStatus = u.plan === 'Pro' && !u.is_free_access;
                      if (subStatusFilter === 'free') matchStatus = !!u.is_free_access;
                      if (subStatusFilter === 'basic') matchStatus = u.plan === 'Basic' || !u.plan;
                      return matchQuery && matchStatus;
                    })
                    .map(u => {
                      const isFree = !!u.is_free_access;
                      const isPro = u.plan === 'Pro';
                      return (
                        <tr key={u.id}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(u.id)}
                              onChange={e => {
                                if (e.target.checked) setSelectedUserIds(prev => [...prev, u.id]);
                                else setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                              }}
                            />
                          </td>
                          <td>
                            <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{u.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email || '-'}</div>
                          </td>
                          <td>
                            <span className={`plan-badge ${isPro ? 'pro' : 'starter'}`}>
                              {isFree ? 'Pro (VIP)' : (isPro ? 'Pro Member' : 'Basic')}
                            </span>
                          </td>
                          <td>
                            {isFree ? (
                              <span className="shadcn-badge" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                ✨ Free Access VIP
                              </span>
                            ) : isPro ? (
                              <span className="shadcn-badge shadcn-badge-approved">
                                🟢 Pro Aktif
                              </span>
                            ) : (
                              <span className="shadcn-badge" style={{ background: 'rgba(100, 116, 139, 0.1)', color: '#64748b', border: '1px solid rgba(100, 116, 139, 0.2)' }}>
                                Free Tier
                              </span>
                            )}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: '600' }}>
                            {isFree ? 'Selamanya (VIP)' : (isPro ? '30 Hari Tersisa' : 'Tanpa Kuota Pro')}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '200px' }}>
                            {u.notes || '-'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => handleOpenEditSub(u)}
                              className="btn"
                              style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '8px', fontWeight: '700', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.35)', cursor: 'pointer' }}
                            >
                              👑 Kelola
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Mobile Native Cards View (No Horizontal Scroll) */}
            <div className="mobile-cards-view animate-slide-up">
              {users
                .filter(u => {
                  const matchQuery = (u.name || '').toLowerCase().includes(subSearchQuery.toLowerCase()) || 
                                     (u.email || '').toLowerCase().includes(subSearchQuery.toLowerCase());
                  let matchStatus = true;
                  if (subStatusFilter === 'pro') matchStatus = u.plan === 'Pro' && !u.is_free_access;
                  if (subStatusFilter === 'free') matchStatus = !!u.is_free_access;
                  if (subStatusFilter === 'basic') matchStatus = u.plan === 'Basic' || !u.plan;
                  return matchQuery && matchStatus;
                })
                .map(u => {
                  const isFree = !!u.is_free_access;
                  const isPro = u.plan === 'Pro';
                  return (
                    <div key={u.id} className="mobile-data-card">
                      <div className="mobile-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(u.id)}
                            onChange={e => {
                              if (e.target.checked) setSelectedUserIds(prev => [...prev, u.id]);
                              else setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: '800', color: '#ffffff', fontSize: '1rem' }}>{u.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email || '-'}</div>
                          </div>
                        </div>
                        <span className={`plan-badge ${isPro ? 'pro' : 'starter'}`}>
                          {isFree ? 'Pro VIP' : (isPro ? 'Pro' : 'Basic')}
                        </span>
                      </div>

                      <div className="mobile-card-body">
                        <div className="mobile-card-row">
                          <span>Status Masa Aktif</span>
                          {isFree ? (
                            <span className="shadcn-badge" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.72rem' }}>
                              ✨ Free Access VIP
                            </span>
                          ) : isPro ? (
                            <span className="shadcn-badge shadcn-badge-approved" style={{ fontSize: '0.72rem' }}>
                              🟢 Pro Aktif
                            </span>
                          ) : (
                            <span className="shadcn-badge" style={{ background: 'rgba(100, 116, 139, 0.1)', color: '#94a3b8', border: '1px solid rgba(100, 116, 139, 0.2)', fontSize: '0.72rem' }}>
                              Free Tier
                            </span>
                          )}
                        </div>
                        <div className="mobile-card-row">
                          <span>Masa Berlaku</span>
                          <span style={{ color: '#e2e8f0', fontWeight: '600' }}>
                            {isFree ? 'Selamanya (VIP Lifetime)' : (isPro ? '30 Hari Tersisa' : 'Tanpa Kuota Pro')}
                          </span>
                        </div>
                        <div className="mobile-card-row">
                          <span>Catatan</span>
                          <span style={{ color: '#cbd5e1' }}>{u.notes || '-'}</span>
                        </div>
                      </div>

                      <div className="mobile-card-actions">
                        <button
                          onClick={() => handleOpenEditSub(u)}
                          className="btn"
                          style={{ width: '100%', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '10px 14px', borderRadius: '10px', fontWeight: '700', fontSize: '0.85rem' }}
                        >
                          👑 Atur Paket & Masa Aktif
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 3. APPROVAL PEMBAYARAN MANUAL */}
        {activeTab === 'payments' && (
          <>
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-main)', margin: 0 }}>
                  👑 Approval Pembayaran Langganan
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
                  Proses verifikasi mutasi paket Pro via Transfer Manual & QRIS (Apple Liquid Glass UI).
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="shadcn-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  Total: {payments.length} Transaksi
                </span>
                <span className="shadcn-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  Pending: {payments.filter(p => p.status === 'pending').length}
                </span>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="desktop-table-view shadcn-table-wrapper animate-slide-up">
              <table className="shadcn-table">
                <thead>
                  <tr>
                    <th>Waktu Pembayaran</th>
                    <th>Nama User</th>
                    <th>Metode</th>
                    <th>Nominal</th>
                    <th>Bukti Transfer</th>
                    <th>Status</th>
                    <th>Aksi Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{p.time}</td>
                      <td>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{p.user}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {p.userId}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', fontWeight: '500', padding: '4px 8px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.06)', color: '#cbd5e1' }}>
                          💳 {p.method}
                        </span>
                      </td>
                      <td style={{ fontWeight: '800', color: '#059669', fontSize: '0.95rem' }}>{p.amount}</td>
                      <td>
                        {p.proof !== '-' ? (
                          <div 
                            className="payment-proof-thumbnail-wrapper"
                            onClick={() => setSelectedProofModal(p)}
                            title="Klik untuk memperbesar bukti transfer"
                          >
                            <img src={p.proof} alt="Bukti Transfer" className="payment-proof-thumbnail" />
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td>
                        {p.status === 'approved' ? (
                          <span className="shadcn-badge shadcn-badge-approved">
                            <span className="pulse-dot green"></span> Approved
                          </span>
                        ) : (
                          <span className="shadcn-badge shadcn-badge-pending">
                            <span className="pulse-dot amber"></span> Pending
                          </span>
                        )}
                      </td>
                      <td>
                        {p.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleApprovePayment(p.id, p.userId, p.user)}
                              className="btn-liquid-emerald"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => alert('Pembayaran ditolak.')}
                              className="btn-liquid-rose"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            ✨ Selesai (Pro Aktif)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Native Cards View (No Horizontal Scroll) */}
            <div className="mobile-cards-view animate-slide-up">
              {payments.map(p => (
                <div key={p.id} className="mobile-data-card">
                  <div className="mobile-card-header">
                    <div>
                      <div style={{ fontWeight: '800', color: '#ffffff', fontSize: '1rem' }}>{p.user}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.time} • ID: {p.userId}</div>
                    </div>
                    {p.status === 'approved' ? (
                      <span className="shadcn-badge shadcn-badge-approved" style={{ fontSize: '0.72rem' }}>
                        <span className="pulse-dot green"></span> Approved
                      </span>
                    ) : (
                      <span className="shadcn-badge shadcn-badge-pending" style={{ fontSize: '0.72rem' }}>
                        <span className="pulse-dot amber"></span> Pending
                      </span>
                    )}
                  </div>

                  <div className="mobile-card-body">
                    <div className="mobile-card-row">
                      <span>Metode Pembayaran</span>
                      <span style={{ color: '#cbd5e1', fontWeight: '600' }}>💳 {p.method}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span>Nominal Transfer</span>
                      <span style={{ fontWeight: '800', color: '#059669', fontSize: '1rem' }}>{p.amount}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span>Bukti Transfer</span>
                      {p.proof !== '-' ? (
                        <div 
                          className="payment-proof-thumbnail-wrapper"
                          onClick={() => setSelectedProofModal(p)}
                          title="Klik untuk memperbesar bukti transfer"
                        >
                          <img src={p.proof} alt="Bukti Transfer" className="payment-proof-thumbnail" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px' }} />
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
                    </div>
                  </div>

                  <div className="mobile-card-actions">
                    {p.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleApprovePayment(p.id, p.userId, p.user)}
                          className="btn-liquid-emerald"
                          style={{ flex: 1, padding: '10px 14px', borderRadius: '10px' }}
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => alert('Pembayaran ditolak.')}
                          className="btn-liquid-rose"
                          style={{ flex: 1, padding: '10px 14px', borderRadius: '10px' }}
                        >
                          ✕ Reject
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px', margin: 'auto' }}>
                        ✨ Selesai (Pro Aktif)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 4. AI CALL LOGS & COST AUDIT */}
        {activeTab === 'ai_logs' && (
          <>
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2>Riwayat Pemanggilan API AI</h2>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Gunakan log ini untuk keperluan monitoring dan penghitungan estimasi tagihan API (Update Real-Time 5s).</p>
              </div>
              <button
                onClick={() => fetchAdminData()}
                className="btn btn-outline"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                🔄 Refresh Log
              </button>
            </div>

            {/* Desktop Table View */}
            <div className="desktop-table-view tx-table-container animate-slide-up">
              <table className="tx-table">
                <thead>
                  <tr>
                    <th>Waktu Call</th>
                    <th>Nama User</th>
                    <th>Provider</th>
                    <th>Action</th>
                    <th>Token (Prompt / Completion)</th>
                    <th>Biaya Estimasi</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {aiLogs.map(l => (
                    <tr key={l.id}>
                      <td>{l.time}</td>
                      <td style={{ fontWeight: '700' }}>{l.user}</td>
                      <td style={{ textTransform: 'capitalize' }}>{l.provider}</td>
                      <td><code>{l.action}</code></td>
                      <td>{l.tokens}</td>
                      <td style={{ fontWeight: '700' }}>{l.cost}</td>
                      <td style={{ color: l.status === 'success' ? 'var(--success)' : 'var(--error)' }}>
                        {l.status.toUpperCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Native Cards View (No Horizontal Scroll) */}
            <div className="mobile-cards-view animate-slide-up">
              {aiLogs.map(l => (
                <div key={l.id} className="mobile-data-card">
                  <div className="mobile-card-header">
                    <div>
                      <div style={{ fontWeight: '800', color: '#ffffff', fontSize: '0.98rem' }}>{l.user}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{l.time}</div>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', background: l.status === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: l.status === 'success' ? '#10b981' : '#f87171' }}>
                      {l.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mobile-card-body">
                    <div className="mobile-card-row">
                      <span>Provider & Action</span>
                      <span style={{ color: '#c084fc', fontWeight: '600' }}>{l.provider} • <code>{l.action}</code></span>
                    </div>
                    <div className="mobile-card-row">
                      <span>Total Tokens</span>
                      <span style={{ color: '#cbd5e1' }}>{l.tokens}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span>Biaya Estimasi</span>
                      <span style={{ fontWeight: '700', color: '#38bdf8' }}>{l.cost}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 5. AUDIT LOGS KEAMANAN */}
        {activeTab === 'audit_logs' && (
          <>
            <div className="admin-header">
              <h2>Audit Log Keamanan Admin</h2>
              <p style={{ color: 'var(--text-muted)' }}>Merekam seluruh aktivitas administratif sensitif demi mematuhi kepatuhan privasi pengguna.</p>
            </div>

            {/* Desktop Table View */}
            <div className="desktop-table-view tx-table-container animate-slide-up">
              <table className="tx-table">
                <thead>
                  <tr>
                    <th>Tanggal Log</th>
                    <th>Email Admin</th>
                    <th>Aktivitas Sensitif</th>
                    <th>ID Target</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(a => (
                    <tr key={a.id}>
                      <td>{a.time}</td>
                      <td style={{ fontWeight: '700' }}>{a.admin}</td>
                      <td style={{ color: 'var(--error)' }}>{a.action}</td>
                      <td><code>{a.target}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Native Cards View (No Horizontal Scroll) */}
            <div className="mobile-cards-view animate-slide-up">
              {auditLogs.map(a => (
                <div key={a.id} className="mobile-data-card">
                  <div className="mobile-card-header">
                    <div>
                      <div style={{ fontWeight: '800', color: '#ffffff', fontSize: '0.98rem' }}>{a.admin}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{a.time}</div>
                    </div>
                  </div>

                  <div className="mobile-card-body">
                    <div className="mobile-card-row">
                      <span>Aktivitas</span>
                      <span style={{ color: '#f87171', fontWeight: '600' }}>{a.action}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span>Target ID</span>
                      <code style={{ fontSize: '0.75rem' }}>{a.target}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 5.5 KELOLA VIDEO TUTORIAL PENGGUNAAN */}
        {activeTab === 'tutorials' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                  🎬 Kelola Video Tutorial Penggunaan
                </h2>
                <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                  Tambahkan dan kelola link video YouTube panduan penggunaan aplikasi untuk memandu seluruh pengguna.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => fetchTutorials()}
                  className="btn btn-outline"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={handleOpenAddTutorial}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  ➕ Tambah Video Tutorial
                </button>
              </div>
            </div>

            {/* MODAL FORM TAMBAH / EDIT VIDEO TUTORIAL */}
            {showAddTutorialModal && (
              <div className="card animate-slide-up" style={{ padding: '24px 28px', border: '2px solid var(--primary)', background: 'rgba(13, 20, 38, 0.92)', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {editingTutorialId ? '✏️ Edit Video Tutorial' : '➕ Tambah Video Tutorial Baru'}
                  </h3>
                  <button 
                    onClick={() => setShowAddTutorialModal(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveTutorial} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="grid-2" style={{ gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>
                        Judul Video Tutorial <span style={{ color: 'var(--error)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Tutorial Menghubungkan Bot Telegram & Catat Transaksi"
                        value={tutorialTitleInput}
                        onChange={e => setTutorialTitleInput(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>
                        Kategori / Tag Panduan
                      </label>
                      <select
                        value={tutorialCategoryInput}
                        onChange={e => setTutorialCategoryInput(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem' }}
                      >
                        <option value="Bot Telegram">🤖 Bot Telegram</option>
                        <option value="Scan AI Struk">📸 Scan AI Struk</option>
                        <option value="Dompet & Budget">👛 Dompet & Budget</option>
                        <option value="Dasar">🔰 Dasar & Onboarding</option>
                        <option value="Laporan & Ekspor">📊 Laporan & Ekspor</option>
                        <option value="Umum">💡 Tips & Trik Umum</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>
                      Link Video YouTube (Bisa masukkan URL apa saja) <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
                      value={tutorialYoutubeUrlInput}
                      onChange={e => setTutorialYoutubeUrlInput(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      Mendukung semua format link YouTube (youtube.com/watch?v=, youtu.be/, shorts/, embed/).
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>
                      Deskripsi Panduan
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Jelaskan langkah-langkah atau intisari video tutorial ini untuk pengguna..."
                      value={tutorialDescInput}
                      onChange={e => setTutorialDescInput(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem', resize: 'vertical' }}
                    />
                  </div>

                  {/* LIVE PREVIEW IFRAME */}
                  {tutorialYoutubeUrlInput.trim() && (
                    <div style={{ marginTop: '8px', padding: '14px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#34d399', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>▶️</span> Preview Player YouTube:
                      </div>
                      <div style={{ position: 'relative', width: '100%', maxWidth: '420px', paddingBottom: '56.25%', height: 0, borderRadius: '10px', overflow: 'hidden', background: '#000' }}>
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${tutorialYoutubeUrlInput.includes('v=') ? tutorialYoutubeUrlInput.split('v=')[1]?.split('&')[0] : tutorialYoutubeUrlInput.includes('youtu.be/') ? tutorialYoutubeUrlInput.split('youtu.be/')[1]?.split('?')[0] : tutorialYoutubeUrlInput}`}
                          title="YouTube video preview"
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddTutorialModal(false)}
                      className="btn btn-outline"
                      style={{ padding: '9px 18px', fontSize: '0.85rem' }}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingTutorial}
                      className="btn btn-primary"
                      style={{ padding: '9px 24px', fontWeight: '700', fontSize: '0.85rem' }}
                    >
                      {isSavingTutorial ? 'Menyimpan...' : (editingTutorialId ? '💾 Simpan Perubahan' : '➕ Tambahkan Video')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SEARCH & FILTER BAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <input
                type="text"
                placeholder="🔍 Cari video tutorial..."
                value={tutorialSearchQuery}
                onChange={e => setTutorialSearchQuery(e.target.value)}
                style={{ maxWidth: '360px', width: '100%', padding: '8px 14px', fontSize: '0.85rem' }}
              />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                Total Video: <b style={{ color: '#ffffff' }}>{tutorialsList.length}</b> tutorial aktif
              </div>
            </div>

            {/* LIST OF TUTORIAL CARDS */}
            {isFetchingTutorials ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Memuat daftar video tutorial...
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {tutorialsList
                  .filter(t => {
                    if (!tutorialSearchQuery) return true;
                    const q = tutorialSearchQuery.toLowerCase();
                    return t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q);
                  })
                  .map(tut => {
                    const ytId = tut.youtube_id || (tut.youtube_url?.includes('v=') ? tut.youtube_url.split('v=')[1]?.split('&')[0] : tut.youtube_url?.includes('youtu.be/') ? tut.youtube_url.split('youtu.be/')[1]?.split('?')[0] : '');
                    return (
                      <div key={tut.id} className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px', background: 'rgba(13, 20, 38, 0.75)', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div>
                          {/* 16:9 Embedded YouTube Video */}
                          <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, borderRadius: '12px', overflow: 'hidden', background: '#000', marginBottom: '14px' }}>
                            <iframe
                              src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                              title={tut.title}
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              loading="lazy"
                            />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                              {tut.category || 'Umum'}
                            </span>
                            {tut.created_at && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {new Date(tut.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>

                          <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#ffffff', marginBottom: '8px', lineHeight: '1.4' }}>
                            {tut.title}
                          </h4>

                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {tut.description || 'Tidak ada deskripsi.'}
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <button
                            onClick={() => handleOpenEditTutorial(tut)}
                            className="btn btn-outline"
                            style={{ flex: 1, padding: '6px 12px', fontSize: '0.78rem', justifyContent: 'center' }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTutorial(tut.id, tut.title)}
                            className="btn btn-outline"
                            style={{ flex: 1, padding: '6px 12px', fontSize: '0.78rem', color: 'var(--error)', borderColor: 'var(--error)', justifyContent: 'center' }}
                          >
                            🗑️ Hapus
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {tutorialsList.length === 0 && !isFetchingTutorials && (
              <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>🎬</span>
                <h3 style={{ marginBottom: '8px' }}>Belum Ada Video Tutorial</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '18px' }}>
                  Tambahkan video tutorial YouTube pertama Anda untuk membantu pengguna memahami fitur aplikasi.
                </p>
                <button
                  onClick={handleOpenAddTutorial}
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontWeight: '700' }}
                >
                  ➕ Tambah Video Sekarang
                </button>
              </div>
            )}
          </div>
        )}

        {/* 6. USER DASHBOARD PREVIEW & SIMULATOR */}
        {(activeTab === 'user_preview' ||
          activeTab === 'admin_beranda' ||
          activeTab === 'admin_transaksi' ||
          activeTab === 'admin_laporan' ||
          activeTab === 'admin_budget' ||
          activeTab === 'admin_wallet' ||
          activeTab === 'admin_settings') && (
          <>
            {activeTab === 'user_preview' ? (
              <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2>Tampilan Versi User (Live Preview)</h2>
                  <p style={{ color: 'var(--text-muted)' }}>Melihat, menguji, dan mengelola data transaksi pengguna terpilih tanpa perlu keluar masuk admin.</p>
                </div>
                
                <div className="form-group" style={{ margin: 0, minWidth: '280px' }}>
                  <select
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={previewUserId}
                    onChange={(e) => setPreviewUserId(e.target.value)}
                  >
                    <option value="">-- Pilih User untuk Ditinjau --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.phone}) - {u.plan}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="admin-header" style={{ marginBottom: '24px' }}>
                <h2>👛 Keuangan Saya (Admin)</h2>
                <p style={{ color: 'var(--text-muted)' }}>Kelola pencatatan keuangan pribadi, anggaran, dan dompet Anda sendiri secara langsung.</p>
              </div>
            )}

            {previewUserId ? (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {activeTab === 'user_preview' && (
                  <div className="card" style={{ padding: '16px 24px', backgroundColor: 'var(--primary-light)', border: '1px dashed hsla(20, 100%, 50%, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>👤 Preview User: {previewUserName}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No. HP: {previewUserPhone} | Paket: <span className={`plan-badge ${previewUserPlan.toLowerCase()}`} style={{ marginTop: 0 }}>{previewUserPlan}</span></p>
                    </div>
                    
                    <div className="pricing-toggle" style={{ margin: 0 }}>
                      {(['beranda', 'transaksi', 'laporan', 'budget', 'wallet', 'settings', 'profile'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setPreviewUserTab(tab)}
                          className={`toggle-btn ${previewUserTab === tab ? 'active' : ''}`}
                          style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                        >
                          {tab.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub Tab: Beranda */}
                {previewUserTab === 'beranda' && (
                  <>
                    {/* 4 Stats Cards */}
                    <div className="stats-summary">
                      <div className="stat-card primary">
                        <span className="stat-label">Saldo Total</span>
                        <div className="stat-value">Rp {previewTotalBalance.toLocaleString('id-ID')}</div>
                        <div className="stat-sub">Dari semua rekening</div>
                      </div>
                      <div className="stat-card">
                        <span className="stat-label" style={{ color: 'var(--success)' }}>↓ Pemasukan</span>
                        <div className="stat-value">Rp {previewTotalIncome.toLocaleString('id-ID')}</div>
                        <div className="stat-sub">Bulan berjalan</div>
                      </div>
                      <div className="stat-card">
                        <span className="stat-label" style={{ color: 'var(--error)' }}>↑ Pengeluaran</span>
                        <div className="stat-value">Rp {previewTotalExpense.toLocaleString('id-ID')}</div>
                        <div className="stat-sub">Bulan berjalan</div>
                      </div>
                      <div className="stat-card">
                        <span className="stat-label" style={{ color: 'var(--warning)' }}>🎯 Sisa Budget</span>
                        <div className="stat-value">Rp {previewTotalBudgetRemaining.toLocaleString('id-ID')}</div>
                        <div className="stat-sub">Limit: Rp {previewTotalBudgetLimit.toLocaleString('id-ID')}</div>
                      </div>
                    </div>

                    {/* SVG Charts */}
                    <div className="chart-grid">
                      <div className="card">
                        <h3>Tren Pengeluaran Harian</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Visualisasi 4 kuartal periode berjalan</p>
                        <div style={{ position: 'relative', height: '220px', width: '100%' }}>
                          <svg viewBox="0 0 400 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                            <path
                              d={`M 20 ${prevPoints[0]} L 140 ${prevPoints[1]} L 260 ${prevPoints[2]} L 380 ${prevPoints[3]}`}
                              fill="none"
                              stroke="var(--primary)"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <circle cx="20" cy={prevPoints[0]} r="5" fill="var(--primary)" />
                            <circle cx="140" cy={prevPoints[1]} r="5" fill="var(--primary)" />
                            <circle cx="260" cy={prevPoints[2]} r="5" fill="var(--primary)" />
                            <circle cx="380" cy={prevPoints[3]} r="5" fill="var(--primary)" />
                            
                            {/* Horizontal grid lines */}
                            <line x1="20" y1="180" x2="380" y2="180" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                            <line x1="20" y1="110" x2="380" y2="110" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                            <line x1="20" y1="40" x2="380" y2="40" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                          </svg>
                        </div>
                      </div>

                      <div className="card">
                        <h3>Proporsi Pengeluaran</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Distribusi pengeluaran per kategori</p>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                          <svg width="120" height="120" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f5f5f5" strokeWidth="3" />
                            {prevPieSlices.length === 0 ? (
                              <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="var(--border)" strokeWidth="3" />
                            ) : (
                              prevPieSlices.map((slice, idx) => (
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
                                />
                              ))
                            )}
                          </svg>
                          <div style={{ width: '100%', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {prevPieSlices.length === 0 ? (
                              <div style={{ textAlign: 'center', color: 'var(--text-light)' }}>Belum ada transaksi pengeluaran</div>
                            ) : (
                              prevPieSlices.map((slice, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{slice.emoji} {slice.name} ({Math.round(slice.percentage)}%)</span>
                                  <span style={{ fontWeight: '700' }}>Rp {slice.amount.toLocaleString('id-ID')}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 10 Latest Transactions */}
                    <div className="card" style={{ padding: '24px 0' }}>
                      <div style={{ padding: '0 28px 16px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                        <h3>Transaksi Terbaru</h3>
                        <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setPreviewUserTab('laporan')}>
                          Lihat Detail
                        </button>
                      </div>
                      
                      {previewTransactions.length === 0 ? (
                        <div className="empty-state" style={{ border: 'none' }}>
                          <span className="empty-icon">💸</span>
                          <h4>Belum ada transaksi</h4>
                          <p>Gunakan tab Transaksi untuk mencatat pengeluaran atau pemasukan baru.</p>
                        </div>
                      ) : (
                        <table className="tx-table" style={{ border: 'none' }}>
                          <tbody>
                            {previewTransactions.slice(0, 10).map((t) => {
                              const dateStr = new Date(t.transaction_date).toLocaleDateString('id-ID', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              });
                              const cat = previewCategories.find(c => c.id === t.category_id);
                              return (
                                <tr key={t.id}>
                                  <td style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '1.4rem' }}>{cat?.emoji || '💰'}</span>
                                    <div>
                                      <div style={{ fontWeight: '700' }}>{t.description}</div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{cat?.name || 'Lainnya'} • {dateStr}</div>
                                    </div>
                                  </td>
                                  <td>{t.source === 'telegram' ? '🤖 Telegram' : '💻 Web'}</td>
                                  <td className={`tx-amount ${t.type}`} style={{ color: t.type === 'expense' ? 'var(--error)' : 'var(--success)', fontWeight: '700' }}>
                                    {t.type === 'expense' ? '-' : '+'}Rp {Number(t.amount).toLocaleString('id-ID')}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                )}

                {/* Sub Tab: Transaksi */}
                {previewUserTab === 'transaksi' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                    {/* AI Parse */}
                    <div className="card" style={{ borderLeft: '6px solid var(--primary)' }}>
                      <h3>🤖 Simulasikan Catat Instan AI</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>Masukkan kalimat alami untuk ditafsirkan oleh modul AI real Mencatat Aja.</p>
                      <form onSubmit={handleAddPreviewTxWithAI} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="form-group">
                          <label htmlFor="prevAiText">Kalimat Transaksi</label>
                          <input
                            id="prevAiText"
                            type="text"
                            required
                            placeholder="Contoh: beli bakso 15rb pakai cash"
                            value={prevAiText}
                            onChange={e => setPrevAiText(e.target.value)}
                            disabled={prevIsParsingAi}
                          />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={prevIsParsingAi}>
                          {prevIsParsingAi ? '🤖 Memproses...' : '✨ Kirim ke AI'}
                        </button>
                      </form>
                    </div>

                    {/* 📸 AI Vision Receipt Uploader */}
                    <div className="card" style={{ borderLeft: '6px solid #FF8A00' }}>
                      <h3>📸 Simulasikan Unggah Struk (AI Vision)</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', marginTop: '8px' }}>
                        Simulasikan unggah foto struk belanja untuk secara otomatis dipindai oleh AI Vision.
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
                              Klik untuk memilih file struk simulasi
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                              Format JPG, JPEG, atau PNG (Maks 5MB)
                            </div>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleUploadPreviewReceipt}
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

                    {/* Manual */}
                    <div className="card">
                      <h3>Catat Transaksi Manual</h3>
                      <form onSubmit={handleAddPreviewTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                        <div className="form-group">
                          <label htmlFor="prevTxType">Jenis Transaksi</label>
                          <select id="prevTxType" value={prevTxType} onChange={e => setPrevTxType(e.target.value)} className="filter-select" style={{ width: '100%' }}>
                            <option value="expense">Pengeluaran (Expense)</option>
                            <option value="income">Pemasukan (Income)</option>
                            <option value="transfer">Transfer Antar Dompet</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label htmlFor="prevTxAmount">Nominal (Rp)</label>
                          <input id="prevTxAmount" type="number" required placeholder="50000" value={prevTxAmount} onChange={e => setPrevTxAmount(e.target.value)} />
                        </div>
                        {prevTxType !== 'transfer' && (
                          <div className="form-group">
                            <label htmlFor="prevTxCategory">Kategori</label>
                            <select id="prevTxCategory" value={prevTxCategoryId} onChange={e => setPrevTxCategoryId(e.target.value)} className="filter-select" style={{ width: '100%' }}>
                              <option value="">-- Pilih Kategori --</option>
                              {previewCategories.filter(c => c.type === prevTxType).map(c => (
                                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="form-group">
                          <label htmlFor="prevTxWallet">{prevTxType === 'transfer' ? 'Dari Dompet' : 'Dompet'}</label>
                          <select id="prevTxWallet" value={prevTxWalletId} onChange={e => setPrevTxWalletId(e.target.value)} className="filter-select" style={{ width: '100%' }}>
                            <option value="">-- Pilih Dompet --</option>
                            {previewWallets.map(w => (
                              <option key={w.id} value={w.id}>{w.name} (Saldo: Rp {Number(w.balance).toLocaleString('id-ID')})</option>
                            ))}
                          </select>
                        </div>
                        {prevTxType === 'transfer' && (
                          <div className="form-group">
                            <label htmlFor="prevTxTransferWallet">Ke Dompet (Tujuan)</label>
                            <select id="prevTxTransferWallet" value={prevTxTransferToWalletId} onChange={e => setPrevTxTransferToWalletId(e.target.value)} className="filter-select" style={{ width: '100%' }}>
                              <option value="">-- Pilih Dompet Tujuan --</option>
                              {previewWallets.filter(w => w.id !== prevTxWalletId).map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="form-group">
                          <label htmlFor="prevTxDesc">Keterangan / Deskripsi</label>
                          <input id="prevTxDesc" type="text" required placeholder="Beli teh botol" value={prevTxDescription} onChange={e => setPrevTxDescription(e.target.value)} />
                        </div>
                        <button type="submit" className="btn btn-primary">Simpan Transaksi</button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Sub Tab: Laporan */}
                {previewUserTab === 'laporan' && (() => {
                  const repIncomeTxs = previewTransactions.filter(t => t.type === 'income');
                  const repExpenseTxs = previewTransactions.filter(t => t.type === 'expense');
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
                      {/* Visual Charts & Summary Row */}
                      <div className="grid-3 animate-slide-up" style={{ gap: '20px', marginBottom: '24px', width: '100%' }}>
                        {/* Summary Card: Income vs Expense Bar */}
                        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', background: 'rgba(13, 20, 38, 0.75)' }}>
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
                        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'rgba(10, 15, 30, 0.85)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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
                        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'rgba(10, 15, 30, 0.85)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>🍕 PROPORSI PENGELUARAN</h4>
                          {Object.keys(categorySpentMap).length === 0 ? (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: 0 }}>Belum ada data pengeluaran.</p>
                          ) : (
                            Object.entries(categorySpentMap).map(([catId, amount]) => {
                              const catObj = previewCategories.find(c => c.id === catId) || { name: 'Lainnya', emoji: '📦' };
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

                      <div className="tx-table-container">
                        {previewTransactions.length === 0 ? (
                          <div className="empty-state">
                            <h4>Belum ada data transaksi</h4>
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
                                <th>Keterangan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {previewTransactions.map((t) => {
                                const dateStr = new Date(t.transaction_date).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' });
                                const cat = previewCategories.find(c => c.id === t.category_id);
                                const wName = previewWallets.find(w => w.id === t.wallet_id)?.name || 'Default';
                                return (
                                  <tr key={t.id}>
                                    <td>{dateStr}</td>
                                    <td>{cat?.emoji} {cat?.name || 'Kategori'}</td>
                                    <td>{wName}</td>
                                    <td style={{ textTransform: 'capitalize' }}>{t.type === 'expense' ? 'Pengeluaran' : t.type === 'income' ? 'Pemasukan' : 'Transfer'}</td>
                                    <td className={`tx-amount ${t.type}`} style={{ color: t.type === 'expense' ? 'var(--error)' : 'var(--success)', fontWeight: '700' }}>
                                      {t.type === 'expense' ? '-' : '+'}Rp {Number(t.amount).toLocaleString('id-ID')}
                                    </td>
                                    <td>{t.description}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </>
                  );
                })()}

                {/* Sub Tab: Budget */}
                {previewUserTab === 'budget' && (
                  <div className="card">
                    <h3>Status Anggaran Belanja</h3>

                    {/* Visual Budgeting Diagram & Breakdown */}
                    {(() => {
                      const totalLimit = previewBudgets.reduce((s, b) => s + Number(b.monthly_limit), 0);
                      const totalSpent = previewBudgets.reduce((s, b) => s + Number(b.current_spent), 0);
                      const overallPct = totalLimit > 0 ? Math.min(100, Math.round((totalSpent / totalLimit) * 100)) : 0;
                      const totalRemaining = totalLimit - totalSpent;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', margin: '20px 0 32px 0', padding: '24px', border: '1px solid var(--border)', borderRadius: '16px', backgroundColor: 'var(--background)' }}>
                          <h4 style={{ fontSize: '1.05rem', margin: 0 }}>📊 Ringkasan Visual Anggaran Bulanan</h4>
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
                                  stroke={overallPct >= 100 ? 'var(--error)' : overallPct >= 80 ? '#FF8A00' : 'var(--primary)'} 
                                  strokeWidth="3.5" 
                                  strokeDasharray={`${overallPct} ${100 - overallPct}`} 
                                  strokeDashoffset="0" 
                                  style={{ transition: 'stroke-dasharray 0.3s ease' }}
                                />
                              </svg>
                              <div>
                                <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)' }}>{overallPct}%</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Anggaran Terpakai</div>
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
                                <span style={{ fontWeight: '800', color: totalRemaining >= 0 ? 'var(--primary)' : 'var(--error)' }}>
                                  {totalRemaining >= 0 ? 'Rp ' : '-Rp '}{Math.abs(totalRemaining).toLocaleString('id-ID')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
                      {previewCategories.filter(c => c.type === 'expense').map(c => {
                        const b = previewBudgets.find(x => x.category_id === c.id) || { monthly_limit: 0, current_spent: 0 };
                        const limit = Number(b.monthly_limit);
                        const spent = Number(b.current_spent);
                        const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
                        const sisa = limit - spent;
                        const rounded = Math.min(Math.max(Math.round(pct / 10), 0), 10);
                        const bar = '█'.repeat(rounded) + '░'.repeat(10 - rounded);
                        return (
                          <div key={c.id} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: '700' }}>
                              <span>{c.emoji} {c.name}</span>
                              <span style={{ color: pct >= 100 ? 'var(--error)' : 'var(--text-muted)' }}>{pct}%</span>
                            </div>
                            <div style={{ fontSize: '1.1rem', letterSpacing: '1px', marginBottom: '8px' }}>{bar}</div>
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
                                      await handleUpdatePreviewBudget(c.id, newL);
                                    }
                                  }}
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                      const newL = Number((e.target as any).value);
                                      if (newL !== limit) {
                                        await handleUpdatePreviewBudget(c.id, newL);
                                        (e.target as any).blur();
                                      }
                                    }
                                  }}
                                  style={{ width: '120px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: 'rgba(10, 15, 30, 0.85)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)', color: 'var(--text-main)' }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub Tab: Wallet */}
                {previewUserTab === 'wallet' && (
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Dompet & Rekening Aktif</h3>
                      <button onClick={() => setShowPrevAddWallet(!showPrevAddWallet)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                        {showPrevAddWallet ? 'Batal' : '➕ Tambah Dompet'}
                      </button>
                    </div>

                    {showPrevAddWallet && (
                      <form onSubmit={handleAddPreviewWallet} className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '450px', background: 'var(--background)' }}>
                        <h4>➕ Tambah Dompet Baru</h4>
                        <div className="form-group">
                          <label htmlFor="prevWName">Nama Dompet / Bank</label>
                          <input id="prevWName" type="text" required placeholder="BCA, Cash, E-Wallet" value={prevNewWalletName} onChange={e => setPrevNewWalletName(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label htmlFor="prevWBalance">Saldo Awal (Rp)</label>
                          <input id="prevWBalance" type="number" required placeholder="1000000" value={prevNewWalletBalance} onChange={e => setPrevNewWalletBalance(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input type="checkbox" id="prevWDefault" checked={prevNewWalletDefault} onChange={e => setPrevNewWalletDefault(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                          <label htmlFor="prevWDefault" style={{ textTransform: 'none', fontSize: '0.9rem', cursor: 'pointer' }}>Set sebagai Default (Utama)</label>
                        </div>
                        <button type="submit" className="btn btn-primary">Simpan Dompet</button>
                      </form>
                    )}

                    <div className="grid-3">
                      {previewWallets.map(w => (
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
                                  style={{ width: '100%', padding: '6px 12px', fontSize: '0.9rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'rgba(10, 15, 30, 0.85)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)', color: 'var(--text-main)' }}
                                />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <input 
                                  type="number" 
                                  value={editingWalletBalance} 
                                  onChange={e => setEditingWalletBalance(e.target.value)} 
                                  placeholder="Saldo"
                                  style={{ width: '100%', padding: '6px 12px', fontSize: '0.9rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'rgba(10, 15, 30, 0.85)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)', color: 'var(--text-main)' }}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                <button onClick={() => handleSavePreviewWalletEdit(w.id)} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem', flex: 1 }}>Simpan</button>
                                <button onClick={() => handleDeletePreviewWallet(w.id)} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--error)', borderColor: 'var(--error)' }}>Hapus</button>
                              </div>
                            </div>
                          ) : (
                            <div className="stat-card" style={{ border: w.is_default ? '2px solid var(--primary)' : '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>👛</span>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {w.is_default && <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '100px' }}>DEFAULT</span>}
                                    <span onClick={() => { setEditingWalletId(w.id); setEditingWalletName(w.name); setEditingWalletBalance(String(w.balance)); }} style={{ cursor: 'pointer', fontSize: '0.85rem' }} title="Edit Dompet">✏️</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '12px' }}>{w.name}</div>
                              </div>
                              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--primary)', marginTop: '6px' }}>
                                Rp {Number(w.balance).toLocaleString('id-ID')}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub Tab: Settings */}
                {previewUserTab === 'settings' && (
                  <div className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div>
                      <h3>Pengaturan Sistem</h3>
                      <p style={{ color: 'var(--text-muted)' }}>Hubungkan Telegram Bot, atur pengingat harian, dan kelola kategori custom.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                      <div style={{ paddingBottom: '32px', borderBottom: '1px solid var(--border)' }}>
                        <h4 style={{ marginBottom: '12px' }}>🤖 Integrasi Telegram Bot</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.5' }}>
                          Mencatat keuangan semudah mengirim pesan chat. Hubungkan bot Telegram pribadi Anda menggunakan token dari BotFather.<br />
                          Jika tidak memiliki bot kustom, gunakan bot global Mencatat Aja dengan mengirimkan token pairing Anda di chat: <b>{prevTelegramToken}</b>
                        </p>
                        
                        <div className="form-group" style={{ maxWidth: '560px', width: '100%' }}>
                          <label htmlFor="prevBotToken" style={{ textTransform: 'none', fontSize: '0.85rem' }}>Token Bot Telegram Kustom (BYOB)</label>
                          <div className="byob-input-container" style={{ marginTop: '8px' }}>
                            <input
                              id="prevBotToken"
                              type="password"
                              placeholder="Paste token bot dari @BotFather di sini"
                              value={prevBotTokenInput}
                              onChange={e => setPrevBotTokenInput(e.target.value)}
                              className="byob-input"
                            />
                            <div className="byob-btn-group">
                              <button
                                type="button"
                                onClick={handleTestPreviewBotConnection}
                                disabled={prevBotStatus === 'testing'}
                                className="btn btn-primary byob-btn"
                              >
                                {prevBotStatus === 'testing' ? 'Testing...' : 'Test Koneksi'}
                              </button>
                            </div>
                          </div>
                          {prevBotStatusMsg && (
                            <p style={{ fontSize: '0.85rem', marginTop: '10px', color: prevBotStatus === 'connected' ? 'var(--success)' : 'var(--error)', fontWeight: '600' }}>
                              {prevBotStatusMsg}
                            </p>
                          )}
                        </div>
                      </div>

                      <div style={{ paddingBottom: '32px', borderBottom: '1px solid var(--border)' }}>
                        <h4 style={{ marginBottom: '12px' }}>⏰ Pengingat Pencatatan Harian</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>Kirimkan pengingat ke Telegram Anda agar tidak lupa mencatat pengeluaran hari ini.</p>
                        
                        <div className="form-group">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                              type="checkbox"
                              id="prevReminderOn"
                              checked={prevReminderActive}
                              onChange={e => setPrevReminderActive(e.target.checked)}
                              style={{ width: '20px', height: '20px' }}
                            />
                            <label htmlFor="prevReminderOn" style={{ fontSize: '1.05rem', textTransform: 'none', fontWeight: '600', color: 'var(--text-main)', cursor: 'pointer' }}>
                              Aktifkan Pengingat Harian
                            </label>
                          </div>
                        </div>

                        {prevReminderActive && (
                          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', paddingLeft: '32px' }}>
                            <div className="form-group" style={{ maxWidth: '300px' }}>
                              <label style={{ textTransform: 'none', fontSize: '0.85rem' }}>Frekuensi Pengingat</label>
                              <select
                                className="filter-select"
                                value={prevReminderFreq}
                                onChange={e => setPrevReminderFreq(e.target.value)}
                                style={{ width: '100%', marginTop: '6px' }}
                              >
                                <option value="1">1x Sehari (Sore)</option>
                                <option value="2">2x Sehari (Siang & Malam)</option>
                              </select>
                            </div>

                            <div className="form-group" style={{ maxWidth: '200px' }}>
                              <label style={{ textTransform: 'none', fontSize: '0.85rem' }}>Waktu Pengingat</label>
                              <input type="time" defaultValue="19:00" style={{ width: '100%', marginTop: '6px' }} />
                              {prevReminderFreq === '2' && (
                                <input type="time" defaultValue="12:00" style={{ width: '100%', marginTop: '8px' }} />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <h4 style={{ marginBottom: '12px' }}>🏷️ Kelola Kategori Kustom</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>Kelola daftar kategori transaksi beserta warna dan emoji pilihan Anda.</p>
                        <div className="wallet-select-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                          {previewCategories.map(c => (
                            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(13, 20, 38, 0.75)' }}>
                              <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>{c.emoji}</span>
                              <span style={{ fontWeight: '600', flex: 1 }}>{c.name}</span>
                              <span style={{ color: 'var(--text-light)', cursor: 'pointer' }}>✏️</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {previewUserTab === 'profile' && (
                  <div className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div>
                      <h3>Profil Pengguna & Top Up Kredit (Simulasi)</h3>
                      <p style={{ color: 'var(--text-muted)' }}>Kelola data profil Anda, status paket, dan isi ulang kredit AI.</p>
                    </div>

                    <div className="grid-2" style={{ gap: '32px' }}>
                      {/* Profile Details */}
                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', background: 'rgba(13, 20, 38, 0.75)' }}>
                        <h4 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>👤 Informasi Profil</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                            <span style={{ color: 'var(--text-light)', fontWeight: '600' }}>Nama Lengkap</span>
                            <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{previewUserName}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                            <span style={{ color: 'var(--text-light)', fontWeight: '600' }}>No. Handphone</span>
                            <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{previewUserPhone}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                            <span style={{ color: 'var(--text-light)', fontWeight: '600' }}>Status Paket</span>
                            <span className={`plan-badge ${previewUserPlan.toLowerCase()}`} style={{ fontWeight: '700' }}>{previewUserPlan} Plan</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                            <span style={{ color: 'var(--text-light)', fontWeight: '600' }}>Sisa Kredit AI</span>
                            <span style={{ fontWeight: '800', color: 'var(--primary)' }}>⚡ {previewUserCredits} Kredit</span>
                          </div>
                        </div>
                      </div>

                      {/* AI Credits Usage Guide */}
                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', backgroundColor: 'var(--primary-light)' }}>
                        <h4 style={{ marginBottom: '16px', color: 'var(--primary)' }}>💡 Penggunaan Kredit AI</h4>
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
                      <h4 style={{ marginBottom: '20px' }}>🛒 Paket Top Up Kredit AI</h4>
                      <div className="grid-3" style={{ gap: '20px' }}>
                        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', textAlign: 'center', backgroundColor: 'rgba(10, 15, 30, 0.85)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <span style={{ fontSize: '2rem' }}>🥉</span>
                            <h5 style={{ margin: '12px 0 8px 0', fontSize: '1rem' }}>Paket Hemat</h5>
                            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)', margin: '12px 0' }}>50 Kredit</div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '20px' }}>Cocok untuk uji coba pencatatan ringan.</p>
                          </div>
                          <button 
                            onClick={() => handleTopUpPreviewCredits(50, 15000)}
                            disabled={isToppingUp}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}
                          >
                            {isToppingUp ? 'Memproses...' : 'Beli Rp 15.000'}
                          </button>
                        </div>

                        <div style={{ border: '2px solid var(--primary)', borderRadius: '12px', padding: '24px', textAlign: 'center', backgroundColor: 'rgba(10, 15, 30, 0.85)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
                          <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--primary)', color: '#ffffff', fontSize: '0.65rem', fontWeight: '700', padding: '2px 8px', borderRadius: '100px', textTransform: 'uppercase' }}>Populer</span>
                          <div>
                            <span style={{ fontSize: '2rem' }}>🥈</span>
                            <h5 style={{ margin: '12px 0 8px 0', fontSize: '1rem' }}>Paket Standar</h5>
                            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)', margin: '12px 0' }}>120 Kredit</div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '20px' }}>Kebutuhan ideal bulanan pencatatan harian.</p>
                          </div>
                          <button 
                            onClick={() => handleTopUpPreviewCredits(120, 30000)}
                            disabled={isToppingUp}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}
                          >
                            {isToppingUp ? 'Memproses...' : 'Beli Rp 30.000'}
                          </button>
                        </div>

                        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', textAlign: 'center', backgroundColor: 'rgba(10, 15, 30, 0.85)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <span style={{ fontSize: '2rem' }}>🥇</span>
                            <h5 style={{ margin: '12px 0 8px 0', fontSize: '1rem' }}>Paket Pro</h5>
                            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)', margin: '12px 0' }}>300 Kredit</div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '20px' }}>Pencatatan intensif tak terbatas struk & VN.</p>
                          </div>
                          <button 
                            onClick={() => handleTopUpPreviewCredits(300, 60000)}
                            disabled={isToppingUp}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}
                          >
                            {isToppingUp ? 'Memproses...' : 'Beli Rp 60.000'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text-light)' }}>Silakan pilih salah satu pengguna dari dropdown di atas untuk memulai tinjauan.</p>
            )}
          </>
        )}

        {/* 7. AI CONFIGURATION (LiteLLM Compatible) */}
        {activeTab === 'ai_config' && (
          <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
              backgroundColor: 'rgba(10, 15, 30, 0.85)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'var(--text-main)',
              borderRadius: '16px',
              padding: '40px',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--border)'
            }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.8rem' }}>🤖</span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>AI Configuration</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '32px' }}>
                Konfigurasi AI central untuk semua edge function. API key dan model dipilih di sini — user biasa tidak bisa mengubah.
              </p>

              <form onSubmit={handleSaveAIConfig} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Base URL */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="aiBaseUrl" style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'none', width: 'auto', marginBottom: 0 }}>Base URL</label>
                  <input
                    id="aiBaseUrl"
                    type="text"
                    required
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(10, 15, 30, 0.85)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      color: 'var(--text-main)',
                      fontSize: '0.95rem'
                    }}
                    placeholder="http://100.80.46.70:20128/v1"
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Universal Gateway 9Router API URL (contoh: http://100.80.46.70:20128/v1)
                  </span>
                </div>

                {/* API Key with Show/Hide Eye Toggle */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="aiApiKey" style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'none', width: 'auto', marginBottom: 0 }}>API Key</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      id="aiApiKey"
                      type={showAiApiKey ? 'text' : 'password'}
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(10, 15, 30, 0.85)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        paddingRight: '48px',
                        color: 'var(--text-main)',
                        fontSize: '0.95rem'
                      }}
                      placeholder="Masukkan API Key Anda"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAiApiKey(!showAiApiKey)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showAiApiKey ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                {/* Fetch Models Button */}
                <div style={{ display: 'flex' }}>
                  <button
                    type="button"
                    onClick={handleFetchModels}
                    disabled={isFetchingModels}
                    style={{
                      background: 'var(--primary)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background 0.2s'
                    }}
                  >
                    {isFetchingModels ? '🔄 Loading Models...' : '🔄 Fetch Models'}
                  </button>
                </div>

                {/* Default Model */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="defaultAiModel" style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'none', width: 'auto', marginBottom: 0 }}>Default Model</label>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700' }}>⚡ Rekomendasi: combo</span>
                  </div>
                  
                  {/* Quick Model Badges */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    {['combo', 'gemini-2.5-flash', 'gpt-4o-mini', 'deepseek-chat', 'claude-3-5-sonnet'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setDefaultAiModel(preset);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('Mencatat_Aja_saved_ai_model', preset);
                          }
                        }}
                        style={{
                          background: defaultAiModel === preset ? 'rgba(147, 51, 234, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                          border: defaultAiModel === preset ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: defaultAiModel === preset ? '#c084fc' : 'var(--text-muted)',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        {preset === 'combo' ? '🔥 combo (Auto-Switch)' : preset}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="defaultAiModel"
                      type="text"
                      list="models-datalist"
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(10, 15, 30, 0.85)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        color: 'var(--text-main)',
                        fontSize: '0.95rem'
                      }}
                      placeholder="Ketik nama model (contoh: combo)"
                      value={defaultAiModel}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDefaultAiModel(val);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('Mencatat_Aja_saved_ai_model', val);
                        }
                      }}
                    />
                    <select
                      style={{
                        backgroundColor: 'rgba(10, 15, 30, 0.85)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        color: 'var(--text-main)',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        maxWidth: '200px'
                      }}
                      value={defaultAiModel}
                      onChange={(e) => {
                        const selected = e.target.value;
                        setDefaultAiModel(selected);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('Mencatat_Aja_saved_ai_model', selected);
                        }
                      }}
                    >
                      <option value="">Pilih Model...</option>
                      {modelsList.map(model => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>
                  <datalist id="models-datalist">
                    {modelsList.map(model => (
                      <option key={model} value={model} />
                    ))}
                  </datalist>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Model yang dipilih akan digunakan oleh semua AI edge functions. Gunakan <strong>combo</strong> untuk sistem Auto-Switch & Fallback 9Router.
                  </span>
                </div>

                {/* Submit button */}
                <div style={{ marginTop: '16px' }}>
                  <button
                    type="submit"
                    disabled={isSavingAiConfig}
                    style={{
                      background: 'var(--primary)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background 0.2s'
                    }}
                  >
                    💾 {isSavingAiConfig ? 'Menyimpan...' : 'Simpan Pengaturan AI'}
                  </button>
                </div>

              </form>

              {/* AI Chat Testing Widget */}
              <div style={{ marginTop: '40px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🤖 Uji Integrasi 9Router Gateway (Testing Mode)
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  Kirimkan pesan uji coba untuk memastikan bahwa Base URL, API Key, dan Model yang Anda masukkan di atas terhubung dan merespons dengan benar.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label htmlFor="testPrompt" style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'none', width: 'auto', marginBottom: 0 }}>Pesan / Prompt Uji Coba</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <input
                        id="testPrompt"
                        type="text"
                        style={{
                          flex: 1,
                          backgroundColor: 'rgba(10, 15, 30, 0.85)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          color: 'var(--text-main)',
                          fontSize: '0.95rem'
                        }}
                        placeholder="Ketik pesan Anda di sini (misal: Halo, perkenalkan dirimu)"
                        value={testPrompt}
                        onChange={(e) => setTestPrompt(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleTestAiChat}
                        disabled={isTestingAi}
                        style={{
                          background: 'var(--primary)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0 24px',
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'background 0.2s'
                        }}
                      >
                        {isTestingAi ? '🔄 Mengirim...' : '🚀 Kirim'}
                      </button>
                    </div>
                  </div>

                  {testReply && (
                    <div className="animate-slide-up" style={{
                      backgroundColor: 'var(--primary-light)',
                      border: '1px solid hsla(20, 100%, 50%, 0.15)',
                      borderRadius: '12px',
                      padding: '20px',
                      color: 'var(--text-main)'
                    }}>
                      <div style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)' }}>🤖 Respon AI 9Router Gateway:</div>
                      <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{testReply}</p>
                    </div>
                  )}

                  {testError && (
                    <div className="animate-slide-up" style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '12px',
                      padding: '18px 20px',
                      color: '#fca5a5',
                      fontSize: '0.9rem',
                      lineHeight: '1.6'
                    }}>
                      <div style={{ fontWeight: '800', color: '#ef4444', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>❌ Status:</span> {testError}
                      </div>

                      {aiBaseUrl.includes('100.') || aiBaseUrl.includes('localhost') || aiBaseUrl.includes('127.0.0.1') || aiBaseUrl.includes('192.168.') ? (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.83rem', color: '#e2e8f0' }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: '700', color: '#fef08a' }}>
                            💡 Mengapa terjadi error "fetch failed" pada IP <code>{aiBaseUrl}</code>?
                          </p>
                          <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px', color: '#cbd5e1' }}>
                            <li>Alamat <code>100.x.x.x</code> adalah IP internal <strong>Tailscale / VPN Private</strong>. Server cloud publik Vercel yang meng-hosting website ini tidak dapat mengakses jaringan private Anda tanpa Tunnel.</li>
                            <li>Browser modern di website HTTPS (<code>https://www.mencatat.my.id</code>) juga memblokir pemanggilan langsung ke <code>http://</code> (Mixed Content Security).</li>
                          </ul>
                          <p style={{ margin: '0 0 6px 0', fontWeight: '700', color: '#38bdf8' }}>
                            🚀 Solusi Termudah agar 9Router Anda dapat diakses 24/7 dari domain ini:
                          </p>
                          <ol style={{ margin: 0, paddingLeft: '20px', color: '#e2e8f0' }}>
                            <li>Jalankan <strong>Cloudflare Tunnel</strong> di komputer tempat 9Router berjalan:
                              <br /><code style={{ background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px' }}>cloudflared tunnel --url http://localhost:20128</code>
                            </li>
                            <li>Atau aktifkan <strong>Tailscale Funnel</strong>:
                              <br /><code style={{ background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px' }}>tailscale funnel 20128</code>
                            </li>
                            <li>Salin URL HTTPS publik yang dihasilkan (contoh: <code>https://your-tunnel.trycloudflare.com/v1</code>) ke kolom <strong>Base URL</strong> di atas, lalu klik <strong>💾 Simpan Pengaturan AI</strong>.</li>
                          </ol>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* 👑 EDIT LANGGANAN PENGGUNA MODAL (PIXEL-PERFECT MOCKUP) */}
      {showEditSubModal && selectedSubUser && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0, 0, 0, 0.78)', 
            backdropFilter: 'blur(8px)', 
            WebkitBackdropFilter: 'blur(8px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 999999, 
            padding: '20px' 
          }}
          onClick={() => setShowEditSubModal(false)}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              background: '#0d1527', 
              border: '1px solid rgba(255, 255, 255, 0.12)', 
              color: '#f8fafc', 
              borderRadius: '20px', 
              maxWidth: '480px', 
              width: '100%', 
              padding: '24px 26px', 
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85)', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '18px'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>👑</span> Edit Langganan Pengguna
              </h3>
              <button 
                onClick={() => setShowEditSubModal(false)} 
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8', padding: '4px', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* User Info Card */}
            <div style={{ background: '#151f38', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '14px 18px', borderRadius: '12px' }}>
              <div style={{ fontWeight: '700', color: '#ffffff', fontSize: '1rem' }}>{selectedSubUser.name}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '3px' }}>{selectedSubUser.email || '-'}</div>
            </div>

            {/* Tambah Masa Aktif */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ffffff' }}>Tambah Masa Aktif (Hari):</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { label: '+30 Hari', days: 30 },
                  { label: '+90 Hari', days: 90 },
                  { label: '+180 Hari', days: 180 },
                  { label: '+1 Tahun', days: 365 },
                ].map(item => {
                  const isSelected = subModalDays === item.days;
                  return (
                    <button 
                      key={item.days}
                      type="button" 
                      onClick={() => setSubModalDays(item.days)} 
                      style={{ 
                        padding: '10px 4px', 
                        borderRadius: '8px', 
                        border: isSelected ? 'none' : '1px solid rgba(255, 255, 255, 0.08)', 
                        background: isSelected ? '#10b981' : '#151f38', 
                        color: '#ffffff', 
                        fontWeight: isSelected ? '800' : '600', 
                        fontSize: '0.8rem', 
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <input
                type="number"
                value={subModalDays}
                onChange={e => setSubModalDays(Number(e.target.value))}
                style={{ 
                  padding: '12px 16px', 
                  borderRadius: '10px', 
                  border: '1px solid rgba(255, 255, 255, 0.12)', 
                  background: '#090e1a', 
                  color: '#ffffff', 
                  fontSize: '0.92rem', 
                  fontWeight: '600',
                  marginTop: '2px',
                  width: '100%'
                }}
              />
            </div>

            {/* Akses Gratis VIP Card */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'rgba(245, 158, 11, 0.04)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#f59e0b' }}>Akses Gratis (Free Access VIP)</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>Berikan paket Pro aktif selamanya</div>
              </div>
              <input
                type="checkbox"
                checked={subModalFreeAccess}
                onChange={e => {
                  setSubModalFreeAccess(e.target.checked);
                  if (e.target.checked) setSubModalPlan('Pro');
                }}
                style={{ width: '20px', height: '20px', accentColor: '#10b981', cursor: 'pointer', borderRadius: '4px' }}
              />
            </div>

            {/* Catatan Admin */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ffffff' }}>Catatan Admin:</label>
              <textarea
                rows={2}
                value={subModalNotes}
                onChange={e => setSubModalNotes(e.target.value)}
                placeholder="Misal: Perpanjangan transfer manual BCA #INV-882"
                style={{ 
                  padding: '12px 16px', 
                  borderRadius: '10px', 
                  border: '1px solid rgba(255, 255, 255, 0.12)', 
                  background: '#090e1a', 
                  color: '#ffffff', 
                  fontSize: '0.88rem',
                  resize: 'vertical',
                  width: '100%'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowEditSubModal(false)}
                className="btn"
                style={{ 
                  background: '#151f38', 
                  border: '1px solid rgba(255, 255, 255, 0.12)', 
                  color: '#e2e8f0', 
                  padding: '10px 22px', 
                  borderRadius: '10px', 
                  fontWeight: '700', 
                  fontSize: '0.9rem',
                  cursor: 'pointer' 
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveSubscription}
                disabled={isSavingSub}
                className="btn"
                style={{ 
                  background: '#10b981', 
                  color: '#ffffff', 
                  padding: '10px 24px', 
                  borderRadius: '10px', 
                  fontWeight: '700', 
                  fontSize: '0.9rem', 
                  border: 'none', 
                  cursor: isSavingSub ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  opacity: isSavingSub ? 0.8 : 1
                }}
              >
                {isSavingSub ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPLE LIQUID GLASS LIGHTBOX PROOF MODAL */}
      {selectedProofModal && (
        <div className="glass-modal-backdrop" onClick={() => setSelectedProofModal(null)}>
          <div className="glass-modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                  🖼️ Detail Bukti Transfer
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  {selectedProofModal.user} • <strong style={{ color: '#059669' }}>{selectedProofModal.amount}</strong>
                </p>
              </div>
              <button 
                onClick={() => setSelectedProofModal(null)}
                style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: '700', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)', background: '#f8fafc', marginBottom: '20px', textAlign: 'center', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.05)' }}>
              <img 
                src={selectedProofModal.proof} 
                alt="Bukti Transfer Detail" 
                style={{ maxWidth: '100%', maxHeight: '340px', objectFit: 'contain', display: 'block', margin: '0 auto', padding: '12px' }} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={() => setSelectedProofModal(null)} 
                className="btn-liquid-rose" 
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Tutup
              </button>
              {selectedProofModal.status === 'pending' && (
                <button 
                  onClick={() => {
                    const { id, userId, user } = selectedProofModal;
                    setSelectedProofModal(null);
                    handleApprovePayment(id, userId, user);
                  }} 
                  className="btn-liquid-emerald" 
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  ✓ Approve Sekarang
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
