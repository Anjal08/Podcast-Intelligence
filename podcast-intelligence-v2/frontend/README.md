# 🖥️ Podcast Intelligence Frontend (Next.js 14)

[![Next.js 14](https://img.shields.io/badge/Next.js%2014-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 18](https://img.shields.io/badge/React%2018-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

A modern, high-performance client interface for the **Podcast Intelligence Platform**. Engineered with a premium **glassmorphic design system**, smooth micro-animations, and fully responsive layouts.

---

## 🎨 Key Frontend Features (What Recruiters Look For)

*   **Next.js 14 App Router Architecture**: Uses clean file-based routing and separates server-rendered wrappers from interactive client-side sub-components (`"use client"`).
*   **State Machine File Uploader**: A robust drag-and-drop file uploader supporting upload states (`idle`, `dragging`, `uploading`, `processing`, `done`, `error`) with validation logic for file formats (MP3, MP4, WAV, M4A, etc.) and size limits (500MB).
*   **Dynamic Polling & Progress Tracker**: Implements a reliable interval-polling system for processing audio jobs. Provides real-time phase updates (`Transcribing audio with Whisper`, `Segmenting chapters`, `Running sentiment analysis`) to keep the user engaged.
*   **Interactive Video Analytics View**: Features visual timeline segments with distinct emotional sentiments (positive, neutral, negative) and color-coded layouts. It also allows direct MP3 downloads and native chapter jumping.
*   **Contextual Chat Engine (RAG Interface)**: Provides a chat layout loaded with suggested starter prompts, automatic scroll-to-bottom mechanics via React `useRef`, and persistent message lists tied to specific podcast IDs.
*   **Complete Type Safety**: Built fully on **TypeScript**, defining exact interface contracts for Podcasts, Semantic Chapters, and Conversation states to eliminate runtime errors.

---

## 🚀 Getting Started

### 📦 Installation
From the `frontend` directory:
```bash
# Install dependencies
npm install
```

### ⚙️ Environment Configuration
Create a `.env.local` file:
```bash
cp .env.example .env.local
```
Fill in the location of your backend API:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 💻 Running Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the client.

---

## 🛠️ Core Components & Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS with custom glassmorphism effects (`globals.css`)
- **Iconography**: Lucide React for consistent vector design
- **State Management**: React Hooks (`useState`, `useCallback`, `useRef`, `useEffect`)
- **API Fetching**: Native asynchronous Fetch API with error boundary catching
