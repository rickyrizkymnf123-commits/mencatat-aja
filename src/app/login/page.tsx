'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock, Mail, ShieldCheck, Clock, AlertTriangle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusState, setStatusState] = useState<'idle' | 'pending' | 'rejected' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatusState('idle');
    setMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.ok) {
        if (data.statusState === 'pending') {
          setStatusState('pending');
          setMessage(data.error);
        } else if (data.statusState === 'rejected') {
          setStatusState('rejected');
          setMessage(data.error);
        } else {
          setStatusState('error');
          setMessage(data.error || 'Gagal masuk. Periksa email dan password.');
        }
        setLoading(false);
        return;
      }

      window.location.href = data.redirectUrl || '/dashboard';
    } catch (err: any) {
      setStatusState('error');
      setMessage(err.message || 'Terjadi kesalahan sistem');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#040711] text-slate-100 font-sans">
      {/* KIRI (40%) — Branding Panel (Desktop Only) */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-12 flex-col justify-between text-white relative overflow-hidden border-r border-slate-800">
        <div className="relative z-10">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg">
              m
            </div>
            <span className="font-extrabold text-2xl tracking-tight">mencatat.id</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-3.5 py-1 rounded-full text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Persetujuan Admin Wajib (ACC)</span>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
            Selamat Datang <br />
            <span className="gradient-text-emerald">Kembali!</span>
          </h2>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            Masuk untuk memantau saldo, budget, dan Google Sheet privat milik kamu setelah akun disetujui.
          </p>
        </div>

        <div className="relative z-10 text-xs text-slate-500 font-medium">
          © 2026 mencatat.id. Seluruh hak cipta dilindungi.
        </div>
      </div>

      {/* KANAN (60%) — Form Section */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Masuk ke mencatat.id
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Masukkan email dan password akun kamu
            </p>
          </div>

          {/* Pending / Rejected / Error Notice Cards */}
          {statusState === 'pending' && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 font-bold text-amber-400">
                <Clock className="w-4 h-4 animate-spin" />
                <span>Menunggu ACC Admin</span>
              </div>
              <p className="leading-relaxed">{message}</p>
            </div>
          )}

          {statusState === 'rejected' && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 font-bold text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Akun Ditolak</span>
              </div>
              <p className="leading-relaxed">{message}</p>
            </div>
          )}

          {statusState === 'error' && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-2xl">
              {message}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Password akun"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  title={showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Memproses...' : 'Masuk'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center text-xs text-slate-400 pt-4">
            Belum punya akun?{' '}
            <Link href="/register" className="font-bold text-emerald-400 hover:underline">
              Daftar Sekarang
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
