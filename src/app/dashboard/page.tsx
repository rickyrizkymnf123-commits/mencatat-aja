'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  FileSpreadsheet,
  PlusCircle,
  Sparkles,
  ChevronRight,
  CreditCard,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { formatIDR } from '@/lib/telegram';
import { Transaction, Wallet as WalletType, Category, UserProfile } from '@/types';
import Link from 'next/link';

export default function DashboardOverviewPage() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  async function fetchDashboardData() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setupDemoData();
      setLoading(false);
      return;
    }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: wList } = await supabase.from('wallets').select('*').eq('user_id', user.id);
    const { data: cList } = await supabase.from('categories').select('*').eq('user_id', user.id);
    const { data: txList } = await supabase
      .from('transactions')
      .select('*, wallet:wallets(*), category:categories(*)')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .limit(10);

    setProfile(prof as UserProfile);
    setWallets(wList || []);
    setCategories(cList || []);
    setTransactions(txList || []);
    setLoading(false);
  }

  function setupDemoData() {
    setProfile({
      id: 'demo',
      email: 'user@mencatat.id',
      phone_number: '08123456789',
      phone_verified: true,
      full_name: 'Budi Pratama',
      plan: 'pro',
      role: 'user',
      telegram_connection_status: 'connected',
      google_sheet_url: 'https://docs.google.com/spreadsheets',
      default_currency: 'IDR',
      reminder_enabled: true,
      reminder_frequency: 1,
      reminder_times: ['20:00'],
      created_at: '',
      updated_at: '',
    });

    setWallets([
      { id: 'w1', user_id: 'd', name: 'Cash / Tunai', balance: 1250000, is_default: true, color: '#10b981', icon: 'wallet', created_at: '', updated_at: '' },
      { id: 'w2', user_id: 'd', name: 'BCA Utama', balance: 8450000, is_default: false, color: '#3b82f6', icon: 'credit-card', created_at: '', updated_at: '' },
      { id: 'w3', user_id: 'd', name: 'GoPay', balance: 350000, is_default: false, color: '#00a5cf', icon: 'smartphone', created_at: '', updated_at: '' },
    ]);

    setTransactions([
      { id: 't1', user_id: 'd', wallet_id: 'w1', type: 'expense', amount: 35000, notes: 'Makan Bakso Solo', transaction_date: new Date().toISOString(), source: 'telegram_text', category: { id: 'c1', user_id: 'd', name: 'Makanan', emoji: '🍜', color: '#10b981', type: 'expense', monthly_budget: 1500000, created_at: '' }, wallet: { id: 'w1', user_id: 'd', name: 'Cash', balance: 1250000, is_default: true, color: '', icon: '', created_at: '', updated_at: '' }, created_at: '' },
      { id: 't2', user_id: 'd', wallet_id: 'w2', type: 'income', amount: 7500000, notes: 'Gaji Bulanan Sept', transaction_date: new Date(Date.now() - 86400000).toISOString(), source: 'web', category: { id: 'c2', user_id: 'd', name: 'Gaji', emoji: '💼', color: '#3b82f6', type: 'income', monthly_budget: 0, created_at: '' }, wallet: { id: 'w2', user_id: 'd', name: 'BCA Utama', balance: 8450000, is_default: false, color: '', icon: '', created_at: '', updated_at: '' }, created_at: '' },
      { id: 't3', user_id: 'd', wallet_id: 'w3', type: 'expense', amount: 50000, notes: 'Gojek ke Kantor', transaction_date: new Date(Date.now() - 172800000).toISOString(), source: 'telegram_text', category: { id: 'c3', user_id: 'd', name: 'Transport', emoji: '🚗', color: '#f59e0b', type: 'expense', monthly_budget: 800000, created_at: '' }, wallet: { id: 'w3', user_id: 'd', name: 'GoPay', balance: 350000, is_default: false, color: '', icon: '', created_at: '', updated_at: '' }, created_at: '' },
    ]);
  }

  const totalBalance = wallets.reduce((acc, w) => acc + Number(w.balance), 0);
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalBudget = categories.reduce((acc, c) => acc + Number(c.monthly_budget || 0), 0);
  const remainingBudget = Math.max(totalBudget - totalExpense, 0);

  const categoryPieData = [
    { name: 'Makanan', value: 1250000, color: '#10b981' },
    { name: 'Transport', value: 650000, color: '#3b82f6' },
    { name: 'Tagihan', value: 850000, color: '#f59e0b' },
    { name: 'Belanja', value: 450000, color: '#ec4899' },
    { name: 'Hiburan', value: 300000, color: '#8b5cf6' },
  ];

  const sixMonthComparisonData = [
    { month: 'Apr', pemasukan: 6500000, pengeluaran: 4200000 },
    { month: 'Mei', pemasukan: 7000000, pengeluaran: 4800000 },
    { month: 'Jun', pemasukan: 6800000, pengeluaran: 4100000 },
    { month: 'Jul', pemasukan: 7200000, pengeluaran: 5000000 },
    { month: 'Agu', pemasukan: 7500000, pengeluaran: 4600000 },
    { month: 'Sep', pemasukan: 7500000, pengeluaran: 3500000 },
  ];

  const dailyTrendData = [
    { day: '1', nominal: 45000 },
    { day: '5', nominal: 120000 },
    { day: '10', nominal: 350000 },
    { day: '15', nominal: 85000 },
    { day: '20', nominal: 220000 },
    { day: '25', nominal: 150000 },
    { day: '30', nominal: 95000 },
  ];

  return (
    <div className="space-y-8 pb-12 font-sans text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Overview Keuangan</h1>
          <p className="text-xs text-slate-400 mt-1">
            Pantau arus kas, budget, dan statistik transaksi dalam tampilan futuristik.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  period === p ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : p === 'monthly' ? 'Bulanan' : 'Tahunan'}
              </button>
            ))}
          </div>

          <a
            href={profile?.google_sheet_url || 'https://docs.google.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-500/30 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Buka Google Sheet Saya</span>
          </a>
        </div>
      </div>

      {/* 4 Stats Cards ($1B Glassmorphism Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Saldo Total */}
        <div className="p-5 glass-card rounded-2xl border border-slate-800/80 glass-card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo Total</span>
            <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white tracking-tight block">{formatIDR(totalBalance)}</span>
            <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">{wallets.length} dompet aktif</span>
          </div>
        </div>

        {/* Card 2: Pemasukan */}
        <div className="p-5 glass-card rounded-2xl border border-slate-800/80 glass-card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pemasukan Bulan Ini</span>
            <div className="p-2.5 bg-blue-500/15 text-blue-400 rounded-xl border border-blue-500/30">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-blue-400 tracking-tight block">{formatIDR(totalIncome)}</span>
            <span className="text-[11px] text-slate-400 mt-1 block capitalize">Periode {period}</span>
          </div>
        </div>

        {/* Card 3: Pengeluaran */}
        <div className="p-5 glass-card rounded-2xl border border-slate-800/80 glass-card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pengeluaran Bulan Ini</span>
            <div className="p-2.5 bg-rose-500/15 text-rose-400 rounded-xl border border-rose-500/30">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-rose-400 tracking-tight block">{formatIDR(totalExpense)}</span>
            <span className="text-[11px] text-slate-400 mt-1 block capitalize">Periode {period}</span>
          </div>
        </div>

        {/* Card 4: Budget Tersisa */}
        <div className="p-5 glass-card rounded-2xl border border-slate-800/80 glass-card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Budget Tersisa</span>
            <div className="p-2.5 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/30">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-400 tracking-tight block">{formatIDR(remainingBudget)}</span>
            <span className="text-[11px] text-slate-400 mt-1 block">Dari budget {formatIDR(totalBudget)}</span>
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 glass-card rounded-3xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-white">Pengeluaran per Kategori</h3>
            <p className="text-xs text-slate-400 mt-0.5">Proporsi pengeluaran bulan ini</p>
          </div>
          <div className="h-64 my-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                  {categoryPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '12px' }} formatter={(val: any) => formatIDR(Number(val))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {categoryPieData.map((cat) => (
              <div key={cat.name} className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-slate-300 font-medium truncate">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 p-6 glass-card rounded-3xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-white">Pemasukan vs Pengeluaran (6 Bulan)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Perbandingan arus kas keluar & masuk</p>
          </div>
          <div className="h-64 my-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sixMonthComparisonData}>
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `${val / 1000000}jt`} />
                <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '12px' }} formatter={(val: any) => formatIDR(Number(val))} />
                <Legend />
                <Bar dataKey="pemasukan" name="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Daily Trend Line */}
      <div className="p-6 glass-card rounded-3xl border border-slate-800/80">
        <h3 className="text-base font-extrabold text-white">Trend Line Pengeluaran Harian</h3>
        <p className="text-xs text-slate-400 mt-0.5">Dinamika pengeluaran setiap hari</p>
        <div className="h-56 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyTrendData}>
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `${val / 1000}k`} />
              <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '12px' }} formatter={(val: any) => formatIDR(Number(val))} />
              <Line type="monotone" dataKey="nominal" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 10 Recent Transactions List */}
      <div className="p-6 glass-card rounded-3xl border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-white">10 Transaksi Terbaru</h3>
            <p className="text-xs text-slate-400 mt-0.5">Catatan terkini dari Telegram & Web</p>
          </div>
          <Link href="/dashboard/transactions" className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
            <span>Lihat Semua</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="divide-y divide-slate-800/60">
          {transactions.map((tx) => (
            <div key={tx.id} className="py-3.5 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-xl transition-all">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg">
                  {tx.category?.emoji || (tx.type === 'income' ? '💼' : '💸')}
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">{tx.notes || tx.category?.name}</span>
                  <span className="text-[11px] text-slate-400">{new Date(tx.transaction_date).toLocaleDateString('id-ID')} • {tx.wallet?.name || 'Cash'}</span>
                </div>
              </div>
              <span className={`text-sm font-extrabold ${tx.type === 'income' ? 'text-emerald-400' : 'text-slate-100'}`}>
                {tx.type === 'income' ? '+' : '-'}{formatIDR(Number(tx.amount))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
