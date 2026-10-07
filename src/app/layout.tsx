import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'mencatat.id — Catat Keuangan Semudah Chat Telegram',
  description: 'Aplikasi manajemen keuangan pribadi terintegrasi Telegram Bot dan Google Sheet pribadi. Otomatis catat pengeluaran & pemasukan dengan AI.',
  keywords: ['mencatat.id', 'keuangan telegram bot', 'catat keuangan', 'google sheet keuangan', 'fintech indonesia', 'ai financial advisor'],
  authors: [{ name: 'mencatat.id Team' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="min-h-screen bg-[#040711] text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
