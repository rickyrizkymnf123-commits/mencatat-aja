import type { Metadata, Viewport } from 'next';
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#04060d',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
                  document.addEventListener('gesturechange', function(e) { e.preventDefault(); }, { passive: false });
                  document.addEventListener('gestureend', function(e) { e.preventDefault(); }, { passive: false });
                  document.addEventListener('touchmove', function(e) {
                    if (e.touches && e.touches.length > 1) {
                      e.preventDefault();
                    }
                  }, { passive: false });
                }
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
