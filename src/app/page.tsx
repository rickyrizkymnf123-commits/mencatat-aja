'use strict';
'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'once'>('once');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // Interactive Chat State for Simulator
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string; type?: string }>>([
    {
      sender: 'bot',
      text: '👋 <b>Halo! Mencatat Aja terhubung.</b>\nKetik transaksi kamu sekarang untuk mencatat otomatis. Contoh: <i>"beli bakso 15rb"</i> atau kirim foto struk.',
      time: '12:00',
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSimulateChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    
    // Add User Message
    setChatMessages(prev => [...prev, { sender: 'user', text: userText, time: timeNow }]);
    setChatInput('');
    setIsTyping(true);

    // Simulate Bot Response based on common Indonesian patterns
    setTimeout(() => {
      setIsTyping(false);
      let replyText = '';
      const lower = userText.toLowerCase();
      
      if (lower.includes('bakso') || lower.includes('makan') || lower.includes('rb')) {
        let nominal = '15.000';
        if (lower.includes('15')) nominal = '15.000';
        else if (lower.includes('20')) nominal = '20.000';
        else if (lower.includes('50')) nominal = '50.000';
        
        replyText = `📅 Minggu, 2 Agustus 2026 — ${timeNow}
💸 <b>Pengeluaran tercatat!</b>
├ Nominal : Rp ${nominal}
├ Kategori : 🍜 Makanan
├ Dompet : 👛 Cash (Utama)
├ Catatan : ${userText}
└ Saldo : Rp 2.485.000

📊 Budget [Makanan] bulan ini:
████░░░░░░ 40% — sisa Rp 600.000
💪 Jangan lupa kurangi jajan kopi sore ya biar hemat!`;
      } else if (lower.includes('gaji') || lower.includes('jt') || lower.includes('pemasukan')) {
        let nominal = '5.000.000';
        if (lower.includes('5')) nominal = '5.000.000';
        else if (lower.includes('8')) nominal = '8.000.000';
        
        replyText = `📅 Minggu, 2 Agustus 2026 — ${timeNow}
💰 <b>Pemasukan tercatat!</b>
├ Nominal : Rp ${nominal}
├ Kategori : 💼 Pemasukan
├ Dompet : 👛 BCA (Utama)
└ Saldo baru : Rp 10.485.000

💪 Semangat terus! Jangan lupa sisihkan untuk tabungan ya.`;
      } else {
        replyText = `📅 Minggu, 2 Agustus 2026 — ${timeNow}
💸 <b>Transaksi tercatat!</b>
├ Nominal : Rp 50.000
├ Kategori : 💰 Lainnya
├ Dompet : 👛 Cash
├ Catatan : ${userText}
└ Saldo : Rp 2.450.000`;
      }

      setChatMessages(prev => [...prev, { sender: 'bot', text: replyText, time: timeNow }]);
    }, 1200);
  };

  const faqs = [
    {
      q: 'Bagaimana cara menghubungkan akun Mencatat Aja dengan Telegram Bot?',
      a: 'Sangat mudah! Setelah mendaftar di web Mencatat Aja, buka halaman Settings > Telegram Bot. Ikuti panduan untuk membuka bot resmi kami, lalu masukkan kode pairing unik yang tertera di sana (contoh: <code>/start TD-XXXXXX</code>) untuk langsung menghubungkan akun secara instan.'
    },
    {
      q: 'Apakah saya bisa memproses foto struk belanjaan di paket Starter?',
      a: 'Tidak. Fitur OCR berbasis kecerdasan buatan (AI Vision) untuk memindai foto struk, membaca detail nama merchant, barang belanjaan, beserta harganya, eksklusif tersedia bagi pengguna paket Pro.'
    },
    {
      q: 'Apakah Mencatat Aja mendukung pencatatan dalam mata uang lain?',
      a: 'Secara default, mata uang utama yang digunakan adalah Rupiah (Rp/IDR). Namun Anda bisa mengatur mata uang pilihan Anda melalui tab Profil di halaman Settings.'
    },
    {
      q: 'Bagaimana keamanan data transaksi saya di Mencatat Aja?',
      a: 'Keamanan Anda adalah prioritas kami. Semua data transaksi Anda disimpan secara aman di infrastruktur PostgreSQL Supabase yang terenkripsi. Kami tidak membagikan data keuangan Anda ke pihak ketiga manapun. Token bot dan API Key provider AI yang Anda masukkan juga disimpan terenkripsi dengan aman di database.'
    },
    {
      q: 'Bagaimana sistem asisten keuangan AI Financial Advisor bekerja?',
      a: 'AI Financial Advisor mendeteksi pola transaksi Anda secara real-time. Jika pengeluaran satu kategori naik di atas 50% dibanding minggu lalu, pengeluaran bulanan Anda melebihi 80% pemasukan, atau ada transaksi besar di atas 20% budget kategori Anda, asisten AI akan otomatis mengirimkan peringatan dan saran hemat langsung ke chat Telegram Anda.'
    },
    {
      q: 'Apakah saya bisa mengekspor laporan ke format PDF dan Excel di paket Starter?',
      a: 'Di paket Starter, Anda hanya bisa melihat ringkasan bulanan di web. Menu filter transaksi mendalam dan fitur ekspor dokumen laporan ke format PDF dan Excel (.xlsx) tanpa batas hanya tersedia di paket Pro.'
    },
    {
      q: 'Bagaimana cara pembayaran langganan / pembelian paket?',
      a: 'Kami menggunakan sistem pembayaran resmi Midtrans yang mendukung pembayaran otomatis lewat e-wallet (GoPay, OVO, ShopeePay), QRIS, Virtual Account bank-bank utama Indonesia, serta opsi transfer manual dengan konfirmasi persetujuan dari tim admin kami.'
    }
  ];

  return (
    <div className="landing-root">
      {/* Dynamic Landing CSS (Scoped to Landing Page) */}
      <style jsx global>{`
        .landing-root {
          background-color: var(--background);
          color: var(--text-main);
        }
        
        /* Navbar */
        .navbar {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          background-color: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 5%;
        }
        .logo-text {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--primary);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 32px;
          list-style: none;
        }
        .nav-links a {
          color: var(--text-muted);
          font-weight: 500;
          transition: color var(--transition-fast);
        }
        .nav-links a:hover {
          color: var(--primary);
        }
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        /* Hero */
        .hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 80px 5% 60px 5%;
          max-width: 1000px;
          margin: 0 auto;
          gap: 24px;
        }
        .pre-headline {
          background-color: var(--primary-light);
          color: var(--primary);
          padding: 8px 16px;
          border-radius: 100px;
          font-size: 0.85rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid hsla(20, 100%, 50%, 0.1);
        }
        .hero h1 {
          font-size: clamp(2.5rem, 5vw, 4.2rem);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
        }
        .text-gradient {
          background: linear-gradient(90deg, var(--primary) 0%, #ff8a00 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero p {
          font-size: clamp(1.1rem, 2vw, 1.35rem);
          color: var(--text-muted);
          max-width: 720px;
          line-height: 1.5;
        }
        .hero-actions {
          display: flex;
          gap: 16px;
          margin-top: 16px;
        }
        
        /* Video Container */
        .video-wrapper {
          width: 90%;
          max-width: 950px;
          margin: 40px auto 80px auto;
          aspect-ratio: 16/9;
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          padding: 10px;
          overflow: hidden;
          position: relative;
        }
        .video-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #fff3eb 0%, #ffe9d9 100%);
          border-radius: calc(var(--radius-lg) - 10px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: var(--primary);
        }

        /* Problem Section */
        .problems-section {
          background-color: #ffffff;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 80px 5%;
        }
        .section-header {
          text-align: center;
          margin-bottom: 50px;
          max-width: 650px;
          margin-left: auto;
          margin-right: auto;
        }
        .section-header h2 {
          font-size: 2.2rem;
          margin-bottom: 16px;
        }
        .section-header p {
          color: var(--text-muted);
        }
        .problem-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .problem-card {
          background: var(--background);
          border: 1px solid var(--border);
          padding: 32px;
          border-radius: var(--radius-lg);
        }
        .problem-icon {
          font-size: 2rem;
          margin-bottom: 16px;
        }
        .problem-card h3 {
          font-size: 1.3rem;
          margin-bottom: 12px;
        }
        .problem-card p {
          color: var(--text-muted);
          font-size: 0.95rem;
          line-height: 1.6;
        }

        /* Transition / Intro Banner */
        .intro-banner {
          text-align: center;
          padding: 90px 5%;
          max-width: 800px;
          margin: 0 auto;
        }
        .intro-banner h3 {
          font-size: 1.5rem;
          color: var(--primary);
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .intro-banner h2 {
          font-size: 2.6rem;
          line-height: 1.3;
        }

        /* Interactive Simulator */
        .simulator-section {
          padding: 60px 5%;
          max-width: 1200px;
          margin: 0 auto;
        }
        .simulator-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 48px;
          align-items: center;
        }
        .tg-mockup {
          background: #efe9e5; /* Telegram Web background tint */
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border);
          overflow: hidden;
          height: 520px;
          display: flex;
          flex-direction: column;
        }
        .tg-header {
          background: #ffffff;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .tg-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--primary-bg-gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: bold;
          font-size: 1.1rem;
        }
        .tg-info h4 {
          font-size: 1rem;
        }
        .tg-info p {
          font-size: 0.8rem;
          color: var(--success);
          font-weight: 500;
        }
        .tg-messages {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .msg-bubble {
          max-width: 75%;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          line-height: 1.5;
          position: relative;
          white-space: pre-line;
        }
        .msg-user {
          background: #fff;
          align-self: flex-end;
          border-bottom-right-radius: 2px;
          color: var(--text-main);
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .msg-bot {
          background: #ffffff;
          align-self: flex-start;
          border-bottom-left-radius: 2px;
          color: var(--text-main);
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          border-left: 3px solid var(--primary);
        }
        .msg-time {
          font-size: 0.7rem;
          color: var(--text-light);
          text-align: right;
          margin-top: 4px;
          display: block;
        }
        .tg-input-area {
          background: #ffffff;
          padding: 16px;
          border-top: 1px solid var(--border);
          display: flex;
          gap: 12px;
        }
        .tg-input {
          flex: 1;
          padding: 10px 16px;
          border-radius: 100px;
        }
        .tg-send-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--primary-bg-gradient);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
        }

        /* Features Section */
        .features-section {
          background: #ffffff;
          padding: 100px 5%;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .features-container {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 100px;
        }
        .feature-item {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }
        .feature-item:nth-child(even) {
          direction: rtl;
        }
        .feature-item:nth-child(even) .feature-text {
          direction: ltr;
        }
        .feature-text h3 {
          color: var(--primary);
          font-size: 1.1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }
        .feature-text h2 {
          font-size: 2.2rem;
          margin-bottom: 16px;
          line-height: 1.25;
        }
        .feature-text p {
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .feature-bullet {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 12px;
          font-size: 0.95rem;
          font-weight: 500;
        }
        .feature-bullet span {
          color: var(--primary);
          font-weight: bold;
        }
        .feature-media-placeholder {
          aspect-ratio: 4/3;
          background: linear-gradient(135deg, #fffcf5 0%, #fff2e0 100%);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }

        /* Testimonials */
        .testimonials {
          padding: 100px 5%;
          max-width: 1200px;
          margin: 0 auto;
        }
        .testi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .testi-card {
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 28px;
          box-shadow: var(--shadow-sm);
        }
        .testi-user {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .testi-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--primary-light);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: var(--primary);
        }
        .testi-info h4 {
          font-size: 0.95rem;
        }
        .testi-info p {
          font-size: 0.8rem;
          color: var(--text-light);
        }

        /* Pricing */
        .pricing {
          background-color: #ffffff;
          padding: 100px 5%;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .pricing-toggle {
          display: inline-flex;
          background: var(--background);
          padding: 6px;
          border-radius: 100px;
          border: 1px solid var(--border);
          margin-bottom: 50px;
        }
        .toggle-btn {
          padding: 8px 24px;
          border-radius: 100px;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .toggle-btn.active {
          background: var(--primary-bg-gradient);
          color: #ffffff;
        }
        .toggle-btn:not(.active) {
          background: transparent;
          color: var(--text-muted);
        }
        .pricing-cards {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 32px;
          max-width: 900px;
          margin: 0 auto;
        }
        .pricing-card {
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 48px 36px;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .pricing-card.premium {
          border-color: var(--primary);
          background-color: #ffffff;
          box-shadow: var(--shadow-lg);
        }
        .badge-populer {
          position: absolute;
          top: 20px;
          right: 20px;
          background: var(--primary-bg-gradient);
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 100px;
        }
        .pricing-card h3 {
          font-size: 1.5rem;
          margin-bottom: 10px;
        }
        .pricing-price {
          font-size: 2.2rem;
          font-weight: 800;
          margin: 16px 0;
          color: var(--text-main);
        }
        .pricing-price span {
          font-size: 1rem;
          font-weight: 500;
          color: var(--text-muted);
        }
        .pricing-features {
          list-style: none;
          margin: 32px 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
          flex: 1;
        }
        .pricing-features li {
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pricing-features li.disabled {
          color: var(--text-light);
          text-decoration: line-through;
        }

        /* FAQ */
        .faq {
          padding: 100px 5%;
          max-width: 800px;
          margin: 0 auto;
        }
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .faq-item {
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          overflow: hidden;
          transition: all var(--transition-normal);
        }
        .faq-question {
          width: 100%;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 700;
          font-size: 1.05rem;
          background: transparent;
          text-align: left;
          color: var(--text-main);
        }
        .faq-answer {
          padding: 0 24px 24px 24px;
          color: var(--text-muted);
          font-size: 0.95rem;
          line-height: 1.6;
        }

        /* Final CTA */
        .final-cta {
          margin: 60px 5%;
          background: var(--primary-bg-gradient);
          border-radius: var(--radius-xl);
          padding: 80px 24px;
          text-align: center;
          color: #ffffff;
          box-shadow: var(--shadow-lg);
        }
        .final-cta h2 {
          font-size: 2.8rem;
          margin-bottom: 16px;
        }
        .final-cta p {
          max-width: 600px;
          margin: 0 auto 32px auto;
          opacity: 0.9;
          font-size: 1.1rem;
        }

        /* Footer */
        .footer {
          background: #ffffff;
          border-top: 1px solid var(--border);
          padding: 80px 5% 40px 5%;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 48px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .footer-col h4 {
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 24px;
        }
        .footer-col ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .footer-col ul a {
          color: var(--text-muted);
          font-size: 0.95rem;
        }
        .footer-col ul a:hover {
          color: var(--primary);
        }
        .footer-bottom {
          border-top: 1px solid var(--border);
          padding-top: 32px;
          margin-top: 60px;
          text-align: center;
          font-size: 0.85rem;
          color: var(--text-light);
        }

        @media (max-width: 768px) {
          .navbar {
            padding: 16px 20px;
          }
          .nav-links {
            display: none;
          }
          .problem-cards {
            grid-template-columns: 1fr;
          }
          .simulator-grid {
            grid-template-columns: 1fr;
          }
          .feature-item {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .testi-grid {
            grid-template-columns: 1fr;
          }
          .pricing-cards {
            grid-template-columns: 1fr;
          }
          .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 32px;
          }
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo-text">
          <span>🏦</span> Mencatat Aja
        </div>
        <ul className="nav-links">
          <li><a href="#fitur">Fitur</a></li>
          <li><a href="#masalah">Masalah</a></li>
          <li><a href="#pricing">Harga</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
        <div className="nav-actions">
          <Link href="/auth?mode=login" className="btn btn-outline" style={{ padding: '8px 18px', fontSize: '0.9rem' }}>
            Masuk
          </Link>
          <Link href="/auth?mode=register" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.9rem' }}>
            Mulai Gratis
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="hero animate-slide-up">
        <div className="pre-headline">
          <span>✨</span> Catat keuangan langsung dari Telegram
        </div>
        <h1>
          Gaji habis sebelum akhir bulan?<br />
          <span className="text-gradient">Sudah saatnya kamu tahu ke mana uangmu pergi.</span>
        </h1>
        <p>
          Mencatat Aja mencatat setiap pengeluaranmu langsung dari chat Telegram atau foto struk — sisanya kami yang urus.
        </p>
        <div className="hero-actions">
          <Link href="/auth?mode=register" className="btn btn-primary btn-lg">
            Mulai Gratis Sekarang
          </Link>
          <a href="#demo" className="btn btn-outline btn-lg">
            Lihat cara kerjanya →
          </a>
        </div>
      </header>

      {/* HERO VIDEO SECTION */}
      <section className="video-wrapper">
        <div className="video-placeholder">
          {/* TODO: Ganti dengan video asli Mencatat Aja bot demo */}
          <span style={{ fontSize: '3rem' }}>🎥</span>
          <h3 style={{ color: 'var(--text-main)' }}>Video Demo Mencatat Aja Bot</h3>
          <p style={{ fontSize: '0.9rem', maxWidth: '350px' }}>Menunjukkan kemudahan kirim VN "beli kopi 15rb" dan update saldo instan di Web Dashboard.</p>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section id="masalah" className="problems-section">
        <div className="section-header">
          <h2>Banyak Orang Gagal Mengelola Uang Karena Prosesnya Ribet</h2>
          <p>Apakah kamu sering merasakan satu dari masalah klasik berikut?</p>
        </div>
        <div className="problem-cards">
          <div className="problem-card">
            <div className="problem-icon">⏳</div>
            <h3>"Buka aplikasi? Nanti dulu deh..."</h3>
            <p>Membuka aplikasi keuangan yang lambat dan memasukkan angka secara manual sangat melelahkan, membuat kita malas mencatat dan akhirnya lupa.</p>
          </div>
          <div className="problem-card">
            <div className="problem-icon">💸</div>
            <h3>"Kok uangnya habis ya?"</h3>
            <p>Pengeluaran kecil harian seperti parkir, boba, dan jajan sore tidak tercatat, membuat saldo rekening tiba-tiba menipis di akhir bulan.</p>
          </div>
          <div className="problem-card">
            <div className="problem-icon">📉</div>
            <h3>"Udah bikin budget, tapi lupa"</h3>
            <p>Mengatur anggaran belanja bulanan di kertas atau Excel tidak ada gunanya jika kita tidak memantaunya saat transaksi terjadi.</p>
          </div>
        </div>
      </section>

      {/* TRANSITION */}
      <section className="intro-banner">
        <h3>Introducing Mencatat Aja</h3>
        <h2>Bagaimana jika mencatat keuangan semudah mengirim pesan WhatsApp atau Telegram ke teman dekatmu?</h2>
      </section>

      {/* INTERACTIVE DEMO (SIMULATOR) */}
      <section id="demo" className="simulator-section">
        <div className="section-header">
          <h2>Coba Ketik Transaksi di Bot Simulasi Kami</h2>
          <p>Ketik kalimat bebas seperti "beli bakso 15rb" atau "gajian 5jt" di bawah ini untuk melihat keajaiban parsing AI kami.</p>
        </div>
        <div className="simulator-grid">
          <div className="tg-mockup">
            <div className="tg-header">
              <div className="tg-avatar">TD</div>
              <div className="tg-info">
                <h4>Mencatat Aja Bot</h4>
                <p>🟢 online</p>
              </div>
            </div>
            <div className="tg-messages">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`msg-bubble ${msg.sender === 'user' ? 'msg-user' : 'msg-bot'}`}>
                  <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                  <span className="msg-time">{msg.time}</span>
                </div>
              ))}
              {isTyping && (
                <div className="msg-bubble msg-bot" style={{ padding: '8px 12px' }}>
                  <i>Mencatat Aja sedang mengetik...</i>
                </div>
              )}
            </div>
            <form onSubmit={handleSimulateChat} className="tg-input-area">
              <input
                type="text"
                placeholder="Ketik di sini (cth: beli nasi goreng 25rb)..."
                className="tg-input"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />
              <button type="submit" className="tg-send-btn">✈️</button>
            </form>
          </div>
          
          <div className="simulator-explanation" style={{ textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Teknologi AI Parser Canggih</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.7' }}>
              Mencatat Aja menggunakan Large Language Model (LLM) tercanggih untuk memahami bahasa percakapan sehari-hari orang Indonesia. Tidak ada batasan format regex yang kaku.<br /><br />
              Setiap kali Anda mengirim pesan, AI otomatis memecah kalimat menjadi nominal rupiah yang tepat, mencocokkan kategori transaksi, memotong saldo dompet default, dan memvalidasi anggaran bulanan secara instan.
            </p>
            <Link href="/auth?mode=register" className="btn btn-primary">
              Coba Dengan Akun Telegram Asli
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION (3 FITUR ALTERNATING) */}
      <section id="fitur" className="features-section">
        <div className="features-container">
          {/* Fitur 1 */}
          <div className="feature-item">
            <div className="feature-text">
              <h3>Fitur Inti</h3>
              <h2>Pencatatan Cepat via Telegram (Teks, Suara & Foto Struk)</h2>
              <p>
                Cukup buka Telegram, ketik transaksi Anda, kirim rekaman suara (voice note) saat menyetir, atau foto struk belanjaan Anda setelah keluar dari supermarket.
              </p>
              <div className="feature-bullet"><span>✓</span> Parsing nominal format lokal ("15rb", "1.5jt", "500k")</div>
              <div className="feature-bullet"><span>✓</span> Transkripsi suara bahasa Indonesia (maksimal 60 detik)</div>
              <div className="feature-bullet"><span>✓</span> AI Vision scan detail barang belanjaan di struk fisik (khusus Pro)</div>
            </div>
            <div className="feature-media-placeholder">
              {/* Mockup visual chat telegram */}
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <span style={{ fontSize: '3rem' }}>📱</span>
                <p style={{ fontWeight: 'bold', marginTop: '10px' }}>Kirim Foto Struk &gt; AI OCR Membaca &gt; Terdaftar Otomatis</p>
              </div>
            </div>
          </div>

          {/* Fitur 2 */}
          <div className="feature-item">
            <div className="feature-text">
              <h3>Visual Dashboard</h3>
              <h2>Laporan Visual & Ekspor Dokumen Secara Instan</h2>
              <p>
                Lihat laporan arus kas (cashflow) bersih, pie chart pengeluaran per kategori, dan grafik perbandingan bulanan yang cantik di Dashboard Mencatat Aja. Ekspor ke Excel (.xlsx) dan PDF dalam satu ketukan.
              </p>
              <div className="feature-bullet"><span>✓</span> Filter transaksi dinamis per tanggal, dompet, dan kategori</div>
              <div className="feature-bullet"><span>✓</span> Riwayat ekspor tersimpan aman di signed URL Supabase Storage</div>
              <div className="feature-bullet"><span>✓</span> Transaksi terdekomposisi otomatis jika belanja banyak barang sekaligus</div>
            </div>
            <div className="feature-media-placeholder">
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <span style={{ fontSize: '3rem' }}>📊</span>
                <p style={{ fontWeight: 'bold', marginTop: '10px' }}>Dashboard Overview & Ekspor PDF / Excel</p>
              </div>
            </div>
          </div>

          {/* Fitur 3 */}
          <div className="feature-item">
            <div className="feature-text">
              <h3>Kecerdasan Buatan</h3>
              <h2>AI Financial Advisor yang Menjagamu Tetap Hemat</h2>
              <p>
                Asisten keuangan AI aktif 24/7 di akun Telegram Anda. Dapatkan saran dan rekomendasi praktis ketika kondisi keuangan Anda mulai tidak aman.
              </p>
              <div className="feature-bullet"><span>✓</span> Trigger otomatis jika pengeluaran melompat &gt;50% dari minggu lalu</div>
              <div className="feature-bullet"><span>✓</span> Peringatan jika total belanja melebihi 80% pemasukan bulanan</div>
              <div className="feature-bullet"><span>✓</span> Tips keuangan personal yang disesuaikan dengan profil unik Anda</div>
            </div>
            <div className="feature-media-placeholder">
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <span style={{ fontSize: '3rem' }}>🤖</span>
                <p style={{ fontWeight: 'bold', marginTop: '10px' }}>Rekomendasi Hemat Otomatis dari AI Advisor</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS (MASONRY GRID PLACEHOLDER) */}
      <section className="testimonials">
        <div className="section-header">
          <h2>Apa Kata Pengguna Kami?</h2>
          <p>Cerita sukses mereka yang berhasil keluar dari jeratan "gaji numpang lewat" berkat pencatatan disiplin Mencatat Aja.</p>
        </div>
        <div className="testi-grid">
          {/* TODO: Ganti dengan testimoni dari user asli setelah beta testing */}
          <div className="testi-card">
            <div className="testi-user">
              <div className="testi-avatar">R</div>
              <div className="testi-info">
                <h4>Rizky Amalia</h4>
                <p>Freelancer Desain Grafis</p>
              </div>
            </div>
            <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              "Biasanya mencatat keuangan di spreadsheet itu bertahan paling lama 3 hari lalu malas. Sejak pakai Mencatat Aja, saya tinggal ketik chat di bot pas lagi bayar kopi, langsung ter-update. Saldo tabungan saya naik 25% bulan ini!"
            </p>
          </div>
          <div className="testi-card">
            <div className="testi-user">
              <div className="testi-avatar">A</div>
              <div className="testi-info">
                <h4>Aditya Wibowo</h4>
                <p>Software Engineer, 26 tahun</p>
              </div>
            </div>
            <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              "Fitur foto struk belanjanya gila sih. Belanja bulanan di supermarket yang isinya puluhan item, langsung di-parse sama AI jadi baris transaksi detail dengan kategori masing-masing. Dashboard-nya juga modern banget."
            </p>
          </div>
          <div className="testi-card">
            <div className="testi-user">
              <div className="testi-avatar">M</div>
              <div className="testi-info">
                <h4>Maya Kartika</h4>
                <p>Mahasiswi Akuntansi</p>
              </div>
            </div>
            <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              "Dulu uang bulanan habis di minggu kedua. Sekarang ada AI Advisor yang galak di Telegram ingetin kalau jajan Makanan naik 50% dibanding minggu lalu. Rekomendasi hematnya sangat praktis."
            </p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="pricing">
        <div className="section-header">
          <h2>Pilih Paket Hematmu</h2>
          <p>Paket langganan super terjangkau demi masa depan keuangan yang lebih terkontrol.</p>
          <div className="pricing-toggle" style={{ marginTop: '24px' }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setBillingCycle('once')}
              className={`toggle-btn ${billingCycle === 'once' ? 'active' : ''}`}
            >
              Sekali Bayar (Pro)
            </button>
          </div>
        </div>

        <div className="pricing-cards">
          {/* Starter Plan */}
          <div className="pricing-card">
            <h3>Starter</h3>
            <p style={{ color: 'var(--text-light)' }}>Bagi pemula yang ingin belajar mencatat rutin</p>
            <div className="pricing-price">
              Rp 49.000 <span>/ bulan</span>
            </div>
            <Link href="/auth?mode=register" className="btn btn-outline" style={{ width: '100%' }}>
              Mulai Uji Coba Gratis
            </Link>
            <ul className="pricing-features">
              <li><span>✓</span> Catat transaksi via teks Telegram</li>
              <li><span>✓</span> Dashboard web dasar</li>
              <li><span>✓</span> Maksimal 3 dompet aktif</li>
              <li><span>✓</span> Maksimal 5 kategori anggaran</li>
              <li><span>✓</span> Maksimal 50 transaksi / bulan</li>
              <li className="disabled"><span>✗</span> Input via foto struk (OCR AI)</li>
              <li className="disabled"><span>✗</span> AI Financial Advisor</li>
              <li className="disabled"><span>✗</span> Ekspor laporan ke PDF / Excel</li>
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="pricing-card premium">
            <div className="badge-populer">TERPOPULER</div>
            <h3>Pro</h3>
            <p style={{ color: 'var(--primary)' }}>Akses tanpa batas dan cerdas asisten keuangan AI</p>
            <div className="pricing-price">
              {billingCycle === 'once' ? 'Rp 99.000' : 'Rp 9.900'} <span>{billingCycle === 'once' ? 'Sekali Bayar' : '/ bulan'}</span>
            </div>
            <Link href="/auth?mode=register" className="btn btn-primary" style={{ width: '100%' }}>
              Beli Paket Pro Sekarang
            </Link>
            <ul className="pricing-features">
              <li><span>✓</span> Semua fitur paket Starter</li>
              <li><span>✓</span> <b>Unlimited</b> transaksi per bulan</li>
              <li><span>✓</span> <b>Unlimited</b> dompet & kategori</li>
              <li><span>✓</span> <b>Input via foto struk</b> (AI OCR)</li>
              <li><span>✓</span> <b>AI Financial Advisor</b> aktif 24/7</li>
              <li><span>✓</span> Ekspor laporan <b>PDF & Excel</b></li>
              <li><span>✓</span> Custom waktu pengingat harian</li>
              <li><span>✓</span> Dukungan prioritas 24 jam</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="faq">
        <div className="section-header">
          <h2>Pertanyaan yang Sering Diajukan</h2>
          <p>Ada pertanyaan? Kami siap membantu menjawab keraguan Anda.</p>
        </div>
        <div className="faq-list">
          {faqs.map((f, i) => (
            <div key={i} className="faq-item">
              <button
                className="faq-question"
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
              >
                <span>{f.q}</span>
                <span>{activeFaq === i ? '▲' : '▼'}</span>
              </button>
              {activeFaq === i && (
                <div className="faq-answer" dangerouslySetInnerHTML={{ __html: f.a }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <h2>Mulai Kendalikan Keuanganmu Hari Ini</h2>
        <p>Bergabunglah bersama ribuan orang yang telah sukses mengatur cashflow harian mereka langsung dari genggaman tangan di Telegram.</p>
        <Link href="/auth?mode=register" className="btn btn-primary btn-lg" style={{ background: '#ffffff', color: 'var(--primary)', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>
          Daftar Mencatat Aja Sekarang (Gratis)
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-col" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '1.4rem' }}>🏦 Mencatat Aja</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Mencatat Aja adalah aplikasi manajemen keuangan pribadi modern yang terintegrasi dengan Telegram Bot.
            </p>
            <p style={{ fontSize: '1.2rem', display: 'flex', gap: '12px' }}>
              <span>🌐</span> <span>🐦</span> <span>📸</span>
            </p>
          </div>
          <div className="footer-col">
            <h4>Produk</h4>
            <ul>
              <li><a href="#fitur">Fitur Bot</a></li>
              <li><a href="#demo">Simulasi AI</a></li>
              <li><a href="#pricing">Harga Paket</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Perusahaan</h4>
            <ul>
              <li><a href="#">Tentang Kami</a></li>
              <li><a href="#">Blog Finansial</a></li>
              <li><a href="#">Hubungi Kami</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Kebijakan Privasi</a></li>
              <li><a href="#">Syarat & Ketentuan</a></li>
              <li><a href="#">Panduan Keamanan</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; {new Date().getFullYear()} Mencatat Aja Indonesia. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
