# Ashivam Technologies Project Documentation

## 1. Project Overview

Ye project Ashivam Technologies ki website aur backend platform hai. Isme mainly teen parts hain:

1. React frontend website
2. Node.js/Express backend API
3. Standalone legacy portal HTML

Main frontend ek single-page company website hai jisme services, projects, team, careers aur contact sections hain.

## 2. Project Structure

```text
Official-Website/
├── src/                  # React frontend source code
├── public/               # Public assets
├── backend/              # Express + MongoDB backend
├── index.html            # Main frontend HTML entry
├── ashivam-portal.html   # Standalone old portal
├── package.json          # Frontend dependencies/scripts
├── vite.config.js        # Vite configuration
├── netlify.toml          # Netlify deployment config
├── vercel.json           # Vercel deployment config
└── README.md
```

## 3. Technology Stack

### Frontend

- React 18
- Vite
- JavaScript
- CSS
- React Hooks
- Intersection Observer API
- Responsive design
- Inter, Space Grotesk and JetBrains Mono fonts

### Backend

- Node.js
- Express 5
- MongoDB
- Mongoose
- JWT authentication
- bcryptjs password hashing
- Multer file uploads
- Nodemailer email service
- Helmet security headers
- CORS
- Rate limiting

## 4. Frontend Setup

Project root me commands run karein:

```bash
cd /Users/shushantkumar/Desktop/Divya/Official-Website
npm install
npm run dev
```

Frontend normally yahan available hoga:

```text
http://localhost:5173
```

Production build:

```bash
npm run build
npm run preview
```

## 5. Frontend Entry Flow

```text
index.html
   ↓
src/main.jsx
   ↓
src/App.jsx
   ↓
Navbar
Hero
About
Stats
Services
Solutions
TechStack
Projects
WhyAshivam
Team
Careers
Culture
CTA
Contact
Footer
```

Important files:

- `index.html`: Browser ka root HTML page
- `src/main.jsx`: React application mount karta hai
- `src/App.jsx`: Saare major sections ko render karta hai

## 6. React Components

Components `src/components/` ke andar organized hain:

```text
src/components/
├── Navbar/
├── Hero/
├── About/
├── Stats/
├── Services/
├── Solutions/
├── TechStack/
├── Projects/
├── WhyAshivam/
├── Team/
├── Careers/
├── Culture/
├── CTA/
├── Contact/
├── Footer/
└── ui/
```

Har section ka JSX aur CSS normally uske apne folder me hai. Example:

```text
src/components/Projects/Projects.jsx
src/components/Projects/Projects.css
```

## 7. Centralized Content

Website ka main content `src/data/content.js` me stored hai.

Is file me ye data available hai:

- Company details
- Statistics
- Services
- Solutions
- Technology stack
- Projects
- Why Ashivam points
- Team members
- Careers
- Company culture
- Navigation links

Company information ya project details update karne ke liye sabse pehle ye file edit karein:

```text
src/data/content.js
```

## 8. Website Sections

### Navbar

Navigation links `NAV_LINKS` data se aate hain. Ye page ke sections ke IDs par scroll karte hain.

### Hero

Company tagline, main heading, introductory text aur CTA buttons show karta hai.

### About

Company ka introduction aur vision show karta hai.

### Stats

Company ke high-level statistics show karta hai, jaise active projects aur technologies used.

### Services

Available services:

- Web Development
- Mobile App Development
- Software Development
- UI/UX Design
- Backend & API Development
- Digital Solutions

### Solutions

Business aur industry solutions:

- Education Technology
- Business Software
- Management Systems
- Automation
- Digital Platforms
- Innovative Applications

### Tech Stack

Frontend, backend, mobile, database, tools aur design technologies show karta hai.

### Projects

Projects ko cards me show karta hai. Category filters available hain:

- All
- Web
- Mobile
- Software
- Experiments

Projects currently `src/data/content.js` ke static data se load ho rahe hain.

