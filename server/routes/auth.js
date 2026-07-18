const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Seed Super Admin if not exists
const seedSuperAdmin = async () => {
  try {
    const superAdminUsername = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperSecurePassword2026!';

    const existingUser = await prisma.user.findFirst({
      where: {
        role: 'SUPER_ADMIN'
      }
    });

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
      await prisma.user.create({
        data: {
          username: superAdminUsername,
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE'
        }
      });
      console.log(`[Seed] Super Admin được khởi tạo thành công với tài khoản: ${superAdminUsername}`);
    } else {
      // Keep username & password synced with env in case of updates
      const isUsernameMatch = existingUser.username === superAdminUsername;
      if (!isUsernameMatch) {
        const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            username: superAdminUsername,
            password: hashedPassword
          }
        });
        console.log(`[Seed] Cập nhật thông tin Super Admin theo .env`);
      }
    }
  } catch (error) {
    console.error('[Seed] Lỗi khởi tạo Super Admin:', error);
  }
};

// Execute seed
seedSuperAdmin();

// Register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Tên đăng nhập và mật khẩu là bắt buộc.' });
  }

  // Security: Input validation
  const cleanUsername = username.trim();
  if (cleanUsername.length < 3 || cleanUsername.length > 32) {
    return res.status(400).json({ message: 'Tên đăng nhập phải từ 3 đến 32 ký tự.' });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return res.status(400).json({ message: 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: 'USER',
        status: 'ACTIVE'
      }
    });

    await prisma.log.create({
      data: {
        userId: newUser.id,
        action: 'REGISTER',
        details: `Người dùng ${username} đăng ký tài khoản thành công.`
      }
    });

    res.status(201).json({ message: 'Đăng ký thành công.' });
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Tên đăng nhập và mật khẩu là bắt buộc.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    if (user.status === 'LOCKED') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: `Người dùng ${username} đăng nhập thành công.`
      }
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// Get Current User Profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    if (user.status === 'LOCKED') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa.' });
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

module.exports = router;
