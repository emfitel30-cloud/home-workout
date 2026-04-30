# HomeFit Tracker

Project sudah direfactor dari HTML satu file menjadi struktur Vite modular dan siap deploy ke Vercel.

## Jalankan lokal

```bash
npm install
copy .env.example .env
npm run dev
```

Isi `.env` memakai config Firebase kamu.

## Deploy Vercel

Tambahkan environment variable:

```txt
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```
