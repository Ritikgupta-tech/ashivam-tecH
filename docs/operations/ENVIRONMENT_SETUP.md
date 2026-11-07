# Ashivam Technologies — Local Development & Environment Setup Guide

> **Document Version:** 1.0.0  
> **Classification:** Engineering Onboarding Guide  
> **Target Audience:** All Full-Stack, Backend, Frontend, and QA Engineers  

---

## 1. Prerequisites & System Requirements

Before configuring the Ashivam Technologies local development environment, verify that your workstation satisfies the following software prerequisites:

- **Node.js:** `v20.x LTS` (Active LTS minimum: `v18.18.0`)
- **Package Manager:** `npm v10.x` or higher
- **Git:** `v2.40+`
- **Database:** Local MongoDB `v7.0` (with replica set enabled) OR access to the development MongoDB Atlas cluster.
- **Operating System:** macOS, Linux, or Windows 10/11 (PowerShell or WSL2 recommended).

---

## 2. Repository Setup & Branching Standard

```bash
# 1. Clone the repository
git clone https://github.com/Ritikgupta-tech/ashivam-tecH.git
cd ashivam-tecH

# 2. Verify git remotes
git remote -v
# origin   https://github.com/Ritikgupta-tech/ashivam-tecH.git (fetch & push)
# company  https://github.com/AshivamTechnologies/Official-Websites.git (fetch & push)

# 3. Create or checkout dedicated feature branch
git checkout -b feature/ashivam-production-hardening
```

---

## 3. Frontend Installation & Configuration

```bash
# 1. From workspace root, install dependencies
npm install

# 2. Configure frontend environment variables
cp .env.example .env
```

### Frontend Environment Variables (`.env`)
```ini
# Production API Gateway URL (or http://localhost:5000/api/v1 for local backend)
VITE_API_URL=https://ashivam-tech.onrender.com/api/v1

# Node Environment
NODE_ENV=development
```

### Starting Frontend Dev Server
```bash
npm run dev
# Frontend dev server starts at http://localhost:5173
```

---

## 4. Backend Installation & Configuration

```bash
# 1. Navigate to backend directory and install dependencies
cd backend
npm install

# 2. Configure backend environment variables
cp .env.example .env
```

### Backend Environment Variables (`backend/.env`)
```ini
# Port & Runtime
PORT=5000
NODE_ENV=development

# Database Connection (MongoDB Atlas or Local Replica Set)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.ashivam.mongodb.net/ashivam_dev?retryWrites=true&w=majority

# JWT Authentication Secrets (Must be 64-char hex or high entropy string)
JWT_SECRET=your_jwt_secret_min_32_chars_long
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_64_chars_hex

# CORS Configuration
FRONTEND_URL=http://localhost:5173

# Email Delivery Configuration (Mailjet / SMTP)
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key
ALERT_EMAIL=team.ashivam@gmail.com
```

### Starting Backend Dev Server
```bash
npm run dev
# Express API server starts at http://localhost:5000/api/v1
```

---

## 5. Verification Commands

Run the full local verification suite to ensure workstation readiness:

```bash
# Frontend Unit & Accessibility Tests (107 tests)
npm test -- --run

# Production Build Verification
npm run build

# Backend Unit, Security & Email Tests (from backend/ directory)
cd backend
npm run test:unit
npm run test:security
npm run test:email
```
