# ConstructAI — Next.js Full-Stack Application

AI-powered construction compliance assistant with integrated frontend and backend APIs.

## 🏗️ Architecture

This is a **Next.js 14 App Router** application with:

- **Frontend**: React components with TypeScript, Tailwind CSS
- **Backend**: Next.js API routes (REST endpoints)
- **Database**: PostgreSQL (Supabase or self-hosted)
- **Auth**: JWT-based authentication with bcrypt password hashing
- **Email**: Nodemailer for OTP verification
- **File uploads**: Local filesystem storage

## 📁 Project Structure

```
.
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page (login)
│   ├── dashboard/            # Protected dashboard
│   │   └── page.tsx
│   ├── register/             # Registration page
│   ├── verify-otp/           # OTP verification page
│   ├── reset-password/       # Password reset page
│   └── api/                  # Backend API routes
│       ├── auth/             # Authentication endpoints
│       │   ├── login/
│       │   ├── register/
│       │   ├── logout/
│       │   ├── me/
│       │   └── reset-password/
│       ├── chat/             # Chat session & message endpoints
│       │   └── sessions/
│       ├── otp/              # OTP send/verify
│       ├── upload/           # File upload
│       ├── users/            # User profile
│       └── alerts/           # Regulation alerts
│
├── components/               # React components
│   ├── auth/                 # Auth forms (Login, Register, OTP, etc.)
│   ├── ChatWithSidebar.tsx   # Main chat interface
│   ├── ChatComponent.tsx     # Chat message display
│   ├── ChatSidebar.tsx       # Session sidebar
│   ├── ConstructAI.tsx       # Dashboard wrapper
│   ├── Upload.tsx            # File upload UI
│   ├── Updates.tsx           # Alerts/updates
│   └── CheckList.tsx         # Compliance checklist
│
├── lib/                      # Backend utilities
│   ├── db.ts                 # PostgreSQL connection pool
│   ├── auth.ts               # JWT + bcrypt helpers
│   ├── helpers.ts            # Response helpers, validation
│   ├── mailer.ts             # Nodemailer transporter
│   └── schema.sql            # Database schema
│
├── services/                 # Frontend API client
│   └── apiClient.ts          # Fetch wrappers for all endpoints
│
├── hooks/                    # React hooks
│   └── useAuth.ts            # Auth state hook
│
├── types/                    # TypeScript types
│   └── index.ts              # Shared types (UserRow, ChatSessionRow, etc.)
│
├── utils/                    # Utilities
│   └── parseMessage.ts       # Markdown + citation rendering
│
├── middleware.ts             # JWT auth guard (protects /dashboard + /api/*)
├── next.config.js            # Next.js config
├── tailwind.config.js        # Tailwind CSS config
├── tsconfig.json             # TypeScript config
└── .env.local                # Environment variables (template)
```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Fill in `.env.local` with your credentials:

```bash
# Database (PostgreSQL / Supabase)
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=ConstructAI <your_email@gmail.com>

# File uploads
UPLOAD_DIR=./uploads

# External AI API
NEXT_PUBLIC_AI_BASE_URL=https://construction-ai-new-production-9b17.up.railway.app

# reCAPTCHA (optional)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

### 3. Set Up Database

Run the schema against your PostgreSQL database:

```bash
psql $DATABASE_URL -f lib/schema.sql
```

Or manually execute `lib/schema.sql` in your database client (Supabase SQL editor, pgAdmin, etc.).

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see the login page.

### 5. Build for Production

```bash
npm run build
npm start
```

## 🔐 Authentication Flow

1. **Register** → `POST /api/auth/register` → JWT token + user object
2. **OTP sent** → `POST /api/otp/send` → 6-digit code emailed
3. **Verify OTP** → `POST /api/otp/verify` → marks user as verified
4. **Login** → `POST /api/auth/login` → JWT token
5. **Protected routes** → `middleware.ts` checks JWT on `/dashboard` and `/api/*`

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/reset-password` | Update password |

### OTP
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/otp/send` | Send verification code |
| POST | `/api/otp/verify` | Verify code |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/sessions` | List sessions |
| POST | `/api/chat/sessions` | Create session |
| DELETE | `/api/chat/sessions/[id]` | Delete session |
| GET | `/api/chat/sessions/[id]/messages` | Get messages |
| POST | `/api/chat/sessions/[id]/messages` | Save message |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload PDF/DOC/DOCX (max 10 MB) |
| GET | `/api/users` | Get profile |
| PATCH | `/api/users` | Update profile |
| GET | `/api/alerts` | Get regulation alerts |

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (via `pg` driver)
- **Auth**: JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`)
- **Email**: Nodemailer
- **Icons**: Lucide React

## 📦 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Docker

```bash
docker build -t construct-ai .
docker run -p 3000:3000 --env-file .env.local construct-ai
```

## 🧹 Cleanup

The old `src/` folder from the original React app is still present. Once you've verified everything works, you can delete it:

```bash
rm -rf src/
```

## 📝 Notes

- **Middleware** protects `/dashboard` and all `/api/*` routes except public auth endpoints
- **JWT tokens** are stored in `localStorage` on the client
- **File uploads** are saved to `./uploads/[userId]/[uuid].[ext]`
- **OTP codes** expire after 10 minutes
- **Chat sessions** auto-title from the first user message
- **Streaming AI responses** come from the external AI API (`NEXT_PUBLIC_AI_BASE_URL`)

## 🐛 Troubleshooting

**"Cannot find module 'pg'"** → Run `npm install`

**"JWT_SECRET is not set"** → Fill in `.env.local`

**"Connection refused" (database)** → Check `DATABASE_URL` and ensure Postgres is running

**"Unauthorized" on API calls** → Ensure JWT token is sent as `Authorization: Bearer <token>`
