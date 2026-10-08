# GEMINI.md - mencatat.id User Preferences & System Notes

## Guidelines
- UI/UX Premium Fintech: Modern, clean, $1B Dollar Dark Mode (`#040711`), Emerald Green (`#10b981`), Glassmorphism, high contrast text.
- Full end-to-end functionality (bukan mock, bukan prototype).
- Superadmin Utama: `rickyrizkymnf123@gmail.com` dan `rickyizkymnf123@gmail.com` / `Ds2026` (Auto-approved, role: `admin` / `superadmin`).
- Form Inputs: Selalu sertakan tombol ikon mata (Eye/EyeOff toggle) pada field password untuk mencegah typo.
- Alur ACC Admin: User baru berstatus `pending` dan wajib di-ACC oleh Admin via `/admin` sebelum bisa mengakses dashboard.
- Endpoint Login Server-Side: Menggunakan `/api/auth/login` untuk penanganan kredensial & auto-recovery Superadmin yang andal.
- Idempotent Telegram Webhook endpoint.
- Structured LLM output for natural language expense parsing (Handling Rp, rb, jt, k, dll).
- Automatic Google Sheets provisioning per user upon registration.
- Plan tiers (Starter Rp49k/mo vs Pro Rp99k/mo) strictly enforced.
- WIB (Asia/Jakarta) timezone formatting across bot and web app.
