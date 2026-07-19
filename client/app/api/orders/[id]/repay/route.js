import prisma from '../../../../lib/db';
import { verifyAuth } from '../../../../lib/auth';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const user = await verifyAuth(req);
    if (!user) {
      return Response.json({ message: 'Bạn chưa đăng nhập.' }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { tool: true }
    });

    if (!order) {
      return Response.json({ message: 'Không tìm thấy đơn hàng.' }, { status: 404 });
    }

    // Authorization check
    if (order.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return Response.json({ message: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    if (order.status !== 'PENDING') {
      return Response.json({ message: 'Đơn hàng này không còn ở trạng thái chờ thanh toán.' }, { status: 400 });
    }

    // Re-generate VietQR payload
    const bankBin = '970422';
    const bankAccount = '123456789';
    const accountName = 'NGUYEN BAO HUY';
    const qrUrl = `https://api.vietqr.io/image/${bankBin}-${bankAccount}-qKj1B0z.jpg?accountName=${encodeURIComponent(accountName)}&amount=${order.totalAmount}&addInfo=${encodeURIComponent(order.transferMessage)}`;

    return Response.json({
      message: 'Lấy thông tin thanh toán thành công.',
      qrUrl,
      order
    });
  } catch (err) {
    console.error('[Repay API Error]', err);
    return Response.json({ message: 'Lỗi lấy thông tin thanh toán.' }, { status: 500 });
  }
}
