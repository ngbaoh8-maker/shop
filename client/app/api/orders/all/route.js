import prisma from '../../../lib/db';
import { verifyAuth, hasRole } from '../../../lib/auth';

// /api/orders/all → all orders for admins
export async function GET(req) {
  try {
    const user = await verifyAuth(req);
    if (!user || !hasRole(user, ['ADMIN', 'SUPER_ADMIN'])) {
      return Response.json({ message: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const orders = await prisma.order.findMany({
      include: { user: { select: { username: true } }, tool: true },
      orderBy: { createdAt: 'desc' }
    });

    return Response.json(orders);
  } catch (err) {
    console.error('[Orders All Error]', err);
    return Response.json({ message: 'Lỗi tải đơn hàng.' }, { status: 500 });
  }
}
