import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mencatat Aja — Catat Keuangan Semudah Chat Telegram',
  description: 'Mencatat Aja adalah aplikasi manajemen keuangan pribadi premium terintegrasi dengan Telegram Bot. Catat pengeluaran & pemasukan otomatis menggunakan AI.',
  keywords: 'catat keuangan, telegram bot, manajemen keuangan, ocr struk, financial advisor, ai, fintech',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg' }
    ],
    shortcut: '/icon.svg',
    apple: '/apple-icon.png',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
