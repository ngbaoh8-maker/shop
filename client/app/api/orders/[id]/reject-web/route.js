import prisma from '../../../../lib/db';
import { verifyAuth, hasRole } from '../../../../lib/auth';
import { updateOrderNotification } from '../../../../lib/discord';
export const runtime = 'nodejs';

// POST /api/orders/[id]/reject-web
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const user = await verifyAuth(req);
    if (!user || !hasRole(user, ['ADMIN', 'SUPER_ADMIN'])) {
      return Response.json({ message: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const order = await prisma.order.findUnique({ where: { id }, include: { user: true, tool: true } });
    if (!order) return Response.json({ message: 'Không tìm thấy đơn hàng.' }, { status: 404 });
    if (order.status !== 'PENDING') return Response.json({ message: 'Đơn hàng đã được xử lý.' }, { status: 400 });

    const updated = await prisma.order.update({ where: { id }, data: { status: 'REJECTED' } });

    try {
      await updateOrderNotification(updated, order.user.username, 'REJECTED', order.tool?.name || '');
    } catch (e) { console.warn('[Discord] Update failed:', e.message); }

    await prisma.log.create({
      data: { userId: user.id, action: 'REJECT_ORDER', details: `Từ chối đơn hàng: ${id}` }
    });

    return Response.json({ message: 'Từ chối đơn hàng thành công.', order: updated });
  } catch (err) {
    console.error('[Reject Web Error]', err);
    return Response.json({ message: 'Lỗi từ chối đơn hàng.' }, { status: 500 });
  }
}
