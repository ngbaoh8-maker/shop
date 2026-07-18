# 🛡️ Valkyrie Shop

**Premium Token & Tool Selling Platform** — A modern SaaS-style e-commerce system for selling digital Tokens and Tools, built with Next.js, Node.js + Express, Discord Bot integration, and advanced security.

---

## ✨ Features

- **Dark Mode Glassmorphism UI** — Premium SaaS design with animations
- **Role-Based Access Control (RBAC)** — Super Admin / Admin / User hierarchy
- **Discord Bot Integration** — Real-time order approval notifications with buttons
- **VietQR Payment** — Auto-generated QR codes for Vietnamese banking
- **Secure File Downloads** — Server-side auth checks on every file download
- **Rate Limiting** — Brute-force login protection
- **Helmet.js** — Secure HTTP headers on all API responses
- **JWT Authentication** — Stateless, secure session management

---

## 🗂️ Project Structure

```
shop/
├── client/          # Next.js Frontend (Port 3000)
│   └── app/
│       ├── components/   # AuthScreen, Dashboard, TokenSection, etc.
│       └── globals.css
├── server/          # Express Backend + Discord Bot (Port 5000)
│   ├── routes/      # auth.js, tools.js, orders.js, admin.js
│   ├── middleware/  # auth.js (JWT + RBAC)
│   ├── prisma/      # schema.prisma
│   ├── bot.js       # Discord Bot
│   └── server.js    # Main entry
└── package.json     # Monorepo launcher
```

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/ngbaoh8-maker/shop.git
cd shop
```

### 2. Configure environment variables
```bash
cp server/.env.example server/.env
# Edit server/.env with your actual credentials
```

### 3. Install dependencies
```bash
npm run install:all
```

### 4. Initialize database
```bash
npm run db:push
```

### 5. Start the full application
```bash
npm run dev
```

> Frontend: http://localhost:3000  
> Backend API: http://localhost:5000

---

## 🔐 Security Features

| Feature | Details |
|---|---|
| **Helmet.js** | Secure HTTP headers (XSS, clickjacking, MIME sniffing protection) |
| **Rate Limiting** | Max 10 login attempts per 15 min per IP |
| **JWT Tokens** | 7-day expiry, server-side validation on every request |
| **RBAC** | Server-side role checks on ALL admin API endpoints |
| **File Access Control** | Downloads require ownership or admin role verification |
| **.gitignore** | `.env`, `*.db`, `uploads/` excluded from version control |
| **Password Hashing** | bcrypt with salt rounds |

---

## ⚙️ Environment Variables

Copy `server/.env.example` to `server/.env` and fill in:

```env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-long-random-secret"
DISCORD_TOKEN="your-discord-bot-token"
DISCORD_GUILD_ID="your-guild-id"
DISCORD_CHANNEL_ID="your-channel-id"
SUPER_ADMIN_USERNAME="your-admin-username"
SUPER_ADMIN_PASSWORD="your-strong-password"
```

> ⚠️ **Never commit your `.env` file to GitHub!**

---

## 👥 Roles

| Role | Permissions |
|---|---|
| **Super Admin** | Full system control, manage admins, all orders, statistics |
| **Admin** | Manage tools, approve/reject orders, upload files |
| **User** | Buy tokens/tools, view orders, download approved files |
