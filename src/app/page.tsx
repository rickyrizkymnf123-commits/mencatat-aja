'use strict';
'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'once'>('monthly');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // Interactive Chat State for Simulator & Live Dashboard Sync
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string; isIncome?: boolean }>>([
    {
      sender: 'bot',
      text: '👋 <b>Halo! Asisten Finansial Mencatat Aja siap.</b>\nKetik transaksi kamu dalam bahasa santai. Contoh: <i>"beli bakso 25rb pake gopay"</i> atau <i>"gajian 8.5jt bca"</i>.',
      time: '12:00',
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Live Sync Dashboard Stats inside Landing Page
  const [simBalance, setSimBalance] = useState(4850000);
  const [simExpense, setSimExpense] = useState(1150000);
  const [simBudgetSpent, setSimBudgetSpent] = useState(450000);
  const simBudgetLimit = 1500000;

  const handleSimulateChat = (userText: string) => {
    if (!userText.trim()) return;

    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    
    // Add User Message
    setChatMessages(prev => [...prev, { sender: 'user', text: userText, time: timeNow }]);
    setChatInput('');
    setIsTyping(true);

    // Simulate Bot Response based on Indonesian fintech patterns
    setTimeout(() => {
      setIsTyping(false);
      let replyText = '';
      const lower = userText.toLowerCase();
      let isIncome = false;
      let nominal = 25000;
      let category = '🍜 Makanan & Minuman';
      let wallet = '👛 GoPay (Utama)';

      if (lower.includes('bakso') || lower.includes('makan') || lower.includes('kopi') || lower.includes('padang')) {
        nominal = lower.includes('28') ? 28000 : (lower.includes('22') ? 22000 : (lower.includes('35') ? 35000 : 25000));
        category = '🍜 Makanan & Minuman';
        wallet = lower.includes('gopay') ? '📱 GoPay' : (lower.includes('bca') ? '🏦 BCA' : '👛 Cash');
      } else if (lower.includes('struk') || lower.includes('indomaret') || lower.includes('belanja')) {
        nominal = lower.includes('145') ? 145000 : (lower.includes('120') ? 120000 : 85000);
        category = '🛒 Belanja Bulanan';
        wallet = '🏦 BCA Debit';
      } else if (lower.includes('bensin') || lower.includes('pertamax') || lower.includes('transport') || lower.includes('gojek')) {
        nominal = lower.includes('50') ? 50000 : (lower.includes('25') ? 25000 : 30000);
        category = '🚗 Transportasi & BBM';
        wallet = '👛 Cash';
      } else if (lower.includes('gaji') || lower.includes('gajian') || lower.includes('jt') || lower.includes('proyek') || lower.includes('pemasukan')) {
        isIncome = true;
        nominal = lower.includes('8.5') ? 8500000 : (lower.includes('5') ? 5000000 : 3500000);
        category = '💼 Pemasukan / Gaji';
        wallet = '🏦 Rekening BCA';
      }

      // Update Live State
      if (isIncome) {
        setSimBalance(prev => prev + nominal);
        replyText = `📅 ${timeNow}
💰 <b>Pemasukan Berhasil Dicatat!</b>
├ Nominal : <b>Rp ${nominal.toLocaleString('id-ID')}</b>
├ Kategori : ${category}
├ Rekening : ${wallet}
└ Saldo Baru : <b>Rp ${(simBalance + nominal).toLocaleString('id-ID')}</b>

💪 Mantap! Sisihkan minimal 20% untuk tabungan & investasi ya!`;
      } else {
        setSimBalance(prev => Math.max(0, prev - nominal));
        setSimExpense(prev => prev + nominal);
        const newSpent = simBudgetSpent + nominal;
        setSimBudgetSpent(newSpent);
        const pct = Math.min(100, Math.round((newSpent / simBudgetLimit) * 100));

        replyText = `📅 ${timeNow}
💸 <b>Pengeluaran Berhasil Dicatat!</b>
├ Nominal : <b>Rp ${nominal.toLocaleString('id-ID')}</b>
├ Kategori : ${category}
├ Dompet : ${wallet}
└ Sisa Saldo : <b>Rp ${(simBalance - nominal).toLocaleString('id-ID')}</b>

📊 <b>Budget [Makanan]:</b> ${pct}% terpakai
${generateBar(pct)} — sisa Rp ${Math.max(0, simBudgetLimit - newSpent).toLocaleString('id-ID')}
💡 Tips: Pengeluaran makananmu masih dalam batas aman hari ini.`;
      }

      setChatMessages(prev => [...prev, { sender: 'bot', text: replyText, time: timeNow, isIncome }]);
    }, 800);
  };

  function generateBar(percentage: number) {
    const rounded = Math.min(Math.max(Math.round(percentage / 10), 0), 10);
    return '█'.repeat(rounded) + '░'.repeat(10 - rounded);
  }

  const presets = [
    '☕ Kopi Starbucks 45rb gopay',
    '🍜 Makan Nasi Padang 28rb cash',
    '⛽ Beli bensin pertamax 50rb',
    '💼 Gajian bulanan 8.5jt bca',
    '🛒 Belanja bulanan Indomaret 145rb bca'
  ];

  const faqs = [
    {
      q: 'Bagaimana cara kerja pencatatan via Telegram Bot?',
      a: 'Cukup kirim pesan teks seperti biasa (misal: "makan siang 35rb pake cash" atau "gajian 8jt bca"). Asisten AI kami akan langsung mengekstrak nominal, dompet, dan kategori secara otomatis dalam hitungan 0.5 detik tanpa perlu mengisi form yang rumit.'
    },
    {
      q: 'Apakah bisa langsung tembus dan melihat dashboard web?',
      a: 'Tentu saja! Data yang dicatat via bot Telegram langsung tersinkronisasi 100% secara real-time ke Dashboard Web Anda. Anda bisa mengklik tombol "Buka Dashboard" di atas kapan saja untuk melihat grafik, ringkasan saldo, dompet, dan laporan.'
    },
    {
      q: 'Apakah data keuangan saya aman dan privat?',
      a: 'Sangat aman. Setiap akun memiliki bot Telegram privat sendiri (BYOB - Bring Your Own Bot) dengan enkripsi data setara standar perbankan. Data Anda tidak pernah dibagikan kepada pihak ketiga manapun.'
    },
    {
      q: 'Apakah mendukung scan kuitansi atau struk belanja belanjaan?',
      a: 'Ya! Dengan teknologi AI Vision OCR kami, Anda cukup memotret struk belanja Indomaret, Alfamart, restoran, maupun nota kuitansi tulisan tangan. Bot akan langsung membaca total belanja dan rincian barangnya secara presisi.'
    },
    {
      q: 'Bagaimana cara mengelola dan memperpanjang langganan Pro?',
      a: 'Anda dapat mengelola langganan dengan sangat mudah langsung dari menu "Kelola Langganan" di Dashboard. Pembayaran didukung via QRIS/Midtrans instant atau konfirmasi langsung ke Admin WhatsApp resmi.'
    }
  ];

  return (
    <div className="landing-dark-root">
      <style jsx global>{`
        :root {
          --bg-dark: #04060d;
          --bg-card: rgba(13, 18, 32, 0.7);
          --border-glass: rgba(255, 255, 255, 0.08);
          --accent-emerald: #10b981;
          --accent-cyan: #06b6d4;
          --accent-gold: #f59e0b;
        }

        body {
          background-color: var(--bg-dark);
          color: #f1f5f9;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          overflow-x: hidden;
        }

        .landing-dark-root {
          min-height: 100vh;
          background: radial-gradient(circle at 50% 0%, #0d1a29 0%, #04060d 70%);
          position: relative;
        }

        /* Ambient Glow Spheres */
        .ambient-sphere {
          position: absolute;
          border-radius: 9999px;
          filter: blur(140px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.35;
        }

        .ambient-1 {
          top: -100px;
          left: 25%;
          width: 550px;
          height: 550px;
          background: #059669;
        }

        .ambient-2 {
          top: 400px;
          right: 5%;
          width: 450px;
          height: 450px;
          background: #0891b2;
        }

        .ambient-3 {
          bottom: 200px;
          left: 10%;
          width: 500px;
          height: 500px;
          background: #d97706;
          opacity: 0.2;
        }

        /* Glassmorphism Card */
        .glass-panel {
          background: rgba(13, 20, 38, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7), inset 0 1px 1px 0 rgba(255, 255, 255, 0.1);
        }

        .glass-panel:hover {
          border-color: rgba(16, 185, 129, 0.3);
        }

        /* Luxury Gold & Emerald Gradient Text */
        .text-gradient-emerald-gold {
          background: linear-gradient(135deg, #10b981 0%, #34d399 35%, #06b6d4 70%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .text-gradient-silver {
          background: linear-gradient(180deg, #ffffff 30%, #cbd5e1 75%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .luxury-badge-glow {
          box-shadow: 0 0 20px -3px rgba(16, 185, 129, 0.4), inset 0 0 10px rgba(16, 185, 129, 0.2);
        }
      `}</style>

      {/* Ambient Glows */}
      <div className="ambient-sphere ambient-1"></div>
      <div className="ambient-sphere ambient-2"></div>
      <div className="ambient-sphere ambient-3"></div>

      {/* STICKY GLASS NAVBAR */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#04060d]/80 border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* ULTRA-LUXURY BRAND LOGO */}
          <Link href="/" className="flex items-center gap-3.5 group">
            {/* 3D Prismatic Diamond & Vault Emblem */}
            <div className="relative w-11 h-11 flex-shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-400 rounded-2xl blur-sm opacity-70 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative w-full h-full rounded-xl bg-gradient-to-b from-[#06241b] via-[#031710] to-[#010a07] p-0.5 border border-emerald-400/50 shadow-2xl flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-40"></div>
                <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 drop-shadow-[0_2px_8px_rgba(16,185,129,0.7)]">
                  <path d="M24 4L38 18L24 44L10 18L24 4Z" fill="url(#gem-grad-1)" stroke="url(#gem-stroke)" strokeWidth="1.2" />
                  <path d="M24 4L34 18H14L24 4Z" fill="url(#gem-grad-2)" opacity="0.9" />
                  <path d="M24 14L26.5 21.5L34 24L26.5 26.5L24 34L21.5 26.5L14 24L21.5 21.5L24 14Z" fill="url(#star-gold)" />
                  <circle cx="35" cy="11" r="1.5" fill="#FDE047" />
                  <circle cx="13" cy="35" r="1.2" fill="#6EE7B7" />
                  <defs>
                    <linearGradient id="gem-grad-1" x1="10" y1="4" x2="38" y2="44" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#059669" />
                      <stop offset="0.5" stopColor="#10B981" />
                      <stop offset="1" stopColor="#047857" />
                    </linearGradient>
                    <linearGradient id="gem-grad-2" x1="14" y1="4" x2="34" y2="18" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#34D399" />
                      <stop offset="1" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="star-gold" x1="14" y1="14" x2="34" y2="34" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FDE047" />
                      <stop offset="0.5" stopColor="#F59E0B" />
                      <stop offset="1" stopColor="#D97706" />
                    </linearGradient>
                    <linearGradient id="gem-stroke" x1="10" y1="4" x2="38" y2="44" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#A7F3D0" />
                      <stop offset="0.5" stopColor="#FCD34D" />
                      <stop offset="1" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Typography & High-End Badge */}
            <div className="flex items-center gap-2.5">
              <span className="text-2xl font-black tracking-tight" style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}>
                <span className="text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">Mencatat</span>
                <span className="text-gradient-emerald-gold font-extrabold">Aja</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-950/90 to-slate-900 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider luxury-badge-glow">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                💎 PRO AI OS
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
            <a href="#fitur" className="hover:text-emerald-400 transition">Fitur Utama</a>
            <a href="#demo" className="hover:text-emerald-400 transition">Live Demo</a>
            <a href="#pricing" className="hover:text-emerald-400 transition">Langganan</a>
            <a href="#faq" className="hover:text-emerald-400 transition">FAQ</a>
          </nav>

          {/* TEMBUS KE DASHBOARD ACTION BUTTONS */}
          <div className="flex items-center gap-3">
            <Link
              href="/auth?mode=login"
              className="hidden sm:inline-flex px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
            >
              Masuk Akun
            </Link>
            
            {/* DIRECT BRIDGE TO DASHBOARD */}
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 font-black text-xs hover:brightness-110 transition duration-200 shadow-lg shadow-emerald-500/25 flex items-center gap-2 group"
            >
              <span>🚀</span>
              <span>Buka Dashboard</span>
              <span className="group-hover:translate-x-1 transition duration-200 text-slate-900">➔</span>
            </Link>
          </div>

        </div>
      </header>

      <main className="relative z-10 space-y-24 sm:space-y-32 pb-24">

        {/* HERO SECTION WITH LUXURY HEADLINE & DUAL BRIDGE CTAS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 text-center space-y-8">
          
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-950/90 to-slate-900/90 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider luxury-badge-glow">
            <span>✨</span> Next-Gen AI Financial Operating System 3.2
          </div>

          {/* Master Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.12]">
            <span className="text-gradient-silver">Catat Keuangan Instan Lewat Telegram, </span>
            <span className="text-gradient-emerald-gold">Langsung Tembus ke Dashboard.</span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-3xl mx-auto text-base sm:text-xl text-slate-400 leading-relaxed font-normal">
            Bicara atau ketik transaksi dalam bahasa sehari-hari. AI canggih mengurai nominal, kategori, & dompet dalam 0.5 detik dan otomatis tersinkronisasi live ke dashboard finansial Anda.
          </p>

          {/* Dual Bridge CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 font-black text-sm hover:brightness-110 transition duration-200 shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-2.5 group"
            >
              <span>🚀 Masuk ke Dashboard Langsung</span>
              <span className="group-hover:translate-x-1.5 transition duration-200">➔</span>
            </Link>

            <a
              href="#demo"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-bold text-sm transition flex items-center justify-center gap-2"
            >
              <span>⚡ Coba Simulator Telegram</span>
            </a>
          </div>

          {/* Trust Metrics Bar */}
          <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5">
              <div className="text-2xl font-black text-emerald-400 font-mono">0.5s</div>
              <div className="text-xs text-slate-400">Kecepatan Parsing AI</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5">
              <div className="text-2xl font-black text-cyan-400 font-mono">100%</div>
              <div className="text-xs text-slate-400">Privat & Enkripsi BYOB</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5">
              <div className="text-2xl font-black text-amber-400 font-mono">Real-time</div>
              <div className="text-xs text-slate-400">Sinkronisasi Dashboard</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5">
              <div className="text-2xl font-black text-emerald-400 font-mono">OCR AI</div>
              <div className="text-xs text-slate-400">Scan Struk & Kuitansi</div>
            </div>
          </div>

        </section>

        {/* SECTION: INTERACTIVE TELEGRAM DARK SIMULATOR + LIVE DASHBOARD BRIDGE */}
        <section id="demo" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Coba Langsung Simulator <span className="text-gradient-emerald-gold">Telegram & Dashboard Live</span>
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto">
              Klik preset kalimat di bawah atau ketik kalimat transaksimu sendiri. Lihat bagaimana bot merespons dan dashboard langsung mengupdate saldo & anggaran secara real-time!
            </p>
          </div>

          {/* Two-Column Interactive Glass Stage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: DARK TELEGRAM BOT SIMULATOR */}
            <div className="lg:col-span-6 glass-panel rounded-3xl p-6 space-y-4 shadow-2xl">
              
              {/* Telegram Window Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-bold shadow-md">
                    🤖
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      Mencatat Aja AI Bot
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    </div>
                    <div className="text-[11px] text-emerald-400">bot aktif • respons instan</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">
                  Telegram Dark Mode
                </span>
              </div>

              {/* Chat Message Stream */}
              <div className="h-[360px] overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-none shadow-md'
                          : 'bg-slate-900/90 text-slate-200 border border-slate-700/80 rounded-tl-none font-mono whitespace-pre-line shadow-lg'
                      }`}
                      dangerouslySetInnerHTML={{ __html: msg.text }}
                    />
                    <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.time}</span>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-center gap-2 p-3 bg-slate-900/80 border border-slate-800 rounded-2xl w-fit text-xs text-emerald-400 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]"></span>
                    <span>AI sedang memproses transaksi...</span>
                  </div>
                )}
              </div>

              {/* Presets Quick Click */}
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <div className="text-[11px] font-semibold text-slate-400">⚡ Coba Preset Cepat:</div>
                <div className="flex flex-wrap gap-2">
                  {presets.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleSimulateChat(p)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-emerald-950/80 hover:border-emerald-500/50 border border-slate-700/80 text-[11px] text-slate-300 hover:text-emerald-300 transition"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSimulateChat(chatInput);
                }}
                className="flex items-center gap-2 pt-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ketik misal: 'makan siang 35rb bca'..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5"
                >
                  <span>Kirim</span>
                  <span>➔</span>
                </button>
              </form>

            </div>

            {/* RIGHT COLUMN: SYNCHRONIZED LIVE DASHBOARD WIDGET */}
            <div className="lg:col-span-6 glass-panel rounded-3xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
              
              {/* Header with Direct Dashboard Bridge */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Live Synchronized Dashboard
                  </h3>
                </div>

                {/* DIRECT BRIDGE BUTTON */}
                <Link
                  href="/dashboard"
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                >
                  <span>🔗 Buka di Dashboard Penuh</span>
                  <span>➔</span>
                </Link>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="text-xs text-slate-400">Total Saldo Terkini</div>
                  <div className="text-2xl font-black text-white font-mono mt-1">
                    Rp {simBalance.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-0.5">● Tersinkronisasi Otomatis</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="text-xs text-slate-400">Total Pengeluaran</div>
                  <div className="text-2xl font-black text-rose-400 font-mono mt-1">
                    Rp {simExpense.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[11px] text-rose-400/80 mt-0.5">Bulan Berjalan</div>
                </div>
              </div>

              {/* Live Budget Progress Meter */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">🍜 Anggaran Makanan & Minuman</span>
                  <span className="font-mono text-emerald-400">
                    Rp {simBudgetSpent.toLocaleString('id-ID')} / Rp {simBudgetLimit.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((simBudgetSpent / simBudgetLimit) * 100))}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{Math.round((simBudgetSpent / simBudgetLimit) * 100)}% Terpakai</span>
                  <span>Sisa Rp {Math.max(0, simBudgetLimit - simBudgetSpent).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Wallets Mini List */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Dompet & Rekening Terdaftar:
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-slate-400 text-[11px]">🏦 Rekening BCA</div>
                    <div className="font-bold text-slate-200 mt-1">Rp 3.500.000</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-slate-400 text-[11px]">📱 GoPay</div>
                    <div className="font-bold text-slate-200 mt-1">Rp 850.000</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-slate-400 text-[11px]">👛 Dompet Cash</div>
                    <div className="font-bold text-slate-200 mt-1">Rp 500.000</div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Jump Action */}
              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs hover:brightness-110 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <span>🚀 Buka & Gunakan Dashboard Sekarang (Gratis)</span>
                  <span>➔</span>
                </Link>
              </div>

            </div>

          </div>

        </section>

        {/* SECTION: BENTO GRID OF PREMIUM FEATURES WITH DIRECT JUMP PILLS */}
        <section id="fitur" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Fitur Dirancang untuk <span className="text-gradient-emerald-gold">Kecepatan & Privasi Maksimal</span>
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto">
              Semua yang Anda butuhkan untuk mengatur arus kas pribadi maupun bisnis kecil tanpa pusing membuka spreadsheet yang rumit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1: AI Smart Natural Language */}
            <div className="glass-panel rounded-3xl p-7 space-y-4 relative overflow-hidden group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl">
                🤖
              </div>
              <h3 className="text-lg font-bold text-white">AI Natural Language Parsing</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Tulis transaksi dalam gaya bahasa santai Indonesia. AI mengenali singkatan seperti "rb", "k", "jt", "gopay", "bca", dan "transfer" secara instan.
              </p>
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold group-hover:translate-x-1 transition">
                <span>Coba di Dashboard</span> <span>➔</span>
              </Link>
            </div>

            {/* Feature 2: OCR Receipt Vision */}
            <div className="glass-panel rounded-3xl p-7 space-y-4 relative overflow-hidden group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-2xl">
                📸
              </div>
              <h3 className="text-lg font-bold text-white">OCR Scan Struk & Kuitansi</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Cukup foto struk belanjaan kasir atau kuitansi manual. AI Vision membaca total bayar, tanggal, dan rincian belanja secara otomatis.
              </p>
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-bold group-hover:translate-x-1 transition">
                <span>Coba di Dashboard</span> <span>➔</span>
              </Link>
            </div>

            {/* Feature 3: Multi-Wallet & Transfer */}
            <div className="glass-panel rounded-3xl p-7 space-y-4 relative overflow-hidden group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl">
                👛
              </div>
              <h3 className="text-lg font-bold text-white">Multi-Dompet & Transfer</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Kelola saldo Rekening Bank, E-Wallet (GoPay, OVO, ShopeePay), dan Uang Tunai dalam satu tempat. Dukungan mutasi transfer antar dompet.
              </p>
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-bold group-hover:translate-x-1 transition">
                <span>Coba di Dashboard</span> <span>➔</span>
              </Link>
            </div>

            {/* Feature 4: Smart Budget Alert */}
            <div className="glass-panel rounded-3xl p-7 space-y-4 relative overflow-hidden group">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-2xl">
                🎯
              </div>
              <h3 className="text-lg font-bold text-white">Target & Peringatan Budget</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Tetapkan batas pengeluaran per kategori. Dapatkan notifikasi proaktif saat anggaran makan, nongkrong, atau belanja sudah mendekati limit.
              </p>
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-bold group-hover:translate-x-1 transition">
                <span>Coba di Dashboard</span> <span>➔</span>
              </Link>
            </div>

            {/* Feature 5: Pro Reports & PDF Export */}
            <div className="glass-panel rounded-3xl p-7 space-y-4 relative overflow-hidden group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl">
                📊
              </div>
              <h3 className="text-lg font-bold text-white">Ekspor Laporan PDF & Excel</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Unduh rekapitulasi keuangan bulanan berformat PDF elegan atau spreadsheet Excel lengkap dengan grafik visual untuk analisa finansial.
              </p>
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold group-hover:translate-x-1 transition">
                <span>Coba di Dashboard</span> <span>➔</span>
              </Link>
            </div>

            {/* Feature 6: 100% Private BYOB Bot */}
            <div className="glass-panel rounded-3xl p-7 space-y-4 relative overflow-hidden group">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 text-2xl">
                🔒
              </div>
              <h3 className="text-lg font-bold text-white">100% Private BYOB Security</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Gunakan token bot Telegram pribadi Anda sendiri dari @BotFather. Hanya Anda yang memiliki akses ke obrolan bot tersebut.
              </p>
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-teal-400 font-bold group-hover:translate-x-1 transition">
                <span>Coba di Dashboard</span> <span>➔</span>
              </Link>
            </div>

          </div>

        </section>

        {/* SECTION: PRICING & SUBSCRIPTION */}
        <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Pilihan Paket <span className="text-gradient-emerald-gold">Transparan & Terjangkau</span>
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Mulai gratis sekarang. Upgrade ke Pro kapan saja untuk kapasitas tanpa batas dan fitur asisten AI terlengkap.
            </p>

            {/* Billing Cycle Switcher */}
            <div className="inline-flex items-center p-1.5 rounded-2xl bg-slate-900 border border-slate-800 gap-2">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  billingCycle === 'monthly'
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Langganan Bulanan
              </button>
              <button
                onClick={() => setBillingCycle('once')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  billingCycle === 'once'
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Langganan Tahunan (Hemat 20%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* Starter Plan */}
            <div className="glass-panel rounded-3xl p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Starter (Gratis)</h3>
                  <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">Free Forever</span>
                </div>
                <div className="text-3xl font-black text-white font-mono">
                  Rp 0 <span className="text-xs text-slate-500 font-normal">/ selamanya</span>
                </div>
                <p className="text-xs text-slate-400">Cocok untuk mencoba pencatatan dasar keuangan pribadi.</p>

                <ul className="space-y-3 pt-4 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Hingga 50 transaksi per bulan</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> 2 Dompet Aktif (Cash & 1 Bank)</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Integrasi Bot Telegram Standar</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Web Dashboard & Grafik Ringkasan</li>
                </ul>
              </div>

              <Link
                href="/dashboard"
                className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs text-center transition block"
              >
                Mulai Gratis Sekarang
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="glass-panel rounded-3xl p-8 space-y-6 flex flex-col justify-between border-emerald-500/40 relative overflow-hidden luxury-badge-glow">
              <div className="absolute top-0 right-0 px-4 py-1.5 bg-gradient-to-l from-amber-500 to-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-bl-xl shadow-lg">
                👑 PALING POPULER
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    Pro Member <span>💎</span>
                  </h3>
                </div>
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  {billingCycle === 'monthly' ? 'Rp 29.000' : 'Rp 279.000'}{' '}
                  <span className="text-xs text-slate-400 font-normal">
                    {billingCycle === 'monthly' ? '/ bulan' : '/ tahun'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">Akses tanpa batas ke seluruh ekosistem AI dan fitur finansial.</p>

                <ul className="space-y-3 pt-4 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> <b>Unlimited</b> Transaksi & Chat AI</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> <b>Unlimited</b> Dompet & Rekening Bank</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> <b>AI Vision OCR</b> Scan Struk Kuitansi</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> <b>Ekspor Dokumen</b> Excel & PDF Pro</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> <b>Custom Bot Token</b> (Privat Penuh)</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Prioritas Support & Kelola Langganan</li>
                </ul>
              </div>

              <Link
                href="/dashboard"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 font-extrabold text-xs text-center hover:brightness-110 transition shadow-lg shadow-emerald-500/25 block"
              >
                🚀 Buka Dashboard & Upgrade Pro
              </Link>
            </div>

          </div>

        </section>

        {/* SECTION: FAQ ACCORDION */}
        <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black text-white">Pertanyaan yang Sering Diajukan</h2>
            <p className="text-slate-400 text-sm">Punya pertanyaan seputar cara kerja Mencatat Aja? Temukan jawabannya di sini.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={index}
                  className="glass-panel rounded-2xl overflow-hidden border border-white/5 transition"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 text-sm font-bold text-white hover:text-emerald-400 transition"
                  >
                    <span>{faq.q}</span>
                    <span className="text-emerald-400 text-lg">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </section>

      </main>

      {/* FLOATING QUICK BRIDGE PILL TO DASHBOARD */}
      <div className="fixed bottom-6 right-6 z-40">
        <Link
          href="/dashboard"
          className="px-5 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black text-xs hover:scale-105 transition duration-200 shadow-2xl shadow-emerald-500/40 flex items-center gap-2.5 backdrop-blur-md"
        >
          <span>✨</span>
          <span>Buka Dashboard</span>
          <span>➔</span>
        </Link>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-[#030408] py-12 relative z-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-sm">
              💎
            </div>
            <div>
              <div className="text-white font-bold">Mencatat Aja AI OS</div>
              <div className="text-[11px] text-slate-500">© 2026 Mencatat Aja. Hak Cipta Dilindungi.</div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a href="#fitur" className="hover:text-slate-300 transition">Fitur</a>
            <a href="#pricing" className="hover:text-slate-300 transition">Harga</a>
            <Link href="/dashboard" className="hover:text-emerald-400 transition font-bold">Dashboard</Link>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Semua Sistem Normal
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
