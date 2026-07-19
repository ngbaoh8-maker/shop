export const runtime = 'nodejs';
import { promises as fs } from 'fs';
import path from 'path';
import prisma from '../../../../../lib/db';
import { verifyAuth, hasRole } from '../../../../../lib/auth';
import { updateOrderNotification } from '../../../../../lib/discord';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'tokens');

async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

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
      // Process token file upload
      const formData = await req.formData();
      const file = formData.get('file');

      if (!file) {
        return Response.json({ message: 'Vui lòng tải lên file Token (.txt).' }, { status: 400 });
      }

      await ensureDir(UPLOADS_DIR);
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const uniqueFilename = `tokens-${order.id}-${Date.now()}.txt`;
      const filePath = path.join(UPLOADS_DIR, uniqueFilename);
      await fs.writeFile(filePath, buffer);

      fileUrl = `/uploads/tokens/${uniqueFilename}`;
    }

    // Update order status in DB
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'APPROVED',
        fileUrl
      }
    });

    // Update Discord notification embed (remove buttons and show success status)
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
