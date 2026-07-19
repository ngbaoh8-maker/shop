import crypto from 'crypto';
import prisma from '../../lib/db';
import { verifyAuth } from '../../lib/auth';
import { sendOrderNotification } from '../../lib/discord';

// GET: Fetch user's orders (or all orders for Admins)
export async function GET(req) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return Response.json({ message: 'Bạn chưa đăng nhập.' }, { status: 401 });
    }

    let orders;
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      orders = await prisma.order.findMany({
        include: {
          user: { select: { username: true } },
          tool: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      orders = await prisma.order.findMany({
        where: { userId: user.id },
        include: { tool: true },
        orderBy: { createdAt: 'desc' }
      });
    }

    return Response.json(orders);
  } catch (err) {
    console.error('[GET Orders API Error]', err);
    return Response.json({ message: 'Lỗi tải danh sách đơn hàng.' }, { status: 500 });
  }
}

// POST: Create a new order (Token or Tool)
export async function POST(req) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return Response.json({ message: 'Bạn chưa đăng nhập.' }, { status: 401 });
    }

    const { type, quantity, toolId } = await req.json();

    if (!type || (type !== 'TOKEN' && type !== 'TOOL')) {
      return Response.json({ message: 'Loại đơn hàng không hợp lệ.' }, { status: 400 });
    }

    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 random characters
    let orderId = '';
    let totalAmount = 0;
    let transferMessage = '';
    let dbQuantity = 1;
    let selectedToolId = null;
    let toolName = '';

    if (type === 'TOKEN') {
      const qty = parseInt(quantity);
      if (isNaN(qty) || qty < 10) {
        return Response.json({ message: 'Số lượng mua tối thiểu là 10 Token.' }, { status: 400 });
      }
      orderId = `TK-${randomSuffix}`;
      totalAmount = qty * 800; // 800 VNĐ per token
      transferMessage = `VALKYRIE_TK_${randomSuffix}`;
      dbQuantity = qty;
    } else {
      // It's a TOOL
      if (!toolId) {
        return Response.json({ message: 'Vui lòng chọn tool cần mua.' }, { status: 400 });
      }
      const tool = await prisma.tool.findUnique({
        where: { id: toolId }
      });
      if (!tool) {
        return Response.json({ message: 'Sản phẩm tool không tồn tại.' }, { status: 404 });
      }
      orderId = `TL-${randomSuffix}`;
      totalAmount = tool.price;
      transferMessage = `VALKYRIE_TL_${randomSuffix}`;
      selectedToolId = tool.id;
      toolName = tool.name;
    }

    // Check unique transfer message availability in db (just in case)
    const existingOrder = await prisma.order.findUnique({
      where: { transferMessage }
    });
    if (existingOrder) {
      return Response.json({ message: 'Trùng mã giao dịch, vui lòng thử lại.' }, { status: 400 });
    }

    // Create Order in DB
    const order = await prisma.order.create({
      data: {
        id: orderId,
        userId: user.id,
        type,
        quantity: dbQuantity,
        toolId: selectedToolId,
        totalAmount,
        transferMessage,
        status: 'PENDING'
      }
    });

    // Generate VietQR payment details
    // Custom formatted VietQR payload: MB Bank (970422), STK: 0000000000000 (Replace with your actual STK in env or use default)
    const bankBin = '970422';
    const bankAccount = '123456789';
    const accountName = 'NGUYEN BAO HUY';
    const qrUrl = `https://api.vietqr.io/image/${bankBin}-${bankAccount}-qKj1B0z.jpg?accountName=${encodeURIComponent(accountName)}&amount=${totalAmount}&addInfo=${encodeURIComponent(transferMessage)}`;

    // Dispatch notification to Discord Bot
    let discordMsgId = null;
    try {
      discordMsgId = await sendOrderNotification(order, user.username, toolName);
      if (discordMsgId) {
        await prisma.order.update({
          where: { id: order.id },
          data: { discordMsgId }
        });
      }
    } catch (discordErr) {
      console.warn('[Discord Notification Failed]', discordErr.message);
    }

    // Log the transaction
    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'CREATE_ORDER',
        details: `Tạo đơn hàng ${orderId} thành công - Tổng tiền: ${totalAmount} VNĐ`
      }
    });

    return Response.json({
      message: 'Tạo đơn hàng thành công.',
      order: {
        ...order,
        qrUrl
      }
    }, { status: 201 });
  } catch (err) {
    console.error('[POST Order API Error]', err);
    return Response.json({ message: 'Tạo đơn hàng thất bại. Vui lòng thử lại.' }, { status: 500 });
  }
}
