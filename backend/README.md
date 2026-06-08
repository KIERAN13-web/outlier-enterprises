# Backend (Node.js + Express + Firebase)

This backend provides:
- Firebase ID-token verification middleware
- Paid gating for dashboard
- Payment endpoints (M-Pesa) - placeholders
- Outlier “book” endpoints - placeholders

## Prerequisites
- Node.js 18+
- A Firebase project with Admin SDK credentials
- A Firebase config for client (front-end)
- M-Pesa credentials (placeholder)

## Environment variables
See `.env.example`.

## Run (dev)
```bash
cd backend
npm install
npm run dev
```

Server default: `http://localhost:4000` (configurable).

