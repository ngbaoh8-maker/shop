const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendOrderNotification, client } = require('../bot');

const router = express.Router();
const prisma = new PrismaClient();

// Multer storage for Token upload via Web Admin Panel
const tokenStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'tokens');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const orderId = req.params.id;
    cb(null, `token-${orderId}-${Date.now()}.txt`);
  }
});
const uploadToken = multer({ storage: tokenStorage });

// Helper: Edit Discord embed message when action happens on Web
async function syncDiscordMessage(orderId, status, adminUsername, fileName = null) {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || !order.discordMsgId) return;

    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    if (!channel) return;

    const originalMessage = await channel.messages.fetch(order.discordMsgId);
    if (!originalMessage) return;

    const receivedEmbed = originalMessage.embeds[0];
    if (!receivedEmbed) return;

    let updatedEmbed;
    if (status === 'APPROVED') {
      updatedEmbed = new require('discord.js').EmbedBuilder.from(receivedEmbed)
        .setColor(0x10B981) // Green
        .setTitle(`✅ ĐƠN HÀNG ĐÃ DUYỆT (TỪ WEB)`);
      
      updatedEmbed.addFields({ name: 'Trạng Thái', value: `🟢 Đã Duyệt bởi Web Admin: \`${adminUsername}\`` });
      if (fileName) {
        updatedEmbed.addFields({ name: 'File Token', value: `\`${fileName}\`` });
      }
    } else if (status === 'REJECTED') {
      updatedEmbed = new require('discord.js').EmbedBuilder.from(receivedEmbed)
        .setColor(0xEF4444) // Red
        .setTitle(`❌ ĐƠN HÀNG ĐÃ TỪ CHỐI (TỪ WEB)`)
        .addFields({ name: 'Trạng Thái', value: `🔴 Từ Chối bởi Web Admin: \`${adminUsername}\`` });
    }

    await originalMessage.edit({ embeds: [updatedEmbed], components: [] });
  } catch (error) {
    console.error('[Sync Discord] Không thể đồng bộ tin nhắn Discord:', error.message);
  }
}

