# Gemini AI Configuration Notes - TataDana

## Integrasi Model AI
1. **Gemini 2.5 Flash:** Diprioritaskan sebagai model default untuk parsing kalimat natural bahasa Indonesia, transkripsi voice note, dan OCR Vision foto struk karena kecepatannya dan dukungannya terhadap format JSON secara native.
2. **OpenAI GPT-4o-mini & Whisper:** Digunakan sebagai provider alternatif / failover jika Gemini mengalami kendala kuota atau jaringan.
3. **DeepSeek Chat:** Digunakan sebagai model alternatif untuk parsing teks natural.

## Panduan Coding & Pola Codebase
- **Next.js Serverless API routes:** Selalu tangani asinkronisasi dengan benar. Hindari `setTimeout` di route handler tanpa `await` karena dapat diputus container serverless. Gunakan helper `await new Promise(resolve => setTimeout(resolve, ms))`.
- **Blob/Uint8Array Conversions:** Node.js `Buffer` tidak bisa langsung dijadikan parameter `File` constructor di browser/standard JS environment. Ubah menjadi `Uint8Array` sebelum dimasukkan ke constructor `Blob`/`File`.
- **Escape JSX Special Characters:** Hindari meletakkan karakter seperti `>` atau `<` secara literal di JSX. Gunakan `&gt;` atau `&lt;` untuk mencegah kegagalan Turbopack compile.
- **Pure CSS/Vanilla CSS Variables:** Gunakan HSL modern untuk tema orange-putih agar fleksibel dan responsif.
