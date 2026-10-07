'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, PlusCircle, Star, X, RefreshCw } from 'lucide-react';
import { formatIDR } from '@/lib/telegram';
import { Wallet as WalletType, UserProfile } from '@/types';

export default function WalletPage() {
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState('#10b981');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadWallets();
  }, []);

  async function loadWallets() {
    setLoading(true);
    try {
      // 1. Try fetching from server API
      const res = await fetch('/api/wallets');
      const data = await res.json();

      if (data.ok && data.wallets && data.wallets.length > 0) {
        setWallets(data.wallets);
        // Sync to localStorage for instant local persistence
        localStorage.setItem('mencatat_wallets_cache', JSON.stringify(data.wallets));
      } else {
        // Fallback to localStorage if available
        const cached = localStorage.getItem('mencatat_wallets_cache');
        if (cached) {
          setWallets(JSON.parse(cached));
        } else {
          setupDefaultWallets();
        }
      }
    } catch (err) {
      console.error('Error loading wallets:', err);
      const cached = localStorage.getItem('mencatat_wallets_cache');
      if (cached) setWallets(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  }

  function setupDefaultWallets() {
    const defaultList: WalletType[] = [
      { id: 'w1', user_id: 'local', name: 'Cash / Tunai', balance: 1250000, is_default: true, color: '#10b981', icon: 'wallet', created_at: '', updated_at: '' },
      { id: 'w2', user_id: 'local', name: 'BCA Utama', balance: 8450000, is_default: false, color: '#3b82f6', icon: 'credit-card', created_at: '', updated_at: '' },
      { id: 'w3', user_id: 'local', name: 'GoPay', balance: 350000, is_default: false, color: '#00a5cf', icon: 'smartphone', created_at: '', updated_at: '' },
    ];
    setWallets(defaultList);
    localStorage.setItem('mencatat_wallets_cache', JSON.stringify(defaultList));
  }

  async function handleCreateWallet(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Nama dompet wajib diisi');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Call API to insert wallet in database
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          balance: parseFloat(balance) || 0,
          color,
          isDefault: wallets.length === 0,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setErrorMsg(data.error || 'Gagal menyimpan dompet baru');
        setSubmitting(false);
        return;
      }

      // 2. Immediately add to local state & localStorage for instant zero-latency UI update
      const newW = data.wallet || {
        id: `w_local_${Date.now()}`,
        user_id: 'local',
        name: name.trim(),
        balance: parseFloat(balance) || 0,
        is_default: wallets.length === 0,
        color: color || '#10b981',
        icon: 'wallet',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedList = [...wallets, newW];
      setWallets(updatedList);
      localStorage.setItem('mencatat_wallets_cache', JSON.stringify(updatedList));

      // Reset form & close modal
      setShowModal(false);
      setName('');
      setBalance('');
      loadWallets();
    } catch (err: any) {
      // Fallback local save if offline
      const newW: WalletType = {
        id: `w_local_${Date.now()}`,
        user_id: 'local',
        name: name.trim(),
        balance: parseFloat(balance) || 0,
        is_default: wallets.length === 0,
        color: color || '#10b981',
        icon: 'wallet',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedList = [...wallets, newW];
      setWallets(updatedList);
      localStorage.setItem('mencatat_wallets_cache', JSON.stringify(updatedList));
      setShowModal(false);
      setName('');
      setBalance('');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetDefaultWallet(walletId: string) {
    try {
      await fetch('/api/wallets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId, isDefault: true }),
      });
    } catch (err) {}

    const updated = wallets.map((w) => ({
      ...w,
      is_default: w.id === walletId,
    }));
    setWallets(updated);
    localStorage.setItem('mencatat_wallets_cache', JSON.stringify(updated));
  }

  return (
    <div className="space-y-6 font-sans text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Kelola Multi Wallet</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Buat beberapa dompet (BCA, Mandiri, Cash, GoPay, OVO) dan pilih 1 sebagai default Telegram.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setShowModal(true);
          }}
          className="flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Tambah Dompet Baru</span>
        </button>
      </div>

      {/* Wallets Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Memuat daftar dompet...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {wallets.map((w) => (
            <div
              key={w.id}
              className={`p-5 glass-card rounded-3xl border transition-all space-y-4 relative ${
                w.is_default ? 'border-emerald-500 shadow-xl ring-1 ring-emerald-500/30' : 'border-slate-800 shadow-md'
              }`}
            >
              {w.is_default && (
                <span className="absolute top-4 right-4 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center space-x-1">
                  <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                  <span>Default Telegram</span>
                </span>
              )}

              <div className="flex items-center space-x-3">
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md"
                  style={{ backgroundColor: w.color || '#10b981' }}
                >
                  <Wallet className="w-6 h-6 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{w.name}</h3>
                  <span className="text-xs text-slate-400">Saldo Dompet</span>
                </div>
              </div>

              <div>
                <span className="text-2xl font-black text-white tracking-tight block">
                  {formatIDR(Number(w.balance))}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                {!w.is_default ? (
                  <button
                    onClick={() => handleSetDefaultWallet(w.id)}
                    className="text-emerald-400 font-bold hover:underline"
                  >
                    Set Jadi Default Telegram
                  </button>
                ) : (
                  <span className="text-slate-400 text-[11px]">Digunakan otomatis dari Telegram</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Wallet */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-extrabold text-white">Tambah Dompet Baru</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateWallet} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nama Dompet / Bank</label>
                <input
                  type="text"
                  placeholder="Contoh: BCA Utama, Cash, GoPay, OVO"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Saldo Awal (Rp)</label>
                <input
                  type="number"
                  placeholder="Contoh: 1500000"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Pilih Warna Akses</label>
                <div className="flex items-center space-x-2 pt-1">
                  {['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition-all"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Dompet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
