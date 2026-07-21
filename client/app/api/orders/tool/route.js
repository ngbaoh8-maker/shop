import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '../../../lib/db';
import { verifyAuth } from '../../../lib/auth';
import { sendOrderNotification } from '../../../lib/discord';
export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ message: 'Bạn chưa đăng nhập.' }, { status: 401 });
    }

    const { toolId } = await req.json();
    if (!toolId) {
      return NextResponse.json({ message: 'Vui lòng chọn tool cần mua.' }, { status: 400 });
    }

    const tool = await prisma.tool.findUnique({ where: { id: toolId } });
    if (!tool) {
      return NextResponse.json({ message: 'Sản phẩm tool không tồn tại.' }, { status: 404 });
    }

    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const orderId = `TL-${randomSuffix}`;
    const totalAmount = tool.price;
    const transferMessage = `VALKYRIE_TL_${randomSuffix}`;

    // Check unique transfer message
    const existing = await prisma.order.findUnique({ where: { transferMessage } });
    if (existing) {
      return NextResponse.json({ message: 'Trùng mã giao dịch, vui lòng thử lại.' }, { status: 400 });
    }

    const order = await prisma.order.create({
      data: {
        id: orderId,
        userId: user.id,
        type: 'TOOL',
        quantity: 1,
        toolId: tool.id,
        totalAmount,
        transferMessage,
        status: 'PENDING'
      }
    });

    // Generate VietQR
    const bankBin = process.env.BANK_BIN || '970422';
    const bankAccount = process.env.BANK_ACCOUNT || '123456789';
    const accountName = process.env.BANK_ACCOUNT_NAME || 'NGUYEN BAO HUY';
    const qrUrl = `https://api.vietqr.io/image/${bankBin}-${bankAccount}-qKj1B0z.jpg?accountName=${encodeURIComponent(accountName)}&amount=${totalAmount}&addInfo=${encodeURIComponent(transferMessage)}`;

    // Discord notification (non-blocking)
    try {
      const discordMsgId = await sendOrderNotification(order, user.username, tool.name);
      if (discordMsgId) {
        await prisma.order.update({ where: { id: order.id }, data: { discordMsgId } });
      }
    } catch (e) {
      console.warn('[Discord] Notification failed:', e.message);
    }

    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'CREATE_ORDER',
        details: `Tạo đơn Tool ${orderId} - ${tool.name} - ${totalAmount} VNĐ`
      }
    });

    return NextResponse.json({
      message: 'Tạo đơn hàng thành công.',
      order: { ...order, qrUrl },
      bankDetails: {
        bankName: 'MB Bank (Ngân Hàng Quân Đội)',
        accountNo: bankAccount,
        accountName: accountName,
        amount: totalAmount,
        message: transferMessage
      }
    }, { status: 201 });
  } catch (err) {
    console.error('[Tool Order Error]', err);
    return NextResponse.json({ message: 'Tạo đơn hàng thất bại. Vui lòng thử lại.' }, { status: 500 });
  }
}