// 1. GET: Current User's Orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { tool: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    console.error('Lỗi lấy đơn hàng người dùng:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// 2. GET: All Orders (Admin & Super Admin only)
router.get('/all', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { username: true } },
        tool: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    console.error('Lỗi lấy toàn bộ đơn hàng:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// 3. POST: Create Token Order
router.post('/token', authenticateToken, async (req, res) => {
  const { quantity } = req.body;

  const parsedQty = parseInt(quantity);
  if (isNaN(parsedQty) || parsedQty < 10) {
    return res.status(400).json({ message: 'Số lượng Token tối thiểu là 10.' });
  }

  const pricePerToken = 800;
  const totalAmount = parsedQty * pricePerToken;
  const orderId = `TK-${Date.now().toString().slice(-6)}${crypto.randomInt(1000, 9999)}`;
  const transferMessage = `MUA_TOKEN_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  try {
    const newOrder = await prisma.order.create({
      data: {
        id: orderId,
        userId: req.user.id,
        type: 'TOKEN',
        quantity: parsedQty,
        totalAmount,
        transferMessage,
        status: 'PENDING'
      }
    });

    // Generate VietQR Link
    // Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<DESCRIPTION>&accountName=<ACCOUNT_NAME>
    // We use MB Bank details as a default/demo
    const qrUrl = `https://img.vietqr.io/image/MB-VQRQAGFUD5594-compact2.png?amount=${totalAmount}&addInfo=${transferMessage}&accountName=SHOP_TOKEN_TOOL`;

    // Notify Discord Bot
    sendOrderNotification(newOrder, req.user.username);

    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'ORDER_TOKEN_CREATED',
        details: `Người dùng ${req.user.username} tạo đơn hàng mua ${parsedQty} Token, tổng tiền: ${totalAmount.toLocaleString()} VNĐ.`
      }
    });

    res.status(201).json({
      order: newOrder,
      qrUrl,
      bankDetails: {
        bankName: 'MB Bank (Ngân Hàng Quân Đội)',
        accountNo: 'VQRQAGFUD5594',
        accountName: 'SHOP TOKEN TOOL',
        amount: totalAmount,
        message: transferMessage
      }
    });
  } catch (error) {
    console.error('Lỗi khi tạo đơn hàng Token:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// 4. POST: Create Tool Order
router.post('/tool', authenticateToken, async (req, res) => {
  const { toolId } = req.body;

  if (!toolId) {
    return res.status(400).json({ message: 'Vui lòng cung cấp mã Tool.' });
  }

  try {
    const tool = await prisma.tool.findUnique({ where: { id: toolId } });
    if (!tool) {
      return res.status(404).json({ message: 'Tool không tồn tại.' });
    }

    const orderId = `TL-${Date.now().toString().slice(-6)}${crypto.randomInt(1000, 9999)}`;
    const transferMessage = `MUA_TOOL_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const totalAmount = tool.price;

    const newOrder = await prisma.order.create({
      data: {
        id: orderId,
        userId: req.user.id,
        type: 'TOOL',
        toolId: tool.id,
        totalAmount,
        transferMessage,
        status: 'PENDING'
      }
    });

    const qrUrl = `https://img.vietqr.io/image/MB-VQRQAGFUD5594-compact2.png?amount=${totalAmount}&addInfo=${transferMessage}&accountName=SHOP_TOKEN_TOOL`;

    // Notify Discord Bot
    sendOrderNotification(newOrder, req.user.username);

    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'ORDER_TOOL_CREATED',
        details: `Người dùng ${req.user.username} tạo đơn hàng mua Tool "${tool.name}", tổng tiền: ${totalAmount.toLocaleString()} VNĐ.`
      }
    });

    res.status(201).json({
      order: newOrder,
      qrUrl,
      bankDetails: {
        bankName: 'MB Bank (Ngân Hàng Quân Đội)',
        accountNo: 'VQRQAGFUD5594',
        accountName: 'SHOP TOKEN TOOL',
        amount: totalAmount,
        message: transferMessage
      }
    });
  } catch (error) {
    console.error('Lỗi khi tạo đơn mua Tool:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// 5. POST: Web Admin Approval Endpoint (with optional file upload for Token)
router.post('/:id/approve-web', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), uploadToken.single('tokenFile'), async (req, res) => {
  const { id } = req.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { tool: true }
    });

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ message: 'Đơn hàng này đã được xử lý.' });
    }

    let fileUrl = null;

    if (order.type === 'TOKEN') {
      if (!req.file) {
        return res.status(400).json({ message: 'Vui lòng đính kèm file TXT chứa danh sách Token để duyệt.' });
      }
      fileUrl = `/uploads/tokens/${req.file.filename}`;
    } else {
      // It's a TOOL
      if (!order.tool || !order.tool.fileUrl) {
        return res.status(400).json({ message: 'File cài đặt của Tool không tồn tại trên hệ thống.' });
      }
      fileUrl = order.tool.fileUrl;
    }

    // Update status
    await prisma.order.update({
      where: { id },
      data: {
        status: 'APPROVED',
        fileUrl
      }
    });

    // Log Activity
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'ORDER_APPROVED_WEB',
        details: `Đơn hàng ${order.id} được duyệt từ Web Admin bởi ${req.user.username}.`
      }
    });

    // Sync status to Discord embed
    syncDiscordMessage(order.id, 'APPROVED', req.user.username, req.file ? req.file.originalname : null);

    res.json({ message: 'Duyệt đơn hàng thành công.', status: 'APPROVED' });
  } catch (error) {
    console.error('Lỗi duyệt đơn hàng:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// 6. POST: Web Admin Reject Endpoint
router.post('/:id/reject-web', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  const { id } = req.params;

  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ message: 'Đơn hàng này đã được xử lý.' });
    }

    await prisma.order.update({
      where: { id },
      data: { status: 'REJECTED' }
    });

    // Log Activity
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'ORDER_REJECTED_WEB',
        details: `Đơn hàng ${order.id} đã bị từ chối từ Web Admin bởi ${req.user.username}.`
      }
    });

    // Sync status to Discord embed
    syncDiscordMessage(order.id, 'REJECTED', req.user.username);

    res.json({ message: 'Từ chối đơn hàng thành công.', status: 'REJECTED' });
  } catch (error) {
    console.error('Lỗi từ chối đơn hàng:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// 7. GET: Secure file download
router.get('/:id/download', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { tool: true }
    });

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    // Role check: must be owner, OR admin, OR super admin
    const isOwner = order.userId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Bạn không có quyền tải file của đơn hàng này.' });
    }

    if (order.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Đơn hàng chưa được thanh toán hoặc duyệt.' });
    }

    if (!order.fileUrl) {
      return res.status(404).json({ message: 'File tải về không tồn tại.' });
    }

    const absolutePath = path.join(__dirname, '..', order.fileUrl);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'Không tìm thấy file trên máy chủ.' });
    }

    // Dynamic file download name based on order details
    let downloadName = `download-${order.id}`;
    if (order.type === 'TOKEN') {
      downloadName = `token-${order.id}.txt`;
    } else if (order.tool) {
      // Keep original file extension
      const ext = path.extname(order.fileUrl);
      const cleanToolName = order.tool.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      downloadName = `${cleanToolName}${ext}`;
    }

    res.download(absolutePath, downloadName);
  } catch (error) {
    console.error('Lỗi khi tải file:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

module.exports = router;
