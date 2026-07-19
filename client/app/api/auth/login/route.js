export const runtime = 'nodejs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../../lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-token-key-2026';

// Helper to seed default Super Admin if database is empty
async function seedDefaultSuperAdmin() {
  try {
    const adminUsername = process.env.SUPER_ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'acccuadmin';

    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.user.create({
        data: {
          username: adminUsername,
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE'
        }
      });
      console.log(`[Seed Database] Đã khởi tạo tài khoản SUPER_ADMIN mặc định (${adminUsername})`);
    }
  } catch (err) {
    console.error('[Seed Error]', err);
  }
}

export async function POST(req) {
  try {
    // Run seeding check on login request
    await seedDefaultSuperAdmin();

    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ message: 'Tên đăng nhập và mật khẩu là bắt buộc.' }, { status: 400 });
    }

    const cleanUsername = username.trim();

    // Find user
    const user = await prisma.user.findUnique({
      where: { username: cleanUsername }
    });

    if (!user) {
      return Response.json({ message: 'Tài khoản hoặc mật khẩu không chính xác.' }, { status: 401 });
    }

    // Check status
    if (user.status === 'LOCKED') {
      return Response.json({ message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' }, { status: 403 });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return Response.json({ message: 'Tài khoản hoặc mật khẩu không chính xác.' }, { status: 401 });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Logging action
    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: 'Đăng nhập vào hệ thống thành công'
      }
    });

    return Response.json({
      message: 'Đăng nhập thành công.',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('[Login API Error]', err);
    return Response.json({ message: 'Đăng nhập thất bại. Vui lòng thử lại.' }, { status: 500 });
  }
}
