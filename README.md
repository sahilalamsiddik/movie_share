# CinemaShare - Self-Hosted Media Server

CinemaShare is a lightweight, self-hosted media server application built with **Node.js + Express** on the backend and **React (Vite) + Tailwind CSS** on the frontend. It is designed to run locally on your PC, scan a media folder, and dynamically expose it to the internet using tunneling services (Cloudflare Tunnel or Localtunnel).

---

## 🚀 Key Features

*   **Real-time Folder Watcher:** Scans your directories recursively and updates the library dynamically.
*   **Smooth Video Streaming:** HTML5 video player with range request support for fast seeking.
*   **Playback Resume:** Saves watching history ("Continue Watching") and resume positions.
*   **On-the-Fly ZIP Download:** Download entire folders as zip archives streamed on-the-fly.
*   **Automatic Tunneling:** Programmatically starts Localtunnel or Cloudflare Tunnel on boot.
*   **Access Security:** Custom admin authentication, read-only guest mode, rate limiting, and IP filtering.

---

## 🚦 Getting Started

1. Install dependencies:
   ```bash
   npm run install-all
   ```
2. Start backend server:
   ```bash
   npm run dev-backend
   ```
3. Start frontend dev server:
   ```bash
   npm run dev-frontend
   ```
