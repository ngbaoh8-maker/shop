import prisma from '../../../../../lib/db';
import { verifyAuth, hasRole } from '../../../../../lib/auth';
import { updateOrderNotification } from '../../../../../lib/discord';
export const runtime = 'nodejs';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const user = await verifyAuth(req);
    if (!user || !hasRole(user, ['ADMIN', 'SUPER_ADMIN'])) {
      return Response.json({ message: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: true, tool: true }
    });

    if (!order) {
      return Response.json({ message: 'Không tìm thấy đơn hàng.' }, { status: 404 });
    }

    if (order.status !== 'PENDING') {
      return Response.json({ message: 'Đơn hàng này đã được xử lý từ trước.' }, { status: 400 });
    }

    // Update order status in DB
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'REJECTED'
      }
    });

    // Update Discord notification embed (remove buttons and show rejected status)
    try {
      const toolName = order.tool ? order.tool.name : '';
      await updateOrderNotification(updatedOrder, order.user.username, 'REJECTED', toolName);
    } catch (discordErr) {
      console.warn('[Discord Embed Update Failed]', discordErr.message);
    }

    // Log the rejection action
    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'REJECT_ORDER',
        details: `Từ chối đơn hàng thành công: ${order.id} (${order.type})`
      }
    });

    return Response.json({
      message: 'Từ chối đơn hàng thành công.',
      order: updatedOrder
    });
  } catch (err) {
    console.error('[Reject Order API Error]', err);
    return Response.json({ message: 'Lỗi từ chối đơn hàng. Vui lòng thử lại.' }, { status: 500 });
  }
}
