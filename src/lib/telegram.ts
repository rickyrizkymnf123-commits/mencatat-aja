import { formatInTimeZone } from 'date-fns-tz';
import { id } from 'date-fns/locale';

const TIMEZONE = 'Asia/Jakarta';

/**
 * Calls Telegram getMe to test bot token validity.
 */
export async function testTelegramToken(botToken: string): Promise<{ ok: boolean; botInfo?: any; description?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await res.json();
    if (data.ok) {
      return { ok: true, botInfo: data.result };
    }
    return { ok: false, description: data.description || 'Token tidak valid' };
  } catch (err: any) {
    return { ok: false, description: err.message || 'Gagal terhubung ke Telegram API' };
  }
}

/**
 * Calls Telegram setWebhook to connect the bot to this application's webhook endpoint.
 */
export async function setTelegramWebhook(botToken: string, webhookBaseUrl: string): Promise<{ ok: boolean; description?: string }> {
  try {
    const webhookUrl = `${webhookBaseUrl.replace(/\/$/, '')}/api/telegram/webhook`;
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        drop_pending_updates: false,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      return { ok: true };
    }
    return { ok: false, description: data.description || 'Gagal menyetel webhook' };
  } catch (err: any) {
    return { ok: false, description: err.message || 'Network error saat setWebhook' };
  }
}

/**
 * Send text message to Telegram chat
 */
export async function sendTelegramMessage(botToken: string, chatId: number | string, text: string, parseMode: 'Markdown' | 'HTML' = 'Markdown') {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('Error sending Telegram message:', err);
    return null;
  }
}

export async function sendMessage(token: string, chatId: number | string, text: string, replyMarkup?: any): Promise<boolean> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      }),
    });
    if (!response.ok) {
      console.error(`Telegram sendMessage failed: ${response.statusText}`, await response.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error sending message:', err);
    return false;
  }
}

export async function getFile(token: string, fileId: string): Promise<string> {
  const url = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Telegram getFile failed: ${response.statusText}`);
  }
  const data = await response.json();
  if (!data.ok || !data.result.file_path) {
    throw new Error('Telegram getFile returned invalid output');
  }
  return data.result.file_path;
}

export async function downloadFile(token: string, filePath: string): Promise<Buffer> {
  const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Telegram downloadFile failed: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Format currency to IDR string
 */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generates a visual progress bar (e.g. █ █ █ ░ ░ ░ ░ ░ ░ ░ 30%)
 */
export function generateProgressBar(percent: number, length = 10): string {
  const capped = Math.min(Math.max(percent, 0), 100);
  const filledCount = Math.round((capped / 100) * length);
  const emptyCount = length - filledCount;
  return '█'.repeat(filledCount) + '░'.repeat(emptyCount);
}

/**
 * Format WIB Timestamp (e.g. "Rabu, 30 September 2026 — 21:45 WIB")
 */
export function formatWIBDateTime(date: Date = new Date()): string {
  const dayDate = formatInTimeZone(date, TIMEZONE, 'EEEE, d MMMM yyyy', { locale: id });
  const time = formatInTimeZone(date, TIMEZONE, 'HH:mm', { locale: id });
  return `📅 ${dayDate} — ${time} WIB`;
}

/**
 * Standard format reply for recorded expense
 */
export function formatExpenseReply(data: {
  amount: number;
  categoryName: string;
  categoryEmoji: string;
  walletName: string;
  notes: string;
  walletBalanceAfter: number;
  monthlyBudget: number;
  budgetUsedMonth: number;
  date?: Date;
}): string {
  const dateStr = formatWIBDateTime(data.date);
  const percentUsed = data.monthlyBudget > 0 ? Math.round((data.budgetUsedMonth / data.monthlyBudget) * 100) : 0;
  const sisaBudget = Math.max(data.monthlyBudget - data.budgetUsedMonth, 0);

  let budgetSection = '';
  if (data.monthlyBudget > 0) {
    const pBar = generateProgressBar(percentUsed);
    let motivation = '';
    if (percentUsed >= 100) {
      motivation = '⚠️ *Budget kategori ini sudah habis!* Harap hemat ya.';
    } else if (percentUsed >= 80) {
      motivation = '⚠️ *Budget hampir habis (sudah >80%)!*';
    } else {
      motivation = '👍 Pengeluaran masih aman terendali.';
    }

    budgetSection = `

📊 *Budget ${data.categoryEmoji} ${data.categoryName} bulan ini:*
[${pBar}] ${percentUsed}% — sisa ${formatIDR(sisaBudget)}
${motivation}`;
  }

  return `${dateStr}
💸 *Pengeluaran tercatat!*
├ Nominal : ${formatIDR(data.amount)}
├ Kategori : ${data.categoryEmoji} ${data.categoryName}
├ Dompet : 👛 ${data.walletName}
├ Catatan : ${data.notes}
└ Saldo : ${formatIDR(data.walletBalanceAfter)}${budgetSection}`;
}

/**
 * Standard format reply for recorded income
 */
export function formatIncomeReply(data: {
  amount: number;
  walletName: string;
  walletBalanceAfter: number;
  date?: Date;
}): string {
  const dateStr = formatWIBDateTime(data.date);

  return `${dateStr}
💰 *Pemasukan tercatat!*
├ Nominal : ${formatIDR(data.amount)}
├ Kategori : 💼 Pemasukan
├ Dompet : 👛 ${data.walletName}
└ Saldo baru : ${formatIDR(data.walletBalanceAfter)}

💪 *Semangat terus!* Jangan lupa sisihkan untuk tabungan ya.`;
}

/**
 * Format limit reached message for Starter users
 */
export function formatLimitReachedMessage(currentCount: number): string {
  return `⚠️ *Batas Transaksi Bulanan Tercapai!*

Kamu sudah mencatat ${currentCount}/50 transaksi bulan ini (Paket Starter).
Untuk mencatat transaksi tanpa batas + akses foto struk & Google Sheets:

✨ *Upgrade ke Paket Pro (Rp99.000/bulan)*
Kunjungi dashboard web mencatat.id untuk upgrade!`;
}

/**
 * Format photo receipt restriction message for Starter users
 */
export function formatPhotoReceiptStarterMessage(): string {
  return `🔒 *Fitur Foto Struk Khusus Paket Pro*

Input transaksi via foto struk (OCR AI) tersedia khusus untuk pengguna *Paket Pro*.

✨ *Keunggulan Pro:*
• Scan foto struk otomatis split item
• Transaksi & wallet unlimited
• Auto-sync Google Sheet pribadi
• AI Financial Advisor

Upgrade akun kamu sekarang di dashboard web mencatat.id!`;
}
