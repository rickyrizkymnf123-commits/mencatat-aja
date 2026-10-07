'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Bot,
  CheckCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Play,
  Lock,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { formatIDR } from '@/lib/telegram';

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#040711] text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* 1. NAVBAR (Sticky & Glassmorphism) */}
      <header className="sticky top-0 z-50 bg-[#040711]/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/20">
              m
            </div>
            <span className="font-extrabold text-white text-xl tracking-tight">mencatat.id</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-slate-400">
            <a href="#fitur" className="hover:text-emerald-400 transition-colors">Fitur Utama</a>
            <a href="#demo" className="hover:text-emerald-400 transition-colors">Demo Interactive</a>
            <a href="#harga" className="hover:text-emerald-400 transition-colors">Paket & Harga</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center space-x-3">
            <Link href="/login" className="text-xs font-bold text-slate-300 hover:text-white px-3.5 py-2">
              Masuk
            </Link>
            <Link
              href="/register"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
            >
              Coba Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* 2 - 6. HERO SECTION ($1B Dark Glow Aesthetic) */}
      <section className="relative pt-16 pb-24 overflow-hidden bg-grid-pattern">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/20 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 text-center space-y-8 relative z-10">
          {/* Pre-headline Badge */}
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-emerald-500/5 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>✨ Catat keuangan langsung dari Telegram kamu</span>
          </div>

          {/* Headline H1 */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Gaji habis sebelum akhir bulan? <br />
            Saatnya tahu <span className="gradient-text-emerald">ke mana uangmu pergi.</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            mencatat.id mencatat setiap pengeluaranmu langsung dari chat Telegram atau foto struk — sisanya kami yang urus secara otomatis.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 px-8 py-4 rounded-2xl text-sm font-black shadow-xl shadow-emerald-500/25 transition-all hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>Mulai Gratis Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 px-7 py-4 rounded-2xl text-sm font-bold shadow-md transition-all flex items-center justify-center space-x-2 backdrop-blur-md"
            >
              <span>Lihat cara kerjanya →</span>
            </a>
          </div>

          {/* Hero Video Placeholder */}
          <div className="pt-12 max-w-4xl mx-auto">
            {/* TODO: Ganti dengan video demo asli setelah ada beta user */}
            <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 aspect-video flex flex-col items-center justify-center group emerald-glow">
              <div className="h-20 w-20 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform cursor-pointer">
                <Play className="w-9 h-9 fill-slate-950 ml-1.5" />
              </div>
              <span className="text-xs text-slate-200 font-bold mt-4">
                [ Placeholder Video Demo mencatat.id ]
              </span>
              <span className="text-[10px] text-slate-500">Klik untuk memutar penjelasan 1 menit</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7 & 8. RELATABLE PROBLEM & SOLUTION */}
      <section className="py-24 bg-[#070b14] border-y border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-widest block">Relatable Problem</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Pernah Mengalami Hal-Hal Ini?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-7 glass-card rounded-3xl space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center text-2xl font-bold border border-rose-500/30">
                😤
              </div>
              <h3 className="text-base font-extrabold text-white">&quot;Buka aplikasi keuangan? Nanti dulu deh...&quot;</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aplikasi keuangan biasa terlalu ribet. Harus login, pilih kategori bertingkat, akhirnya malas mencatat.
              </p>
            </div>

            <div className="p-7 glass-card rounded-3xl space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-2xl font-bold border border-amber-500/30">
                💸
              </div>
              <h3 className="text-base font-extrabold text-white">&quot;Kok uangnya habis ya? Padahal tidak beli apa-apa&quot;</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pengeluaran kecil seperti jajan kopi 20rb, parkir 5rb, atau jajan boba tak pernah tercatat sampai saldo mendadak nol.
              </p>
            </div>

            <div className="p-7 glass-card rounded-3xl space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center text-2xl font-bold border border-blue-500/30">
                📊
              </div>
              <h3 className="text-base font-extrabold text-white">&quot;Udah niat bikin budget, tapi seminggu lupa&quot;</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tanpa pengingat otomatis di aplikasi yang setiap hari kamu buka, budget bulanan cuma tinggal wacana.
              </p>
            </div>
          </div>

          {/* Solution Transition */}
          <div className="p-8 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/30 text-white rounded-3xl shadow-2xl space-y-4 text-center">
            <h3 className="text-2xl font-black">
              Bagaimana kalau mencatat keuangan semudah kirim pesan ke teman?
            </h3>
            <p className="text-xs sm:text-sm text-emerald-200 max-w-xl mx-auto leading-relaxed">
              Introducing <span className="font-extrabold text-white">mencatat.id</span> — Cukup kirim chat <code className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono text-xs border border-emerald-500/30">beli bakso 15rb</code> ke Telegram, sistem kami langsung mencatat dan mengupdate Google Sheet kamu secara otomatis.
            </p>
          </div>
        </div>
      </section>

      {/* 9. LIVE INTERACTIVE DEMO PREVIEW */}
      <section id="demo" className="py-24 bg-[#040711]">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">Live Interactive Preview</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Lihat Betapa Mudahnya Mencatat
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Telegram Bot UI */}
            <div className="p-6 glass-card rounded-3xl space-y-4 font-sans border border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
                    m
                  </div>
                  <div>
                    <span className="text-sm font-bold block text-white">mencatat.id Bot</span>
                    <span className="text-[10px] text-emerald-400">bot • online</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="flex justify-end">
                  <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-none max-w-[80%] font-sans">
                    beli bakso solo 25rb
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-slate-900 text-slate-200 px-4 py-3 rounded-2xl rounded-tl-none max-w-[90%] border border-slate-800 space-y-1">
                    <p className="text-slate-400">📅 Rabu, 30 September 2026 — 21:45 WIB</p>
                    <p className="font-bold text-emerald-400">💸 Pengeluaran tercatat!</p>
                    <p>├ Nominal : Rp25.000</p>
                    <p>├ Kategori : 🍜 Makanan</p>
                    <p>├ Dompet : 👛 Cash / Tunai</p>
                    <p>├ Catatan : beli bakso solo</p>
                    <p>└ Saldo : Rp1.225.000</p>
                    <br />
                    <p className="text-slate-300">📊 Budget 🍜 Makanan bulan ini:</p>
                    <p className="text-emerald-400">[████░░░░░░] 40% — sisa Rp900.000</p>
                    <p className="text-slate-400 text-[11px]">👍 Pengeluaran masih aman terkendali.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Sync Preview */}
            <div className="p-6 glass-card rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-400">Live Dashboard Web Sync</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">Auto-Sync 0.1s</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block">Saldo Total</span>
                  <span className="text-base font-black text-white">Rp9.700.000</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block">Budget Tersisa</span>
                  <span className="text-base font-black text-amber-400">Rp2.450.000</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-emerald-300 font-bold">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Google Sheet Privat User</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold">Live Auto Sync</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FITUR SECTION */}
      <section id="fitur" className="py-24 bg-[#070b14] border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 space-y-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="text-3xl font-extrabold text-white">
                Catat via Telegram — Teks Natural & Foto Struk AI
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Cukup ketik kalimat santai seperti &quot;bensin 50k&quot; atau foto struk belanjaanmu. AI mutakhir kami mengenali nominal, jenis transaksi, dan otomatis mengelompokkan ke kategori yang tepat.
              </p>
            </div>
            <div className="p-6 glass-card rounded-3xl border border-slate-800 space-y-3 text-xs">
              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="font-bold text-white">Input:</span> &quot;gajian 7.5jt&quot; → <span className="text-emerald-400 font-bold">Terdeteksi Pemasukan Rp7.500.000</span>
              </div>
              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="font-bold text-white">Input:</span> &quot;kopi 25rb&quot; → <span className="text-rose-400 font-bold">Terdeteksi Pengeluaran Rp25.000</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 12. PRICING SECTION */}
      <section id="harga" className="py-24 bg-[#040711]">
        <div className="max-w-5xl mx-auto px-4 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">Paket & Harga</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Pilih Paket Yang Pas Untuk Keuanganmu</h2>

            <div className="inline-flex items-center bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  billingCycle === 'monthly' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Bulanan
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
                  billingCycle === 'yearly' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                <span>Tahunan</span>
                <span className="bg-amber-400 text-slate-950 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase">Hemat 20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Starter */}
            <div className="p-8 glass-card rounded-3xl space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">Starter</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-4xl font-black text-white">{billingCycle === 'monthly' ? 'Rp49.000' : 'Rp39.000'}</span>
                  <span className="text-xs text-slate-400">/ bulan</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300 pt-4">
                  <li className="flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-emerald-400" /><span>Catat via teks Telegram</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-emerald-400" /><span>Dashboard web lengkap</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-emerald-400" /><span>Maksimal 50 transaksi / bulan</span></li>
                </ul>
              </div>
              <Link href="/register?plan=starter" className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-extrabold text-xs text-center transition-all border border-slate-700">
                Pilih Starter
              </Link>
            </div>

            {/* Pro */}
            <div className="p-8 bg-gradient-to-b from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl shadow-2xl space-y-6 relative flex flex-col justify-between border border-emerald-500/40 emerald-glow">
              <span className="absolute -top-3.5 right-8 bg-emerald-400 text-slate-950 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                Paling Populer
              </span>
              <div className="space-y-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 block">Pro</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-4xl font-black text-white">{billingCycle === 'monthly' ? 'Rp99.000' : 'Rp79.000'}</span>
                  <span className="text-xs text-emerald-200">/ bulan</span>
                </div>
                <ul className="space-y-3 text-xs text-emerald-100 pt-4">
                  <li className="flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-emerald-400" /><span className="font-bold">Unlimited transaksi & wallet</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-emerald-400" /><span>Foto struk (AI OCR)</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-emerald-400" /><span>Google Sheet privat</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-emerald-400" /><span>AI Financial Advisor</span></li>
                </ul>
              </div>
              <Link href="/register?plan=pro" className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black text-xs text-center transition-all shadow-lg shadow-emerald-500/20">
                Upgrade ke Pro Sekarang
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 13. FAQ */}
      <section id="faq" className="py-24 bg-[#070b14]">
        <div className="max-w-4xl mx-auto px-4 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Pertanyaan Umum</span>
            <h2 className="text-3xl font-extrabold text-white">FAQ</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: 'Apakah bisa menggunakan foto struk di Paket Starter?', a: 'Fitur input via foto struk (AI OCR) tersedia khusus untuk pengguna Paket Pro. Pengguna Starter dapat mencatat melalui teks natural di Telegram.' },
              { q: 'Bagaimana dengan keamanan data Google Sheet saya?', a: 'Google Sheet dibuat secara privat di Drive milik kamu sendiri. Admin mencatat.id tidak memiliki akses ke isi transaksi Google Sheet kamu.' },
              { q: 'Apakah 1 bot Telegram digunakan oleh banyak pengguna?', a: 'Ya, 1 bot resmi mencatat.id digunakan bersama oleh seluruh pengguna. Sistem membedakan pemilik transaksi berdasarkan nomor HP dan Chat ID.' },
            ].map((faq, idx) => (
              <div key={idx} className="p-5 glass-card rounded-2xl border border-slate-800">
                <button onClick={() => toggleFaq(idx)} className="w-full flex items-center justify-between text-left font-bold text-sm text-white">
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === idx && <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 leading-relaxed">{faq.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#020409] text-slate-400 py-16 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>© 2026 mencatat.id. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
