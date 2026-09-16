'use strict';
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
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

  // Direct Seamless Bridge to Dashboard
  const handleGoToDashboard = () => {
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('Mencatat Aja_user_id');
      if (!storedId) {
        // Set up guest / demo session so user can immediately experience dashboard
        localStorage.setItem('Mencatat Aja_user_id', '58c09700-965d-4104-a344-6e599c46deff');
        localStorage.setItem('Mencatat Aja_user_name', 'Budi Santoso');
        localStorage.setItem('Mencatat Aja_user_email', 'budi@demo.com');
        localStorage.setItem('Mencatat Aja_plan', 'Pro');
        localStorage.setItem('Mencatat Aja_telegram_token', 'TD-112233');
      }
    }
    router.push('/dashboard');
  };

  const handleSimulateChat = (userText: string) => {
    if (!userText.trim()) return;

    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    
    setChatMessages(prev => [...prev, { sender: 'user', text: userText, time: timeNow }]);
    setChatInput('');
    setIsTyping(true);

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
    }, 700);
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
      a: 'Tentu saja! Data yang dicatat via bot Telegram langsung tersinkronisasi 100% secara real-time ke Dashboard Web Anda. Anda bisa mengklik tombol "Buka Dashboard" kapan saja untuk melihat grafik, ringkasan saldo, dompet, dan laporan.'
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
    <div className="landing-root">
      {/* BULLETPROOF PURE CSS STYLES */}
      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        body {
          background-color: #04060d !important;
          color: #f1f5f9 !important;
          overflow-x: hidden !important;
        }

        .landing-root {
          min-height: 100vh;
          background: radial-gradient(circle at 50% 0%, #0c1827 0%, #04060d 75%);
          position: relative;
          color: #f1f5f9;
        }

        /* Ambient Glow Backgrounds */
        .ambient-glow {
          position: absolute;
          border-radius: 9999px;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.35;
        }
        .glow-1 { top: -80px; left: 20%; width: 500px; height: 500px; background: #059669; }
        .glow-2 { top: 450px; right: 5%; width: 450px; height: 450px; background: #0891b2; }
        .glow-3 { bottom: 150px; left: 10%; width: 500px; height: 500px; background: #d97706; opacity: 0.2; }

        /* Container Layout */
        .max-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          position: relative;
          z-index: 10;
        }

        /* Header Navbar */
        .navbar-header {
          position: sticky;
          top: 0;
          z-index: 999;
          background: rgba(4, 6, 13, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          height: 76px;
          display: flex;
          align-items: center;
        }
        .navbar-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .brand-logo-unit {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }
        .luxury-emblem-box {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, #052e16 0%, #022c22 100%);
          border: 1px solid rgba(16, 185, 129, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
        }
        .brand-text-title {
          font-size: 1.45rem;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #ffffff;
        }
        .brand-text-accent {
          background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .luxury-pro-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 99px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #34d399;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-left: 8px;
        }
        .nav-links-row {
          display: flex;
          align-items: center;
          gap: 28px;
        }
        .nav-link-item {
          color: #94a3b8;
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s;
        }
        .nav-link-item:hover {
          color: #10b981;
        }

        /* Buttons */
        .btn-dash-primary {
          background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
          color: #04060d;
          font-weight: 800;
          font-size: 0.85rem;
          padding: 10px 20px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.35);
          transition: all 0.2s ease;
        }
        .btn-dash-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(16, 185, 129, 0.5);
          filter: brightness(1.1);
        }

        .btn-dash-large {
          font-size: 1rem;
          padding: 15px 32px;
          border-radius: 16px;
        }

        .btn-dash-secondary {
          background: rgba(255, 255, 255, 0.05);
          color: #e2e8f0;
          font-weight: 700;
          font-size: 0.9rem;
          padding: 14px 28px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          transition: all 0.2s;
        }
        .btn-dash-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(16, 185, 129, 0.4);
          color: #ffffff;
        }

        /* Glass Panel */
        .glass-box {
          background: rgba(13, 20, 38, 0.75);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 24px;
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          padding: 28px;
        }

        /* Hero Layout */
        .hero-wrap {
          text-align: center;
          padding: 60px 0 40px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .hero-top-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 99px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #34d399;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }
        .hero-headline {
          font-size: clamp(2.4rem, 5.5vw, 4.2rem);
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: -1.2px;
          max-width: 950px;
        }
        .hero-subhead {
          font-size: clamp(1rem, 2vw, 1.25rem);
          color: #94a3b8;
          max-width: 720px;
          line-height: 1.6;
        }
        .hero-cta-group {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          justify-content: center;
          margin-top: 8px;
        }

        /* Metrics Bar */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          width: 100%;
          max-width: 900px;
          margin-top: 20px;
        }
        .metric-cell {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 18px;
          padding: 16px 20px;
          text-align: left;
        }
        .metric-val {
          font-size: 1.6rem;
          font-weight: 900;
          color: #34d399;
          font-family: monospace;
        }
        .metric-desc {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 2px;
        }

        /* Simulator Stage */
        .stage-title-wrap {
          text-align: center;
          margin: 60px 0 32px 0;
        }
        .stage-title {
          font-size: clamp(1.8rem, 3.5vw, 2.5rem);
          font-weight: 900;
          letter-spacing: -0.5px;
        }
        .stage-subtitle {
          color: #94a3b8;
          font-size: 0.9rem;
          margin-top: 6px;
        }
        .demo-split-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 860px) {
          .demo-split-grid {
            grid-template-columns: 1fr;
          }
          .nav-links-row {
            display: none;
          }
        }

        /* Chat Stream */
        .chat-stream-box {
          height: 320px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-right: 6px;
        }
        .chat-bubble-user {
          align-self: flex-end;
          background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
          color: #ffffff;
          padding: 10px 16px;
          border-radius: 18px 18px 2px 18px;
          font-size: 0.85rem;
          max-width: 80%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .chat-bubble-bot {
          align-self: flex-start;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
          padding: 12px 16px;
          border-radius: 18px 18px 18px 2px;
          font-size: 0.82rem;
          font-family: monospace;
          line-height: 1.5;
          max-width: 85%;
          box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        }

        /* Bento Grid */
        .bento-layout {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
          margin-top: 32px;
        }
        .bento-item {
          background: rgba(13, 20, 38, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 16px;
          transition: all 0.25s ease;
        }
        .bento-item:hover {
          border-color: rgba(16, 185, 129, 0.35);
          transform: translateY(-3px);
        }
        .bento-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
        }

        /* Pricing Layout */
        .pricing-wrap {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
          max-width: 860px;
          margin: 32px auto 0 auto;
        }
        .pricing-card-pro {
          background: rgba(13, 20, 38, 0.85);
          border: 1px solid rgba(16, 185, 129, 0.5);
          border-radius: 28px;
          padding: 32px;
          box-shadow: 0 0 35px rgba(16, 185, 129, 0.25);
          position: relative;
        }

        /* Floating Pill */
        .floating-dash-pill {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
          color: #04060d;
          font-weight: 800;
          font-size: 0.85rem;
          padding: 14px 24px;
          border-radius: 99px;
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
          cursor: pointer;
          border: none;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: transform 0.2s;
        }
        .floating-dash-pill:hover {
          transform: scale(1.06);
        }
      `}</style>

      {/* Ambient Radial Lights */}
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>
      <div className="ambient-glow glow-3"></div>

      {/* NAVBAR */}
      <header className="navbar-header">
        <div className="max-container" style={{ width: '100%' }}>
          <div className="navbar-content">
            
            
            {/* CLEAN SLEEK TEXT BRAND */}
            <Link href="/" className="brand-logo-unit">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="brand-text-title">
                  Mencatat<span className="brand-text-accent">Aja</span>
                </span>
                <span className="luxury-pro-badge">
                  💰 AI WEALTH OS
                </span>
              </div>
            </Link>


            {/* NAV LINKS */}
            <nav className="nav-links-row">
              <a href="#fitur" className="nav-link-item">Fitur Utama</a>
              <a href="#demo" className="nav-link-item">Live Demo</a>
              <a href="#pricing" className="nav-link-item">Langganan</a>
              <a href="#faq" className="nav-link-item">FAQ</a>
            </nav>

            {/* TEMBUS KE DASHBOARD ACTION */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link href="/auth?mode=login" className="nav-link-item" style={{ padding: '8px 14px' }}>
                Masuk Akun
              </Link>
              <button onClick={handleGoToDashboard} className="btn-dash-primary">
                <span>🚀</span>
                <span>Buka Dashboard</span>
                <span>➔</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="max-container" style={{ paddingTop: '20px', paddingBottom: '80px' }}>
        
        <div className="hero-wrap">
          <div className="hero-top-pill">
            <span>✨</span> Next-Gen AI Financial Operating System 3.2
          </div>

          <h1 className="hero-headline">
            Catat Keuangan Instan Lewat Telegram,{' '}
            <span className="brand-text-accent">Langsung Tembus ke Dashboard.</span>
          </h1>

          <p className="hero-subhead">
            Bicara atau ketik transaksi dalam bahasa sehari-hari. AI canggih mengurai nominal, kategori, & dompet dalam 0.5 detik dan otomatis tersinkronisasi live ke dashboard finansial Anda.
          </p>

          <div className="hero-cta-group">
            <button onClick={handleGoToDashboard} className="btn-dash-primary btn-dash-large">
              <span>🚀 Masuk ke Dashboard Langsung</span>
              <span>➔</span>
            </button>
            <a href="#demo" className="btn-dash-secondary">
              <span>⚡ Coba Simulator Telegram</span>
            </a>
          </div>

          <div className="metrics-grid">
            <div className="metric-cell">
              <div className="metric-val">0.5s</div>
              <div className="metric-desc">Kecepatan Parsing AI</div>
            </div>
            <div className="metric-cell">
              <div className="metric-val">100%</div>
              <div className="metric-desc">Privat & Enkripsi BYOB</div>
            </div>
            <div className="metric-cell">
              <div className="metric-val">Real-time</div>
              <div className="metric-desc">Sinkronisasi Dashboard</div>
            </div>
            <div className="metric-cell">
              <div className="metric-val">AI OCR</div>
              <div className="metric-desc">Scan Struk & Kuitansi</div>
            </div>
          </div>
        </div>

        {/* SECTION: SIMULATOR & LIVE DASHBOARD WIDGET */}
        <section id="demo">
          <div className="stage-title-wrap">
            <h2 className="stage-title">
              Coba Langsung Simulator <span className="brand-text-accent">Telegram & Dashboard Live</span>
            </h2>
            <p className="stage-subtitle">
              Klik preset kalimat di bawah atau ketik kalimat transaksimu sendiri. Dashboard langsung mengupdate saldo & anggaran secara real-time!
            </p>
          </div>

          <div className="demo-split-grid">
            
            {/* LEFT: TELEGRAM SIMULATOR */}
            <div className="glass-box" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #059669, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                    🤖
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>Mencatat Aja AI Bot</div>
                    <div style={{ fontSize: '0.72rem', color: '#34d399' }}>● online • respons 0.5s</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                  Telegram Dark Mode
                </span>
              </div>

              {/* Message Stream */}
              <div className="chat-stream-box">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}
                    dangerouslySetInnerHTML={{ __html: msg.text }}
                  />
                ))}
                {isTyping && (
                  <div style={{ alignSelf: 'flex-start', background: 'rgba(15,23,42,0.8)', padding: '8px 14px', borderRadius: '12px', fontSize: '0.75rem', color: '#34d399', fontFamily: 'monospace' }}>
                    ⏳ AI sedang menguraikan transaksi...
                  </div>
                )}
              </div>

              {/* Preset Buttons */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '6px' }}>⚡ Klik Contoh Cepat:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {presets.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleSimulateChat(p)}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', padding: '5px 10px', borderRadius: '8px', fontSize: '0.72rem', cursor: 'pointer' }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSimulateChat(chatInput);
                }}
                style={{ display: 'flex', gap: '8px' }}
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ketik misal: 'beli kopi 35rb pake gopay'..."
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', background: '#02040a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.82rem', outline: 'none' }}
                />
                <button
                  type="submit"
                  style={{ background: '#10b981', color: '#04060d', border: 'none', borderRadius: '12px', padding: '10px 18px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Kirim ➔
                </button>
              </form>

            </div>

            {/* RIGHT: LIVE DASHBOARD WIDGET */}
            <div className="glass-box" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></span>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Live Synchronized Dashboard
                  </span>
                </div>
                
                {/* DIRECT BRIDGE BUTTON */}
                <button
                  onClick={handleGoToDashboard}
                  style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', padding: '6px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>🔗</span> Buka di Dashboard Penuh ➔
                </button>
              </div>

              {/* Stats Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Saldo Terkini</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ffffff', fontFamily: 'monospace', marginTop: '4px' }}>
                    Rp {simBalance.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#34d399', marginTop: '2px' }}>● Tersinkronisasi Otomatis</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Pengeluaran</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#f87171', fontFamily: 'monospace', marginTop: '4px' }}>
                    Rp {simExpense.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#f87171', marginTop: '2px' }}>Bulan Berjalan</div>
                </div>
              </div>

              {/* Budget Progress Meter */}
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ fontWeight: '700', color: '#cbd5e1' }}>🍜 Anggaran Makanan & Minuman</span>
                  <span style={{ fontFamily: 'monospace', color: '#34d399' }}>
                    Rp {simBudgetSpent.toLocaleString('id-ID')} / Rp {simBudgetLimit.toLocaleString('id-ID')}
                  </span>
                </div>
                <div style={{ width: '100%', height: '10px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.round((simBudgetSpent / simBudgetLimit) * 100))}%`,
                      height: '100%',
                      borderRadius: '99px',
                      background: 'linear-gradient(90deg, #10b981, #f59e0b)',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8' }}>
                  <span>{Math.round((simBudgetSpent / simBudgetLimit) * 100)}% Terpakai</span>
                  <span>Sisa Rp {Math.max(0, simBudgetLimit - simBudgetSpent).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Wallets */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Dompet Terdaftar:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>🏦 BCA</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>Rp 3.500.000</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>📱 GoPay</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>Rp 850.000</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>👛 Cash</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>Rp 500.000</div>
                  </div>
                </div>
              </div>

              {/* Direct Access Action */}
              <button
                onClick={handleGoToDashboard}
                className="btn-dash-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
              >
                <span>🚀 Buka & Gunakan Dashboard Sekarang (Gratis)</span>
                <span>➔</span>
              </button>

            </div>

          </div>
        </section>

        {/* SECTION: BENTO GRID FEATURES */}
        <section id="fitur" style={{ marginTop: '80px' }}>
          <div className="stage-title-wrap">
            <h2 className="stage-title">
              Fitur Dirancang untuk <span className="brand-text-accent">Kecepatan & Privasi Maksimal</span>
            </h2>
            <p className="stage-subtitle">Semua kebutuhan manajemen arus kas dalam satu sistem AI pintar.</p>
          </div>

          <div className="bento-layout">
            <div className="bento-item">
              <div className="bento-icon">🤖</div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff' }}>AI Natural Language Parsing</h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5', marginTop: '6px' }}>
                  Ketik transaksi gaya santai. AI mengenali nominal ribuan/jutaan dan kategori otomatis.
                </p>
              </div>
              <button onClick={handleGoToDashboard} style={{ background: 'none', border: 'none', color: '#34d399', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left' }}>
                Coba di Dashboard ➔
              </button>
            </div>

            <div className="bento-item">
              <div className="bento-icon">📸</div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff' }}>OCR Scan Struk & Kuitansi</h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5', marginTop: '6px' }}>
                  Cukup foto struk belanja kasir atau kuitansi manual. AI Vision membaca rincian otomatis.
                </p>
              </div>
              <button onClick={handleGoToDashboard} style={{ background: 'none', border: 'none', color: '#34d399', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left' }}>
                Coba di Dashboard ➔
              </button>
            </div>

            <div className="bento-item">
              <div className="bento-icon">👛</div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff' }}>Multi-Dompet & Transfer</h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5', marginTop: '6px' }}>
                  Kelola Rekening Bank, E-Wallet (GoPay, OVO), dan Uang Tunai dengan mutasi transfer instan.
                </p>
              </div>
              <button onClick={handleGoToDashboard} style={{ background: 'none', border: 'none', color: '#34d399', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left' }}>
                Coba di Dashboard ➔
              </button>
            </div>

            <div className="bento-item">
              <div className="bento-icon">🎯</div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff' }}>Target & Peringatan Budget</h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5', marginTop: '6px' }}>
                  Tetapkan batas pengeluaran bulanan dan dapatkan peringatan proaktif saat mendekati batas.
                </p>
              </div>
              <button onClick={handleGoToDashboard} style={{ background: 'none', border: 'none', color: '#34d399', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left' }}>
                Coba di Dashboard ➔
              </button>
            </div>

            <div className="bento-item">
              <div className="bento-icon">📊</div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff' }}>Ekspor Laporan PDF & Excel</h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5', marginTop: '6px' }}>
                  Unduh rekapitulasi keuangan bulanan berformat PDF elegan atau spreadsheet Excel lengkap.
                </p>
              </div>
              <button onClick={handleGoToDashboard} style={{ background: 'none', border: 'none', color: '#34d399', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left' }}>
                Coba di Dashboard ➔
              </button>
            </div>

            <div className="bento-item">
              <div className="bento-icon">🔒</div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff' }}>100% Private BYOB Bot</h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5', marginTop: '6px' }}>
                  Gunakan token bot Telegram pribadi Anda sendiri dari @BotFather untuk keamanan penuh.
                </p>
              </div>
              <button onClick={handleGoToDashboard} style={{ background: 'none', border: 'none', color: '#34d399', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left' }}>
                Coba di Dashboard ➔
              </button>
            </div>
          </div>
        </section>

        {/* SECTION: PRICING */}
        <section id="pricing" style={{ marginTop: '80px' }}>
          <div className="stage-title-wrap">
            <h2 className="stage-title">
              Pilihan Paket <span className="brand-text-accent">Transparan & Terjangkau</span>
            </h2>
            <p className="stage-subtitle">Mulai gratis sekarang. Upgrade Pro kapan saja untuk kapasitas tanpa batas.</p>
          </div>

          <div className="pricing-wrap">
            {/* Starter */}
            <div className="glass-box" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>Starter (Gratis)</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: '#fff', fontFamily: 'monospace', margin: '10px 0' }}>
                  Rp 0 <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/ selamanya</span>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem', color: '#cbd5e1' }}>
                  <li>✓ Hingga 50 transaksi per bulan</li>
                  <li>✓ 2 Dompet Aktif (Cash & Bank)</li>
                  <li>✓ Integrasi Bot Telegram Standar</li>
                  <li>✓ Web Dashboard & Ringkasan Saldo</li>
                </ul>
              </div>
              <button onClick={handleGoToDashboard} className="btn-dash-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                Mulai Gratis
              </button>
            </div>

            {/* Pro */}
            <div className="pricing-card-pro" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fff' }}>Pro Member 💎</div>
                  <span style={{ fontSize: '0.68rem', fontWeight: '800', padding: '3px 8px', borderRadius: '6px', background: '#f59e0b', color: '#04060d' }}>
                    PALING POPULER
                  </span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: '#34d399', fontFamily: 'monospace', margin: '10px 0' }}>
                  Rp 29.000 <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/ bulan</span>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem', color: '#cbd5e1' }}>
                  <li>✓ <b>Unlimited</b> Transaksi & Chat AI</li>
                  <li>✓ <b>Unlimited</b> Dompet & Rekening</li>
                  <li>✓ <b>AI Vision OCR</b> Scan Struk Kuitansi</li>
                  <li>✓ <b>Ekspor Dokumen</b> Excel & PDF Pro</li>
                  <li>✓ <b>Custom Bot Token</b> (Privat Penuh)</li>
                  <li>✓ Modul <b>Kelola Langganan</b> Lengkap</li>
                </ul>
              </div>
              <button onClick={handleGoToDashboard} className="btn-dash-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                🚀 Buka Dashboard & Upgrade Pro
              </button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ marginTop: '80px', maxWidth: '800px', margin: '80px auto 0 auto' }}>
          <div className="stage-title-wrap">
            <h2 className="stage-title">Pertanyaan yang Sering Diajukan</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div key={index} className="glass-box" style={{ padding: '18px 24px', cursor: 'pointer' }} onClick={() => setActiveFaq(isOpen ? null : index)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', fontSize: '0.9rem', color: '#fff' }}>
                    <span>{faq.q}</span>
                    <span style={{ color: '#10b981', fontSize: '1.2rem' }}>{isOpen ? '−' : '+'}</span>
                  </div>
                  {isOpen && (
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.6', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* FLOATING QUICK BRIDGE BUTTON */}
      <button onClick={handleGoToDashboard} className="floating-dash-pill">
        <span>✨</span>
        <span>Buka Dashboard</span>
        <span>➔</span>
      </button>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: '#020307', padding: '40px 0', textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
        <div className="max-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#fff', fontWeight: '800' }}>Mencatat<span style={{ color: '#10b981' }}>Aja</span> AI Financial OS</span>
            <span>© 2026</span>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="#fitur" style={{ color: '#94a3b8', textDecoration: 'none' }}>Fitur</a>
            <a href="#pricing" style={{ color: '#94a3b8', textDecoration: 'none' }}>Langganan</a>
            <button onClick={handleGoToDashboard} style={{ background: 'none', border: 'none', color: '#34d399', fontWeight: '700', cursor: 'pointer' }}>Buka Dashboard</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
