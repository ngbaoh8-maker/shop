const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// 1. GET: System Statistics (Admin + Super Admin)
router.get('/stats', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const totalUsers = await prisma.user.count({ where: { role: 'USER' } });
    const totalTools = await prisma.tool.count();
    
    // Revenue calculations (only approved orders)
    const approvedOrders = await prisma.order.findMany({
      where: { status: 'APPROVED' }
    });
    const totalRevenue = approvedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    const pendingOrdersCount = await prisma.order.count({ where: { status: 'PENDING' } });
    const approvedOrdersCount = approvedOrders.length;
    const rejectedOrdersCount = await prisma.order.count({ where: { status: 'REJECTED' } });

    // Monthly breakdown (demo/simple stats)
    // Group approved orders by type
    const tokenRevenue = approvedOrders
      .filter(o => o.type === 'TOKEN')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const toolRevenue = approvedOrders
      .filter(o => o.type === 'TOOL')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    res.json({
      metrics: {
        totalUsers,
        totalTools,
        totalRevenue,
        pendingOrdersCount,
        approvedOrdersCount,
        rejectedOrdersCount
      },
      breakdown: {
        tokenRevenue,
        toolRevenue
      }
    });
  } catch (error) {
    console.error('Lỗi thống kê admin:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// 2. GET: List all users (Admin + Super Admin)
router.get('/users', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error('Lỗi lấy danh sách người dùng:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// 3. POST: Create Admin User (Super Admin only)
router.post('/users', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
  }

  if (!['ADMIN', 'USER'].includes(role)) {
    return res.status(400).json({ message: 'Vai trò không hợp lệ.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
        status: 'ACTIVE'
      }
    });

    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'ADMIN_USER_CREATED',
        details: `Super Admin ${req.user.username} đã tạo tài khoản quản trị mới: ${username} (${role}).`
      }
    });

    res.status(201).json({ message: 'Tạo người dùng thành công.', user: { id: newUser.id, username: newUser.username, role: newUser.role } });
  } catch (error) {
    console.error('Lỗi tạo tài khoản admin:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// 4. POST: Update User Role (Super Admin only)
router.post('/users/:id/role', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return res.status(400).json({ message: 'Quyền không hợp lệ.' });
  }

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    if (targetUser.role === 'SUPER_ADMIN' && req.user.id !== targetUser.id) {
      return res.status(403).json({ message: 'Không thể thay đổi quyền của Super Admin khác.' });
    }

    await prisma.user.update({
      where: { id },
      data: { role }
    });

    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'USER_ROLE_CHANGED',
        details: `Super Admin ${req.user.username} đã đổi vai trò của ${targetUser.username} sang ${role}.`
      }
    });

    res.json({ message: 'Cập nhật vai trò thành công.' });
  } catch (error) {
    console.error('Lỗi đổi vai trò:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// 5. POST: Toggle Lock/Unlock User (Super Admin only)
router.post('/users/:id/toggle-lock', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  const { id } = req.params;

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    if (targetUser.role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Không thể khóa tài khoản Super Admin.' });
    }

    const nextStatus = targetUser.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';

    await prisma.user.update({
      where: { id },
      data: { status: nextStatus }
    });

    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: nextStatus === 'LOCKED' ? 'USER_LOCKED' : 'USER_UNLOCKED',
        details: `Super Admin ${req.user.username} đã ${nextStatus === 'LOCKED' ? 'khóa' : 'mở khóa'} tài khoản ${targetUser.username}.`
      }
    });

    res.json({ message: `${nextStatus === 'LOCKED' ? 'Khóa' : 'Mở khóa'} tài khoản thành công.` });
  } catch (error) {
    console.error('Lỗi toggle khóa:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// 6. DELETE: Delete User (Super Admin only)
router.delete('/users/:id', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  const { id } = req.params;

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    if (targetUser.role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Không thể xóa tài khoản Super Admin.' });
    }

    // Delete user orders logs first or use cascade delete
    // To make it safe, we delete dependent records:
    await prisma.order.deleteMany({ where: { userId: id } });
    await prisma.log.deleteMany({ where: { userId: id } });

    await prisma.user.delete({
      where: { id }
    });

    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'USER_DELETED',
        details: `Super Admin ${req.user.username} đã xóa tài khoản: ${targetUser.username}.`
      }
    });

    res.json({ message: 'Xóa tài khoản người dùng thành công.' });
  } catch (error) {
    console.error('Lỗi khi xóa người dùng:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// 7. GET: System logs (Admin + Super Admin)
router.get('/logs', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const logs = await prisma.log.findMany({
      include: {
        user: { select: { username: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200 // Cap at latest 200 logs
    });
    res.json(logs);
  } catch (error) {
    console.error('Lỗi lấy nhật ký:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

module.exports = router;
