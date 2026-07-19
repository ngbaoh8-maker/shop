import { NextResponse } from 'next/server';

// In-memory rate limiter (resets per Edge function instance)
// For production-grade DDoS protection, use Upstash Redis + @upstash/ratelimit
const rateLimitMap = new Map();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = {
  '/api/auth/login': 10,     // Max 10 login attempts per minute per IP
  '/api/auth/register': 5,   // Max 5 registrations per minute per IP
  '/api/orders/token': 20,   // Max 20 token orders per minute per IP
  '/api/orders/tool': 20,    // Max 20 tool orders per minute per IP
  '/api/': 120,              // Max 120 general API requests per minute per IP
  'default': 200             // Max 200 page requests per minute per IP
};

// Known bad bot user agents (scrapers, vulnerability scanners)
const BAD_BOT_PATTERNS = [
  /sqlmap/i, /nikto/i, /nmap/i, /masscan/i, /zgrab/i,
  /python-requests/i, /go-http-client/i, /curl\//i,
  /wget\//i, /libwww-perl/i, /scrapy/i, /bot/i,
  /crawler/i, /spider/i, /headless/i, /phantom/i,
  /selenium/i, /puppeteer/i, /playwright/i
];

// Allowed bot user agents (search engines we still want)
const ALLOWED_BOTS = [
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i,
  /facebookexternalhit/i, /twitterbot/i
];

function getRateLimit(pathname) {
  for (const [path, limit] of Object.entries(MAX_REQUESTS_PER_WINDOW)) {
    if (pathname.startsWith(path)) return limit;
  }
  return MAX_REQUESTS_PER_WINDOW['default'];
}

function isRateLimited(ip, pathname) {
  const key = `${ip}:${pathname.startsWith('/api/') ? 'api' : 'page'}`;
  const now = Date.now();
  const limit = getRateLimit(pathname);

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  const record = rateLimitMap.get(key);

  if (now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  record.count++;
  if (record.count > limit) return true;

  return false;
}

// Periodic cleanup of old entries (every 500 requests)
let cleanupCounter = 0;
function cleanupMap() {
  cleanupCounter++;
  if (cleanupCounter % 500 === 0) {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetAt) rateLimitMap.delete(key);
    }
  }
}

export function middleware(req) {
  try {
    const { pathname } = req.nextUrl;
    const userAgent = req.headers.get('user-agent') || '';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || '0.0.0.0';

    // === 1. BLOCK MALICIOUS BOTS ===
    const isAllowedBot = ALLOWED_BOTS.some(pattern => pattern.test(userAgent));
    if (!isAllowedBot) {
      const isBadBot = BAD_BOT_PATTERNS.some(pattern => pattern.test(userAgent));
      if (isBadBot) {
        return new NextResponse(
          JSON.stringify({ message: 'Quyền truy cập bị từ chối.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // === 2. BLOCK EMPTY USER AGENTS ON API ROUTES ===
    if (pathname.startsWith('/api/') && !userAgent) {
      return new NextResponse(
        JSON.stringify({ message: 'Yêu cầu không hợp lệ.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // === 3. RATE LIMITING ===
    cleanupMap();
    if (isRateLimited(ip, pathname)) {
      const isApi = pathname.startsWith('/api/');
      if (isApi) {
        return new NextResponse(
          JSON.stringify({ message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60'
            }
          }
        );
      }
      // For page requests: redirect to home with a flag
      return new NextResponse(
        '<html><body><h1>429 - Quá nhiều yêu cầu</h1><p>Vui lòng thử lại sau 1 phút.</p></body></html>',
        { status: 429, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // === 4. SECURITY HEADERS ===
    const res = NextResponse.next();

    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('X-XSS-Protection', '1; mode=block');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Block direct access to source browsing paths
    if (
      pathname.includes('/.git') ||
      pathname.includes('/node_modules') ||
      pathname.includes('/.env') ||
      pathname.includes('/prisma') ||
      pathname.endsWith('.map')
    ) {
      return new NextResponse('Not Found', { status: 404 });
    }

    return res;
  } catch (err) {
    console.error('[Middleware Error]', err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ]
};
