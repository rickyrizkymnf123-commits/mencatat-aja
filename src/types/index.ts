export type UserPlan = 'starter' | 'pro';
export type UserRole = 'user' | 'admin';
export type AccountStatus = 'pending' | 'approved' | 'rejected';
export type TelegramStatus = 'disconnected' | 'testing' | 'connected';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionSource = 'web' | 'telegram_text' | 'telegram_receipt';
export type PaymentStatus = 'pending' | 'settlement' | 'approved' | 'rejected' | 'failed' | 'expire';

export interface UserProfile {
  id: string;
  email: string;
  phone_number: string | null;
  phone_verified: boolean;
  full_name: string;
  avatar_url?: string | null;
  plan: UserPlan;
  role: UserRole;
  account_status: AccountStatus;
  telegram_bot_token?: string | null;
  telegram_chat_id?: number | null;
  telegram_username?: string | null;
  telegram_connection_status: TelegramStatus;
  google_sheet_id?: string | null;
  google_sheet_url?: string | null;
  default_wallet_id?: string | null;
  default_currency: string;
  reminder_enabled: boolean;
  reminder_frequency: number;
  reminder_times: string[];
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  is_default: boolean;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color: string;
  type: TransactionType;
  monthly_budget: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  to_wallet_id?: string | null;
  category_id?: string | null;
  type: TransactionType;
  amount: number;
  notes?: string | null;
  transaction_date: string;
  source: TransactionSource;
  receipt_url?: string | null;
  created_at: string;
  wallet?: Wallet;
  to_wallet?: Wallet;
  category?: Category;
}

export interface AIProviderConfig {
  id: string;
  name: 'gemini' | 'openai' | 'deepseek';
  api_key_encrypted: string;
  is_active: boolean;
  priority: number;
  mode: 'single' | 'failover';
  created_at: string;
}

export interface AILog {
  id: string;
  user_id?: string | null;
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
  status: 'success' | 'error';
  error_message?: string | null;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  order_id: string;
  gross_amount: number;
  plan: UserPlan;
  payment_type: 'midtrans' | 'manual_transfer';
  status: PaymentStatus;
  proof_image_url?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  profile?: UserProfile;
}

export interface ParsedTransaction {
  jenis: 'pemasukan' | 'pengeluaran' | 'transfer';
  nominal: number;
  kategori: string;
  catatan: string;
  target_wallet?: string;
  items?: {
    nama: string;
    harga: number;
    kategori: string;
  }[];
}
