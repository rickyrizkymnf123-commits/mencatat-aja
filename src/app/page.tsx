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

  const generateBar = (pct: number) => {
    const filled = Math.min(Math.round(pct / 10), 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
  };

  const faqs = [
    {
      q: 'Bagaimana cara menghubungkan akun Mencatat Aja dengan Telegram Bot?',
      a: 'Sangat mudah dan tanpa instalasi aplikasi tambahan! Cukup klik tombol "Mulai di Telegram", buka bot resmi @MencatatAjaBot, lalu kirim perintah /start. Akun Anda langsung terhubung dan siap mencatat transaksi dalam 30 detik.'
    },
    {
      q: 'Apakah saya bisa menggunakan Bot Telegram pribadi (Custom BYOB)?',
      a: 'Ya, tentu! Bagi pengguna paket Pro, Anda dapat memasukkan Token Bot Telegram milik Anda sendiri (dibuat via @BotFather) di menu Settings. Webhook akan otomatis dikonfigurasikan khusus untuk bot pribadi Anda.'
    },
    {
      q: 'Bagaimana fitur Scan Struk & Nota AI (OCR Vision) bekerja?',
      a: 'Cukup ambil foto struk belanjaan minimarket, restoran, atau nota tulisan tangan dari kamera HP lalu kirimkan langsung ke chat Telegram bot. AI Vision akan otomatis membaca nama merchant, rincian barang, total nominal, serta memasukkannya ke kategori yang sesuai.'
    },
    {
      q: 'Apakah data transaksi dan keuangan saya aman?',
      a: 'Keamanan data dan privasi Anda adalah komitmen utama kami. Seluruh database dienkripsi menggunakan standar keamanan PostgreSQL Supabase tingkat tinggi dengan koneksi SSL/TLS. Kami tidak pernah membagikan atau menjual data keuangan Anda kepada pihak ketiga manapun.'
    },
    {
      q: 'Bagaimana sistem asisten keuangan AI Financial Advisor bekerja?',
      a: 'AI memantau pola arus kas Anda secara cerdas. Jika pengeluaran kategori tertentu mendekati 80% dari batas anggaran, atau terdapat lonjakan belanja yang tidak biasa, bot Telegram akan otomatis mengirimkan pesan peringatan ramah dan saran penghematan.'
    },
    {
      q: 'Metode pembayaran apa saja yang didukung untuk upgrade ke Pro?',
      a: 'Kami menerima pembayaran instan otomatis via QRIS (GoPay, OVO, ShopeePay, DANA, BCA Mobile), Virtual Account bank-bank ternama Indonesia via Midtrans, serta metode Transfer Bank Manual.'
    }
  ];

  return (
    <div className="landing-dark-root">
      {/* SCOPED DARK THEME STYLES */}
      <style jsx global>{`
        :root {
          --dark-bg: #060813;
          --dark-surface: rgba(15, 23, 42, 0.75);
          --dark-card: rgba(30, 41, 59, 0.6);
          --dark-border: rgba(255, 255, 255, 0.08);
          --neon-emerald: #10b981;
          --neon-cyan: #06b6d4;
          --neon-amber: #f59e0b;
        }

        .landing-dark-root {
          background-color: var(--dark-bg);
          color: #f8fafc;
          font-family: inherit;
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
        }

        /* Ambient Glow Blobs */
        .glow-ambient {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .glow-blob-1 {
          position: absolute;
          top: -150px;
          left: 50%;
          transform: translateX(-50%);
          width: 800px;
          height: 500px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.16) 0%, rgba(16, 185, 129, 0) 70%);
          filter: blur(100px);
        }
        .glow-blob-2 {
          position: absolute;
          top: 35%;
          left: -150px;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0) 70%);
          filter: blur(120px);
        }
        .glow-blob-3 {
          position: absolute;
          top: 65%;
          right: -150px;
          width: 650px;
          height: 650px;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0) 70%);
          filter: blur(130px);
        }

        /* Content Container */
        .landing-content {
          position: relative;
          z-index: 10;
        }

        /* Glass Navbar */
        .dark-navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(6, 8, 19, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--dark-border);
          padding: 16px 6%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .brand-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.35rem;
          font-weight: 800;
          color: #ffffff;
          text-decoration: none;
          letter-spacing: -0.02em;
        }
        .brand-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: linear-gradient(135deg, #10b981 0%, #0d9488 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
        }
        .brand-pill {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 2px 8px;
          border-radius: 99px;
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
          margin-left: 6px;
        }

        .dark-nav-links {
          display: flex;
          align-items: center;
          gap: 32px;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .dark-nav-links a {
          color: #94a3b8;
          text-decoration: none;
          font-size: 0.92rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .dark-nav-links a:hover {
          color: #34d399;
        }

        .dark-nav-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .btn-glass {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #f1f5f9;
          padding: 8px 18px;
          border-radius: 12px;
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .btn-glass:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }
        .btn-glow-primary {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #060813;
          padding: 9px 22px;
          border-radius: 12px;
          font-size: 0.88rem;
          font-weight: 800;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.35);
          transition: all 0.25s ease;
          border: none;
          cursor: pointer;
        }
        .btn-glow-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(16, 185, 129, 0.5);
          background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
          color: #020617;
        }

        /* Hero Section */
        .dark-hero {
          max-width: 1100px;
          margin: 0 auto;
          padding: 70px 24px 50px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
          font-size: 0.82rem;
          font-weight: 700;
          padding: 6px 16px;
          border-radius: 99px;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
        }
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 10px #34d399;
        }
        .hero-title {
          font-size: clamp(2.4rem, 5.5vw, 4.2rem);
          font-weight: 900;
          line-height: 1.12;
          letter-spacing: -0.035em;
          color: #ffffff;
          margin: 0;
        }
        .gradient-text-emerald {
          background: linear-gradient(135deg, #34d399 0%, #10b981 50%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-subtitle {
          font-size: clamp(1.05rem, 2vw, 1.25rem);
          color: #94a3b8;
          max-width: 720px;
          line-height: 1.6;
          margin: 0;
        }
        .hero-actions-group {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 8px;
        }

        /* Metrics Grid */
        .metrics-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          width: 100%;
          max-width: 950px;
          margin-top: 40px;
          padding-top: 32px;
          border-top: 1px solid var(--dark-border);
          text-align: left;
        }
        .metric-item {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .metric-icon {
          font-size: 1.6rem;
        }
        .metric-val {
          font-size: 1.15rem;
          font-weight: 800;
          color: #ffffff;
        }
        .metric-lbl {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 2px;
        }

        /* Interactive Simulator Section */
        .simulator-section {
          max-width: 1180px;
          margin: 40px auto 90px auto;
          padding: 0 24px;
        }
        .section-heading-center {
          text-align: center;
          margin-bottom: 48px;
        }
        .section-pill-tag {
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #34d399;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 4px 14px;
          border-radius: 99px;
          display: inline-block;
          margin-bottom: 12px;
        }
        .section-heading-center h2 {
          font-size: clamp(1.8rem, 3.5vw, 2.75rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #ffffff;
          margin: 0;
        }
        .section-heading-center p {
          color: #94a3b8;
          font-size: 1.05rem;
          margin-top: 8px;
        }

        .sim-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          align-items: stretch;
        }

        /* Glass Cards */
        .glass-box {
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--dark-border);
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
          overflow: hidden;
        }

        /* Telegram Mockup Dark */
        .tg-container {
          display: flex;
          flex-direction: column;
          height: 560px;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .tg-topbar {
          background: rgba(10, 15, 29, 0.9);
          padding: 14px 20px;
          border-bottom: 1px solid var(--dark-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .tg-user-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #06b6d4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
        }
        .tg-chat-stream {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: rgba(6, 8, 19, 0.6);
        }
        .chat-bubble {
          max-width: 82%;
          padding: 12px 16px;
          border-radius: 18px;
          font-size: 0.88rem;
          line-height: 1.5;
          word-break: break-word;
        }
        .bubble-user {
          align-self: flex-end;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          color: #ffffff;
          border-bottom-right-radius: 4px;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.25);
        }
        .bubble-bot {
          align-self: flex-start;
          background: rgba(30, 41, 59, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #f1f5f9;
          border-bottom-left-radius: 4px;
        }
        .bubble-time {
          font-size: 0.68rem;
          opacity: 0.7;
          text-align: right;
          margin-top: 4px;
          display: block;
        }
        .quick-chips-row {
          padding: 10px 14px;
          background: rgba(10, 15, 29, 0.8);
          border-top: 1px solid var(--dark-border);
          display: flex;
          gap: 8px;
          overflow-x: auto;
        }
        .chip-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          padding: 4px 12px;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .chip-btn:hover {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.4);
          color: #34d399;
        }
        .tg-input-bar {
          padding: 12px 16px;
          background: rgba(10, 15, 29, 0.95);
          border-top: 1px solid var(--dark-border);
          display: flex;
          gap: 10px;
        }
        .tg-text-field {
          flex: 1;
          background: rgba(2, 6, 23, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 10px 16px;
          color: #ffffff;
          font-size: 0.88rem;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .tg-text-field:focus {
          border-color: #10b981;
        }

        /* Live Dashboard Widget */
        .dash-widget {
          padding: 28px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .dash-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin: 20px 0;
        }
        .stat-card-dark {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 14px;
        }
        .stat-card-dark .lbl {
          font-size: 0.72rem;
          color: #94a3b8;
          font-weight: 600;
          display: block;
        }
        .stat-card-dark .val {
          font-size: 1.05rem;
          font-weight: 800;
          color: #ffffff;
          margin-top: 4px;
          display: block;
        }

        /* Bento Grid Features */
        .features-section {
          max-width: 1180px;
          margin: 0 auto 100px auto;
          padding: 0 24px;
        }
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .bento-card {
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid var(--dark-border);
          border-radius: 20px;
          padding: 32px 28px;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .bento-card:hover {
          border-color: rgba(16, 185, 129, 0.4);
          transform: translateY(-4px);
          box-shadow: 0 15px 35px -10px rgba(16, 185, 129, 0.2);
        }
        .bento-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          margin-bottom: 20px;
        }
        .bento-card h3 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 10px 0;
        }
        .bento-card p {
          color: #94a3b8;
          font-size: 0.9rem;
          line-height: 1.6;
          margin: 0;
        }

        /* Pricing Section */
        .pricing-section {
          max-width: 980px;
          margin: 0 auto 100px auto;
          padding: 0 24px;
          text-align: center;
        }
        .pricing-toggle-wrap {
          display: inline-flex;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid var(--dark-border);
          padding: 5px;
          border-radius: 99px;
          margin-bottom: 40px;
        }
        .pricing-toggle-btn {
          padding: 8px 22px;
          border-radius: 99px;
          font-size: 0.88rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .pricing-toggle-btn.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #060813;
        }
        .pricing-toggle-btn:not(.active) {
          background: transparent;
          color: #94a3b8;
        }
        .pricing-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
          text-align: left;
        }
        .price-card-dark {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid var(--dark-border);
          border-radius: 24px;
          padding: 40px 32px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
        }
        .price-card-dark.pro-card {
          border-color: rgba(16, 185, 129, 0.5);
          box-shadow: 0 0 40px rgba(16, 185, 129, 0.15);
        }

        /* FAQ Section */
        .faq-section {
          max-width: 820px;
          margin: 0 auto 100px auto;
          padding: 0 24px;
        }
        .faq-accordion {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .faq-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--dark-border);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        .faq-card.open {
          border-color: rgba(16, 185, 129, 0.35);
        }
        .faq-question-btn {
          width: 100%;
          padding: 20px 24px;
          background: transparent;
          border: none;
          color: #ffffff;
          font-weight: 700;
          font-size: 1rem;
          text-align: left;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
        }
        .faq-answer-body {
          padding: 0 24px 20px 24px;
          color: #94a3b8;
          font-size: 0.92rem;
          line-height: 1.6;
        }

        /* Final CTA */
        .final-cta-section {
          max-width: 1100px;
          margin: 0 auto 80px auto;
          padding: 0 24px;
        }
        .cta-banner-dark {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.95) 50%, rgba(6, 182, 212, 0.15) 100%);
          border: 1px solid rgba(16, 185, 129, 0.35);
          border-radius: 28px;
          padding: 60px 32px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        /* Footer */
        .dark-footer {
          border-top: 1px solid var(--dark-border);
          padding: 40px 6%;
          color: #64748b;
          font-size: 0.85rem;
        }

        @media (max-width: 900px) {
          .dark-nav-links { display: none; }
          .metrics-bar { grid-template-columns: repeat(2, 1fr); }
          .sim-grid { grid-template-columns: 1fr; }
          .bento-grid { grid-template-columns: 1fr; }
          .pricing-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* AMBIENT GLOW BACKGROUND */}
      <div className="glow-ambient">
        <div className="glow-blob-1"></div>
        <div className="glow-blob-2"></div>
        <div className="glow-blob-3"></div>
      </div>

      <div className="landing-content">
        {/* NAVBAR */}
        <nav className="dark-navbar">
          <Link href="/" className="brand-logo">
            <div className="brand-icon">✨</div>
            <span>Mencatat<span style={{ color: '#10b981' }}>Aja</span></span>
            <span className="brand-pill">AI Bot</span>
          </Link>

          <ul className="dark-nav-links">
            <li><a href="#demo">Demo Bot</a></li>
            <li><a href="#fitur">Fitur AI</a></li>
            <li><a href="#pricing">Paket Harga</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>

          <div className="dark-nav-actions">
            <Link href="/auth?mode=login" className="btn-glass">
              Masuk
            </Link>
            <Link href="/auth?mode=register" className="btn-glow-primary">
              Mulai Gratis <span>→</span>
            </Link>
          </div>
        </nav>

        {/* HERO SECTION */}
        <header className="dark-hero">
          <div className="hero-badge">
            <span className="pulse-dot"></span>
            <span>Asisten Finansial AI Terintegrasi Telegram #1 di Indonesia</span>
          </div>

          <h1 className="hero-title">
            Catat Pengeluaran Semudah Chat.<br />
            <span className="gradient-text-emerald">Langsung dari Telegram Anda.</span>
          </h1>

          <p className="hero-subtitle">
            Tidak perlu install aplikasi berat atau login rumit setiap kali jajan. Cukup ketik santai seperti kirim chat biasa atau kirim foto struk belanjaan, AI kami yang otomatis mencatat dan mengatur keuangan Anda.
          </p>

          <div className="hero-actions-group">
            <Link href="/auth?mode=register" className="btn-glow-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
              <span>⚡</span> Coba Gratis Sekarang
            </Link>
            <a href="#demo" className="btn-glass" style={{ padding: '14px 28px', fontSize: '1rem' }}>
              <span>▶</span> Coba Simulator Live
            </a>
          </div>

          {/* METRICS BAR */}
          <div className="metrics-bar">
            <div className="metric-item">
              <span className="metric-icon">⭐</span>
              <div>
                <div className="metric-val">4.9 / 5.0</div>
                <div className="metric-lbl">Rating Kepuasan Pengguna</div>
              </div>
            </div>
            <div className="metric-item">
              <span className="metric-icon">⚡</span>
              <div>
                <div className="metric-val">&lt; 0.3 Detik</div>
                <div className="metric-lbl">Respon AI Super Kilat</div>
              </div>
            </div>
            <div className="metric-item">
              <span className="metric-icon">🔒</span>
              <div>
                <div className="metric-val">Enkripsi AES</div>
                <div className="metric-lbl">Keamanan Data Bank-Grade</div>
              </div>
            </div>
            <div className="metric-item">
              <span className="metric-icon">👥</span>
              <div>
                <div className="metric-val">50.000+</div>
                <div className="metric-lbl">Transaksi Berhasil Tercatat</div>
              </div>
            </div>
          </div>
        </header>

        {/* INTERACTIVE DEMO (SIMULATOR + LIVE DASHBOARD) */}
        <section id="demo" className="simulator-section">
          <div className="section-heading-center">
            <span className="section-pill-tag">Interactive Preview</span>
            <h2>Uji Coba Keajaiban AI Langsung di Bawah Ini</h2>
            <p>Ketik kalimat pengeluaran atau pemasukan bebas dan lihat dashboard tersinkronisasi secara instan.</p>
          </div>

          <div className="sim-grid">
            {/* Telegram Dark Mode Chat Mockup */}
            <div className="glass-box tg-container">
              <div className="tg-topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="tg-user-avatar">🤖</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Mencatat Aja AI Bot
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>Online • @MencatatAjaBot</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: '6px', color: '#94a3b8' }}>
                  Live Mode
                </span>
              </div>

              {/* Chat Stream */}
              <div className="tg-chat-stream">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`chat-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-bot'}`}>
                    <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }} />
                    <span className="bubble-time">{msg.time}</span>
                  </div>
                ))}
                {isTyping && (
                  <div className="chat-bubble bubble-bot" style={{ fontStyle: 'italic', color: '#94a3b8' }}>
                    ✍️ AI sedang memproses & menyusun transaksi...
                  </div>
                )}
              </div>

              {/* Quick Prompt Chips */}
              <div className="quick-chips-row">
                <button type="button" onClick={() => handleSimulateChat('🍜 Makan Siang Padang 28rb')} className="chip-btn">🍜 Makan 28rb</button>
                <button type="button" onClick={() => handleSimulateChat('☕ Kopi Susu 22rb pake GoPay')} className="chip-btn">☕ Kopi 22rb GoPay</button>
                <button type="button" onClick={() => handleSimulateChat('💰 Gaji Masuk 8.500.000 BCA')} className="chip-btn" style={{ borderColor: 'rgba(16,185,129,0.3)', color: '#34d399' }}>💰 Gaji 8.5jt BCA</button>
                <button type="button" onClick={() => handleSimulateChat('🚗 Bensin Pertamax 50rb')} className="chip-btn">🚗 Bensin 50rb</button>
                <button type="button" onClick={() => handleSimulateChat('📸 Struk Indomaret 145rb')} className="chip-btn" style={{ borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8' }}>📸 Struk 145rb</button>
              </div>

              {/* Input Bar */}
              <form onSubmit={(e) => { e.preventDefault(); handleSimulateChat(chatInput); }} className="tg-input-bar">
                <input
                  type="text"
                  placeholder="Ketik transaksi... (misal: jajan martabak 35rb)"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="tg-text-field"
                />
                <button type="submit" className="btn-glow-primary" style={{ padding: '0 18px', borderRadius: '14px' }}>
                  Kirim
                </button>
              </form>
            </div>

            {/* Live Dashboard Sync Panel */}
            <div className="glass-box dash-widget">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--dark-border)' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>Realtime Sync Widget</span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '4px 0 0 0', color: '#ffffff' }}>Web Dashboard Preview</h3>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', background: 'rgba(16,185,129,0.12)', padding: '4px 12px', borderRadius: '99px', border: '1px solid rgba(16,185,129,0.3)' }}>
                    🟢 Tersinkron Otomatis
                  </span>
                </div>

                {/* 3 Stats */}
                <div className="dash-stat-grid">
                  <div className="stat-card-dark">
                    <span className="lbl">Total Saldo</span>
                    <span className="val" style={{ color: '#ffffff' }}>Rp {simBalance.toLocaleString('id-ID')}</span>
                    <span style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 600 }}>3 Dompet Aktif</span>
                  </div>
                  <div className="stat-card-dark">
                    <span className="lbl">Pengeluaran</span>
                    <span className="val" style={{ color: '#f87171' }}>Rp {simExpense.toLocaleString('id-ID')}</span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Bulan Ini</span>
                  </div>
                  <div className="stat-card-dark">
                    <span className="lbl">Sisa Budget</span>
                    <span className="val" style={{ color: '#fbbf24' }}>Rp {Math.max(0, simBudgetLimit - simBudgetSpent).toLocaleString('id-ID')}</span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Kategori Makanan</span>
                  </div>
                </div>

                {/* Dynamic SVG Trend Graph */}
                <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px', padding: '16px', margin: '16px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>Tren Pengeluaran Periode Ini</span>
                    <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>Terkontrol Baik</span>
                  </div>
                  <div style={{ position: 'relative', width: '100%', height: '110px' }}>
                    <svg viewBox="0 0 400 110" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="dashChartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.4"/>
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0.0"/>
                        </linearGradient>
                      </defs>
                      <path d="M 10 80 Q 90 35 180 65 T 310 25 T 390 45 L 390 100 L 10 100 Z" fill="url(#dashChartGrad)" />
                      <path d="M 10 80 Q 90 35 180 65 T 310 25 T 390 45" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round"/>
                      <circle cx="10" cy="80" r="4" fill="#10B981"/>
                      <circle cx="180" cy="65" r="4" fill="#10B981"/>
                      <circle cx="310" cy="25" r="4" fill="#10B981"/>
                      <circle cx="390" cy="45" r="5" fill="#34D399" />
                    </svg>
                  </div>
                </div>

                {/* Budget Bar */}
                <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
                    <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Batas Budget: 🍜 Makanan & Minuman</span>
                    <span style={{ color: '#34d399', fontWeight: 800 }}>
                      Rp {simBudgetSpent.toLocaleString('id-ID')} / Rp {simBudgetLimit.toLocaleString('id-ID')} ({Math.min(100, Math.round((simBudgetSpent / simBudgetLimit) * 100))}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(2,6,23,0.8)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.round((simBudgetSpent / simBudgetLimit) * 100))}%`,
                        background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                        borderRadius: '99px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ paddingTop: '16px', borderTop: '1px solid var(--dark-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                <span>✨ Multi-Engine AI (Gemini / DeepSeek)</span>
                <span style={{ color: '#34d399', fontWeight: 700 }}>Auto-Categorization ⚡</span>
              </div>
            </div>
          </div>
        </section>

        {/* BENTO GRID FEATURES SECTION */}
        <section id="fitur" className="features-section">
          <div className="section-heading-center">
            <span className="section-pill-tag">Fitur Unggulan</span>
            <h2>Semua Kemudahan Finansial Dalam Satu Genggaman</h2>
            <p>Dirancang agar kamu tidak lagi merasa terbebani oleh pencatatan keuangan yang rumit.</p>
          </div>

          <div className="bento-grid">
            <div className="bento-card">
              <div>
                <div className="bento-icon">🤖</div>
                <h3>Natural Language Parsing</h3>
                <p>Ketik kalimat bebas dalam bahasa sehari-hari. AI menguraikan angka nominal, kategori, dan dompet secara akurat tanpa perlu format kaku.</p>
              </div>
              <div style={{ marginTop: '24px', paddingTop: '14px', borderTop: '1px solid var(--dark-border)', fontSize: '0.78rem', color: '#34d399', fontWeight: 700 }}>
                Mendukung Singkatan "50rb", "25k", "1.5jt" →
              </div>
            </div>

            <div className="bento-card">
              <div>
                <div className="bento-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)' }}>📸</div>
                <h3>OCR Vision Scan Struk</h3>
                <p>Cukup foto struk belanjaan minimarket atau kuitansi fisik. AI Vision secara otomatis memindai seluruh item belanja dan total tagihan.</p>
              </div>
              <div style={{ marginTop: '24px', paddingTop: '14px', borderTop: '1px solid var(--dark-border)', fontSize: '0.78rem', color: '#818cf8', fontWeight: 700 }}>
                Tersedia Khusus Paket Pro →
              </div>
            </div>

            <div className="bento-card">
              <div>
                <div className="bento-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>👛</div>
                <h3>Multi-Dompet & Rekening</h3>
                <p>Kelola saldo tunai (Cash), rekening bank (BCA, Mandiri), dan e-wallet (GoPay, OVO, ShopeePay) secara terpisah namun terpusat.</p>
              </div>
              <div style={{ marginTop: '24px', paddingTop: '14px', borderTop: '1px solid var(--dark-border)', fontSize: '0.78rem', color: '#fbbf24', fontWeight: 700 }}>
                Dukungan Transfer Antar-Dompet →
              </div>
            </div>

            <div className="bento-card">
              <div>
                <div className="bento-icon" style={{ background: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.3)' }}>🎯</div>
                <h3>Smart Budgeting & Alerts</h3>
                <p>Tetapkan batas belanja bulanan per kategori. Bot Telegram akan memberi notifikasi sebelum Anda overbudget di pertengahan bulan.</p>
              </div>
              <div style={{ marginTop: '24px', paddingTop: '14px', borderTop: '1px solid var(--dark-border)', fontSize: '0.78rem', color: '#fb7185', fontWeight: 700 }}>
                Peringatan Dini Pengeluaran →
              </div>
            </div>

            <div className="bento-card">
              <div>
                <div className="bento-icon" style={{ background: 'rgba(6, 182, 212, 0.1)', borderColor: 'rgba(6, 182, 212, 0.3)' }}>📊</div>
                <h3>Ekspor Laporan PDF & Excel</h3>
                <p>Dapatkan laporan keuangan bulanan berformat rapi spreadsheet Excel (.xlsx) atau dokumen PDF profesional untuk evaluasi & perpajakan.</p>
              </div>
              <div style={{ marginTop: '24px', paddingTop: '14px', borderTop: '1px solid var(--dark-border)', fontSize: '0.78rem', color: '#22d3ee', fontWeight: 700 }}>
                Download Sekali Klik →
              </div>
            </div>

            <div className="bento-card">
              <div>
                <div className="bento-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>🛡️</div>
                <h3>Keamanan & Privasi Maksimal</h3>
                <p>Data Anda diamankan dengan enkripsi standar industri. Kami menjamin kerahasiaan penuh tanpa ada penjualan data ke pihak ketiga.</p>
              </div>
              <div style={{ marginTop: '24px', paddingTop: '14px', borderTop: '1px solid var(--dark-border)', fontSize: '0.78rem', color: '#34d399', fontWeight: 700 }}>
                100% Enkripsi PostgreSQL →
              </div>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="pricing-section">
          <div className="section-heading-center">
            <span className="section-pill-tag">Paket & Harga</span>
            <h2>Investasi Terbaik Untuk Masa Depan Keuanganmu</h2>
            <p>Mulai gratis sekarang dan tingkatkan ke Pro kapan saja untuk fitur tanpa batas.</p>
          </div>

          <div className="pricing-toggle-wrap">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`pricing-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
            >
              Langganan Bulanan
            </button>
            <button
              onClick={() => setBillingCycle('once')}
              className={`pricing-toggle-btn ${billingCycle === 'once' ? 'active' : ''}`}
            >
              Lifetime Promo (Sekali Bayar)
            </button>
          </div>

          <div className="pricing-grid">
            {/* Starter */}
            <div className="price-card-dark">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>Starter</h3>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '99px', color: '#cbd5e1', fontWeight: 600 }}>
                    Gratis Selamanya
                  </span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0 0 20px 0' }}>
                  Cocok untuk pengguna pemula yang ingin mulai disiplin mencatat transaksi harian.
                </p>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', marginBottom: '24px' }}>
                  Rp 0 <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#64748b' }}>/ selamanya</span>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> 50 Transaksi Telegram / Bulan</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> AI Natural Language Parsing</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> 2 Dompet Aktif (Cash & Rekening)</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Akses Web Dashboard Real-time</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b', textDecoration: 'line-through' }}><span style={{ color: '#475569' }}>✕</span> OCR Scan Struk & Nota AI Vision</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b', textDecoration: 'line-through' }}><span style={{ color: '#475569' }}>✕</span> Ekspor Dokumen PDF & Excel</li>
                </ul>
              </div>

              <Link href="/auth?mode=register" className="btn-glass" style={{ textAlign: 'center', marginTop: '32px', padding: '12px' }}>
                Daftar Starter Gratis
              </Link>
            </div>

            {/* Pro */}
            <div className="price-card-dark pro-card">
              <div style={{ position: 'absolute', top: '-14px', right: '24px', background: 'linear-gradient(135deg, #10b981, #06b6d4)', color: '#060813', fontSize: '0.72rem', fontWeight: 900, padding: '4px 14px', borderRadius: '99px', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
                PALING POPULER 👑
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Pro Member <span style={{ color: '#34d399' }}>⚡</span>
                  </h3>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', padding: '4px 10px', borderRadius: '99px', color: '#34d399', fontWeight: 700 }}>
                    Akses Penuh
                  </span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0 0 20px 0' }}>
                  Solusi komprehensif bagi pebisnis, freelancer, dan profesional yang butuh insight keuangan mendalam.
                </p>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', marginBottom: '24px' }}>
                  {billingCycle === 'monthly' ? (
                    <>Rp 29.000 <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#64748b' }}>/ bulan (Promo)</span></>
                  ) : (
                    <>Rp 149.000 <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#34d399' }}>/ sekali bayar selamanya</span></>
                  )}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem', color: '#e2e8f0' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> <strong>Transaksi Telegram Tanpa Batas</strong></li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> <strong>OCR Scan Struk & Nota AI Vision</strong></li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Multi-Dompet & E-Wallet Tanpa Batas</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Smart Budget & AI Financial Warning</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Ekspor Laporan Lengkap PDF & Excel (.xlsx)</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Integrasi Bot Telegram Kustom (BYOB)</li>
                </ul>
              </div>

              <Link href="/auth?mode=register" className="btn-glow-primary" style={{ textAlign: 'center', marginTop: '32px', padding: '14px', borderRadius: '14px', justifyContent: 'center' }}>
                Upgrade ke Pro Sekarang →
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ ACCORDION */}
        <section id="faq" className="faq-section">
          <div className="section-heading-center">
            <span className="section-pill-tag">Frequently Asked Questions</span>
            <h2>Pertanyaan yang Sering Diajukan</h2>
            <p>Punya pertanyaan lain seputar penggunaan Mencatat Aja?</p>
          </div>

          <div className="faq-accordion">
            {faqs.map((faq, index) => (
              <div key={index} className={`faq-card ${activeFaq === index ? 'open' : ''}`}>
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="faq-question-btn"
                >
                  <span>{faq.q}</span>
                  <span style={{ fontSize: '1.2rem', color: '#10b981' }}>
                    {activeFaq === index ? '−' : '+'}
                  </span>
                </button>
                {activeFaq === index && (
                  <div className="faq-answer-body">
                    <p style={{ margin: 0 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* HIGH-IMPACT BOTTOM CTA */}
        <section className="final-cta-section">
          <div className="cta-banner-dark">
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 900, color: '#ffffff', margin: '0 0 16px 0', letterSpacing: '-0.02em' }}>
              Mulai Kendalikan Keuanganmu Hari Ini.
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 32px auto', lineHeight: 1.6 }}>
              Bergabung bersama ribuan pengguna cerdas lainnya yang mencatat pengeluaran harian secara rapi, cepat, dan santai langsung dari Telegram.
            </p>
            <Link href="/auth?mode=register" className="btn-glow-primary" style={{ padding: '16px 38px', fontSize: '1.05rem', borderRadius: '16px' }}>
              Mulai Gratis Dalam 30 Detik ⚡
            </Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="dark-footer">
          <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="brand-icon" style={{ width: '28px', height: '28px', fontSize: '0.9rem' }}>✨</div>
              <span style={{ fontWeight: 800, color: '#ffffff' }}>Mencatat Aja</span>
              <span style={{ color: '#475569' }}>|</span>
              <span>© 2026 PT Mencatat Aja Indonesia. Hak cipta dilindungi undang-undang.</span>
            </div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: 600 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
                Sistem Normal
              </span>
              <Link href="/auth?mode=login" style={{ color: '#94a3b8', textDecoration: 'none' }}>Masuk</Link>
              <Link href="/auth?mode=register" style={{ color: '#94a3b8', textDecoration: 'none' }}>Daftar</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
