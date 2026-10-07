'use client';

import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Filter, ArrowUpRight, ArrowDownRight, ArrowRightLeft, Calendar, FileSpreadsheet, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatIDR } from '@/lib/telegram';
import { Transaction, Wallet, Category } from '@/types';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');

  // New Transaction Form State
  const [txType, setTxType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: wList } = await supabase.from('wallets').select('*').eq('user_id', user.id);
    const { data: cList } = await supabase.from('categories').select('*').eq('user_id', user.id);
    const { data: tList } = await supabase
      .from('transactions')
      .select('*, wallet:wallets(*), category:categories(*)')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false });

    if (wList) setWallets(wList);
    if (cList) setCategories(cList);
    if (tList) setTransactions(tList);
  }

  async function handleCreateTransaction(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const targetWalletId = walletId || (wallets.length > 0 ? wallets[0].id : null);
    if (!targetWalletId) return;

    // 1. Insert Transaction
    await supabase.from('transactions').insert({
      user_id: user.id,
      wallet_id: targetWalletId,
      to_wallet_id: txType === 'transfer' ? toWalletId : null,
      category_id: txType !== 'transfer' ? categoryId : null,
      type: txType,
      amount: numAmount,
      notes: notes || (txType === 'income' ? 'Pemasukan Web' : 'Pengeluaran Web'),
      source: 'web',
      transaction_date: new Date().toISOString(),
    });

    // 2. Update Wallet balance
    const currentWallet = wallets.find((w) => w.id === targetWalletId);
    if (currentWallet) {
      const newBal = txType === 'income' ? Number(currentWallet.balance) + numAmount : Number(currentWallet.balance) - numAmount;
      await supabase.from('wallets').update({ balance: newBal }).eq('id', targetWalletId);
    }

    if (txType === 'transfer' && toWalletId) {
      const targetToWallet = wallets.find((w) => w.id === toWalletId);
      if (targetToWallet) {
        await supabase.from('wallets').update({ balance: Number(targetToWallet.balance) + numAmount }).eq('id', toWalletId);
      }
    }

    setShowModal(false);
    setAmount('');
    setNotes('');
    loadData();
  }

  const filteredTransactions = transactions.filter((t) => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesSearch =
      (t.notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.category?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Daftar Transaksi</h1>
          <p className="text-xs text-slate-400 mt-0.5">Kelola dan catat transaksi keuangan kamu</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-emerald-500/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Tambah Transaksi Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 glass-card rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari transaksi / catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto">
          {(['all', 'expense', 'income', 'transfer'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-all ${
                filterType === t ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {t === 'all' ? 'Semua' : t === 'expense' ? 'Pengeluaran' : t === 'income' ? 'Pemasukan' : 'Transfer'}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-40 text-emerald-400" />
            <p className="text-xs font-bold text-slate-300">Belum ada transaksi ditemukan.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-all">
                <div className="flex items-center space-x-3">
                  <div
                    className={`h-11 w-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                      tx.type === 'income' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : tx.type === 'transfer' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {tx.category?.emoji || (tx.type === 'income' ? '💼' : tx.type === 'transfer' ? '🔄' : '💸')}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">{tx.notes || tx.category?.name || 'Transaksi'}</span>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                      <span>{new Date(tx.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-300">{tx.wallet?.name || 'Cash'}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold capitalize">via {tx.source}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-sm font-black block ${
                      tx.type === 'income' ? 'text-emerald-400' : tx.type === 'transfer' ? 'text-amber-400' : 'text-white'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '-'}{formatIDR(Number(tx.amount))}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">{tx.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-extrabold text-white">Tambah Transaksi Baru</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['expense', 'income', 'transfer'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTxType(t)}
                    className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                      txType === t ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    {t === 'expense' ? 'Pengeluaran' : t === 'income' ? 'Pemasukan' : 'Transfer'}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  placeholder="Contoh: 50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-extrabold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Dompet / Wallet</label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Saldo: {formatIDR(Number(w.balance))})
                    </option>
                  ))}
                </select>
              </div>

              {txType === 'transfer' && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Ke Dompet Mana?</label>
                  <select
                    value={toWalletId}
                    onChange={(e) => setToWalletId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="">Pilih wallet tujuan...</option>
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {txType !== 'transfer' && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Kategori</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="">Pilih Kategori...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Catatan</label>
                <input
                  type="text"
                  placeholder="Catatan transaksi..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 text-slate-950 hover:bg-emerald-400 rounded-xl text-xs font-black shadow-lg"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
