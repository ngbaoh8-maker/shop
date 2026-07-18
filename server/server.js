const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import Routes
const authRoutes = require('./routes/auth');
const toolRoutes = require('./routes/tools');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

// Initialize bot (starts Discord connection in background)
require('./bot');

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// 1. SECURITY MIDDLEWARE — Helmet.js
// Adds secure HTTP headers to every response:
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY (clickjacking protection)
// - X-XSS-Protection (legacy browser support)
// - Strict-Transport-Security (force HTTPS)
// ==========================================
app.use(helmet({
  contentSecurityPolicy: false, // Allow VietQR image loading
  crossOriginResourcePolicy: { policy: 'cross-origin' } // Allow file downloads
}));

// ==========================================
// 2. CORS — Only allow from known origins
// ==========================================
const allowedOrigins = [
  'http://localhost:3000',
  'http://192.168.1.8:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS policy.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ==========================================
// 3. RATE LIMITING
// ==========================================

// Global rate limiter: 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Quá nhiều yêu cầu từ IP này. Vui lòng thử lại sau 15 phút.' }
});

// Auth route limiter: Max 10 login attempts per 15 minutes per IP (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Quá nhiều lần thử đăng nhập. Tài khoản tạm thời bị khóa 15 phút.' },
  skipSuccessfulRequests: true // Don't count successful logins
});

// Order creation limiter: Max 30 orders per hour per IP (anti-spam)
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { message: 'Bạn đã tạo quá nhiều đơn hàng. Vui lòng thử lại sau 1 giờ.' }
});

// Apply global limiter
app.use(globalLimiter);

// ==========================================
// 4. BODY PARSERS — with size limits
// ==========================================
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ==========================================
// 5. ROUTES
// ==========================================
app.use('/api/auth', authLimiter, authRoutes);    // Rate-limited auth
app.use('/api/tools', toolRoutes);
app.use('/api/orders', orderLimiter, orderRoutes); // Rate-limited orders
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Hệ thống bán hàng Token & Tool hoạt động bình thường.' });
});

// ==========================================
// 6. GLOBAL ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
  // Don't expose internal error details to client
  console.error('[System Error]:', err.message);

  // Handle CORS errors specifically
  if (err.message === 'Not allowed by CORS policy.') {
    return res.status(403).json({ message: 'Truy cập bị từ chối do chính sách bảo mật.' });
  }

  res.status(500).json({ message: 'Có lỗi xảy ra trên hệ thống. Vui lòng liên hệ Admin.' });
});

// ==========================================
// 7. START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`[Express Backend] Máy chủ đang chạy tại cổng http://localhost:${PORT}`);
});