### Team

Team members aur unke roles show karta hai. Current data me kuch placeholder names maujood hain.

### Careers

Open internship aur contribution-based roles show karta hai.

### Contact

Contact form me ye fields hain:

- Name
- Email
- Company
- Project type
- Budget
- Message

Frontend validation name, email aur message par hoti hai.

> Important: Current contact form real backend request nahi bhejta. Submit karne par local simulated success state display hoti hai. Real data save karne ke liye ise `POST /api/v1/inquiries` se connect karna hoga.

## 9. Frontend Styling

Important styling files:

- `src/styles/globals.css`: Global design system
- `src/styles/animations.css`: Animations
- `src/App.css`: Application-level styling

Global CSS me colors, gradients, typography, shadows, buttons, glass-card styles aur responsive utilities define hain.

Design dark navy background, cyan/blue highlights aur gold accent par based hai.

## 10. Custom Hooks

Hooks `src/hooks/` ke andar hain:

- `useCursor.js`: Desktop custom cursor
- `useMouseParallax.js`: Mouse-based parallax effect
- `useScrollAnimation.js`: Scroll animations
- `useScrollReveal.js`: Intersection Observer based reveal animations
- `useTilt.js`: Card tilt effect

`useScrollReveal` viewport me element aane par usme `is-visible` class add karta hai.

`useCursor` desktop devices par dot aur delayed ring cursor provide karta hai. Touch devices par ye automatically disable hota hai.

## 11. Backend Setup

Backend folder me commands run karein:

```bash
cd /Users/shushantkumar/Desktop/Divya/Official-Website/backend
npm install
npm run dev
```

Production-style start:

```bash
npm start
```

Backend normally yahan available hoga:

```text
http://localhost:5000
```

## 12. Backend Startup Flow

```text
backend/src/server.js
        ↓
dotenv environment load
        ↓
MongoDB connection
        ↓
Express app start
        ↓
Port 5000
```

Important files:

- `backend/src/server.js`: Server start karta hai
- `backend/src/app.js`: Express app aur routes configure karta hai
- `backend/src/config/env.js`: Environment variables load karta hai
- `backend/src/db/database.js`: MongoDB connection handle karta hai

## 13. Environment Variables

`backend/.env` me kam se kam ye values required hain:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/ashivam_technologies
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
```

Email configuration ke liye optional variables:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=
```

`JWT_SECRET` missing hone par backend start nahi hoga.

`.env` ko GitHub par commit nahi karna chahiye. Ye `.gitignore` me included hai.

## 14. Backend API Routes

Backend ka base path:

```text
/api/v1
```

| Route | Purpose |
|---|---|
| `/api/v1/health` | Backend aur database health check |
| `/api/v1/auth` | Admin login aur current user |
| `/api/v1/admin` | Admin management |
| `/api/v1/inquiries` | Contact inquiries |
| `/api/v1/career` | Jobs aur applications |
| `/api/v1/content` | Website content management |
| `/api/v1/media` | Media/file management |
| `/api/v1/notifications` | Notifications |
| `/api/v1/audit` | Audit logs |
| `/api/v1/settings` | Website settings |
| `/api/v1/dashboard` | Dashboard data |
| `/api/v1/employees` | Employee/team management |
| `/api/v1/employee-documents` | Employee documents |
| `/api/v1/hr-documents` | HR documents |

## 15. Health Check

Request:

```http
GET /api/v1/health
```

Database connected hone par response successful hoga:

```json
{
  "success": true,
  "database": "connected"
}
```

MongoDB unavailable hone par endpoint HTTP `503` response deta hai.

## 16. Authentication

Admin authentication JWT based hai.

Login:

```http
POST /api/v1/auth/login
```

Current admin:

