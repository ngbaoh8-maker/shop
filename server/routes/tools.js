const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Configure storage for tools upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'tools');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `tool-${Date.now()}-${cleanName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB Limit
});

// GET: List all tools
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tools = await prisma.tool.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(tools);
  } catch (error) {
    console.error('Lỗi lấy danh sách tool:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// POST: Add new tool (Admin and Super Admin only)
router.post('/', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), upload.single('toolFile'), async (req, res) => {
  const { name, description, price } = req.body;

  if (!name || !price) {
    return res.status(400).json({ message: 'Tên Tool và Giá tiền là bắt buộc.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Bạn phải tải lên file cài đặt của Tool.' });
  }

  try {
    const parsedPrice = parseFloat(price);
    const fileUrl = `/uploads/tools/${req.file.filename}`;

    const newTool = await prisma.tool.create({
      data: {
        name,
        description: description || '',
        price: parsedPrice,
        fileUrl
      }
    });

    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'TOOL_CREATED',
        details: `Admin ${req.user.username} đã đăng bán Tool mới: ${name} với giá ${parsedPrice.toLocaleString()} VNĐ.`
      }
    });

    res.status(201).json({ message: 'Đăng sản phẩm Tool thành công.', tool: newTool });
  } catch (error) {
    console.error('Lỗi đăng tool:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// DELETE: Remove tool (Admin and Super Admin only)
router.delete('/:id', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  const { id } = req.id || req.params;

  try {
    const tool = await prisma.tool.findUnique({
      where: { id }
    });

    if (!tool) {
      return res.status(404).json({ message: 'Không tìm thấy Tool.' });
    }

    // Delete database entry
    await prisma.tool.delete({
      where: { id }
    });

    // Optionally delete the physical file on server
    const physicalPath = path.join(__dirname, '..', tool.fileUrl);
    if (fs.existsSync(physicalPath)) {
      fs.unlinkSync(physicalPath);
    }

    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'TOOL_DELETED',
        details: `Admin ${req.user.username} đã xóa Tool: ${tool.name}.`
      }
    });

    res.json({ message: 'Xóa Tool thành công.' });
  } catch (error) {
    console.error('Lỗi khi xóa tool:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

module.exports = router;
