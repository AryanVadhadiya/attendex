# Attendance Management System

A production-quality MERN attendance management application for students. Features strict calendar-accurate attendance tracking, elegant design, and comprehensive analytics.

## Tech Stack
- **Frontend**: React, TailwindCSS, Framer Motion, Vite
- **Backend**: Node.js, Express, MongoDB
- **Tools**: Docker, ESLint, Prettier

## Setup

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)
- Docker (optional)

### Installation
1. Backend
   ```bash
   cd attendance-app/backend
   npm install
   npm run dev
   ```
2. Frontend
   ```bash
   cd attendance-app/frontend
   npm install
   npm run dev
   ```

### Docker
```bash
docker-compose up --build
```

## Functional Highlights
- **Calendar-Accurate**: Generates real occurrences for every session.
- **De-duplication**: Intelligent presence calculation (Manual + Granted + Auto).
- **Apple-level UI**: Glassmorphism, smooth animations.