```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

Protected routes me token is header ke through bhejna hota hai:

```http
Authorization: Bearer JWT_TOKEN
```

Backend roles aur permissions check karta hai:

- `Superadmin`
- `Admin`

## 17. Contact Inquiry Flow

Expected flow:

```text
User contact form submit karta hai
        ↓
POST /api/v1/inquiries
        ↓
Inquiry MongoDB me save hoti hai
        ↓
Admin dashboard se inquiry dekhi ja sakti hai
        ↓
Admin inquiry update/delete kar sakta hai
```

Available operations:

```http
POST   /api/v1/inquiries
GET    /api/v1/inquiries
GET    /api/v1/inquiries/:id
PATCH  /api/v1/inquiries/:id
DELETE /api/v1/inquiries/:id
```

Current React contact form abhi API se connected nahi hai.

## 18. Career Application Flow

Public jobs:

```http
GET /api/v1/career/jobs
```

Job details:

```http
GET /api/v1/career/jobs/:id
```

Job application:

```http
POST /api/v1/career/jobs/:jobId/apply
```

Resume upload bhi application ke saath ho sakta hai.

- Resume `backend/uploads/resumes` me save hota hai
- Maximum file size 5 MB hai
- Multer file upload handle karta hai

## 19. Security Features

Backend me ye security features implemented hain:

- Helmet security headers
- CORS configuration
- Global rate limiting
- JWT authentication
- Role-based authorization
- Permission-based authorization
- bcryptjs password hashing
- Upload size limit
- Disabled `x-powered-by` header
- Centralized error handling

Global rate limit 15 minutes me 100 requests ka hai.

## 20. Legacy Standalone Portal

File:

```text
ashivam-portal.html
```

Ye React component nahi hai. Ye ek separate standalone HTML application hai jisme external CDN libraries use hoti hain:

- Tailwind CSS
- QRCode.js
- jsPDF
- Google Fonts

Is portal ke intended features me certificate verification, QR code generation, PDF generation, client/intern portal aur project tracking shamil hain.

Ye file current React `App.jsx` me import nahi hui hai, isliye ise React website se separate legacy application samajhna chahiye.

## 21. Deployment

### Netlify

Netlify configuration `netlify.toml` me hai. Publish directory root directory hai aur SPA fallback `/index.html` par configured hai.

### Vercel

Vercel configuration `vercel.json` me hai.

Frontend aur backend ko deploy karte waqt frontend ke liye `CLIENT_URL` aur backend ke liye production MongoDB/JWT environment variables configure karne honge.

## 22. Overall Architecture

```text
React Frontend
    |
    | Mostly static content and local UI state
    |
    ├── src/data/content.js
    ├── Form validation
    ├── Project filters
    └── UI animations

Express Backend
    |
    ├── MongoDB
    ├── Admin authentication
    ├── Contact inquiries
    ├── Careers and applications
    ├── Website content
    ├── Media uploads
    ├── Employees
    ├── HR documents
    └── Dashboard APIs
```

## 23. Important Development Notes

1. Frontend aur backend ke liye alag-alag `npm install` chalana padta hai.
2. Backend ke liye MongoDB running hona chahiye.
3. Backend start hone ke liye `.env` me `JWT_SECRET` mandatory hai.
4. Frontend contact form abhi simulated success response deta hai.
5. Projects, services, careers aur team data static configuration se load ho raha hai.
6. Backend APIs available hain, lekin React frontend me dynamic API integration abhi limited ya absent hai.
7. `index.html` aur `ashivam-portal.html` me standalone/legacy code maujood hai.
8. Existing README kuch features mention karta hai jo current React frontend me directly connected nahi dikhte.

## 24. Short Summary

Ye project Ashivam Technologies ki modern company website hai. Frontend React/Vite par bana hai aur backend Express/MongoDB par. Frontend presentation-focused hai, jabki backend admin operations, inquiries, careers, media, employees aur documents ke liye API platform provide karta hai. Dono layers ke beech contact form aur dynamic content integration ko future me complete kiya ja sakta hai.
