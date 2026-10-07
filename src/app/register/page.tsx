'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock, Mail, Phone, User, Clock, ShieldCheck, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [step, setStep] = useState<'form' | 'pending'>('form');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, password }),
      });

      const data = await res.json();
      if (!data.ok) {
        setErrorMsg(data.error || 'Pendaftaran gagal');
        setLoading(false);
        return;
      }

      setSuccessMsg(data.message || 'Pendaftaran berhasil. Akun kamu dalam antrean persetujuan Admin.');
      setStep('pending');
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#040711] text-slate-100 font-sans">
      {/* KIRI (40%) — Branding Panel */}
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
            <span>Alur Persetujuan Admin (ACC)</span>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
            Keuanganmu. <br />
            <span className="gradient-text-emerald">Terkontrol.</span>
          </h2>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            Daftar sekarang. Akun kamu akan diverifikasi dan di-ACC oleh Admin sebelum dapat mengakses dashboard.
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
              {step === 'form' ? 'Buat Akun mencatat.id' : 'Pendaftaran Berhasil! 🎉'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {step === 'form'
                ? 'Isi formulir pendaftaran untuk mengajukan akun'
                : 'Akun dalam proses verifikasi & persetujuan Admin'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-2xl">
              {errorMsg}
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nama Lengkap</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Pratama"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
                  />
                </div>
              </div>

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
                <label className="text-xs font-bold text-slate-300 block mb-1">Nomor HP / WhatsApp (Untuk Bot Telegram)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="081234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                    placeholder="Minimal 6 karakter"
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
                <span>{loading ? 'Memproses...' : 'Daftarkan Akun'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 'pending' && (
            <div className="p-6 bg-slate-900 border border-emerald-500/30 rounded-3xl space-y-5 text-center shadow-2xl">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">Menunggu Persetujuan Admin (ACC)</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{successMsg}</p>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <Link
                  href="/login"
                  className="w-full inline-block py-3 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-2xl border border-slate-700"
                >
                  Ke Halaman Login
                </Link>
              </div>
            </div>
          )}

          <div className="text-center text-xs text-slate-400 pt-4">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-bold text-emerald-400 hover:underline">
              Masuk Sekarang
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
