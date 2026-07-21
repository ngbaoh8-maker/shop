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

    let fileUrl = null;

    if (order.type === 'TOKEN') {
      // Process token file upload — store as base64 data URI in DB (serverless compatible)
      const formData = await req.formData();
      const file = formData.get('file');

      if (!file) {
        return Response.json({ message: 'Vui lòng tải lên file Token (.txt).' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64Content = buffer.toString('base64');
      fileUrl = `data:text/plain;base64,${base64Content}`;
    } else if (order.type === 'TOOL' && order.tool) {
      // For tools: use the fileUrl stored in the Tool record
      fileUrl = order.tool.fileUrl || null;
    }

    // Update order status in DB
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'APPROVED',
        fileUrl
      }
    });

    // Update Discord notification embed
    try {
      const toolName = order.tool ? order.tool.name : '';
      await updateOrderNotification(updatedOrder, order.user.username, 'APPROVED', toolName);
    } catch (discordErr) {
      console.warn('[Discord Embed Update Failed]', discordErr.message);
    }

    // Log the approval action
    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'APPROVE_ORDER',
        details: `Duyệt đơn hàng thành công: ${order.id} (${order.type})`
      }
    });

    return Response.json({
      message: 'Duyệt đơn hàng thành công.',
      order: updatedOrder
    });
  } catch (err) {
    console.error('[Approve Order API Error]', err);
    return Response.json({ message: 'Lỗi phê duyệt đơn hàng. Vui lòng thử lại.' }, { status: 500 });
  }
}
