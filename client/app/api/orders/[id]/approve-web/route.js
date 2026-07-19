import { promises as fs } from 'fs';
import path from 'path';
import prisma from '../../../../../lib/db';
import { verifyAuth, hasRole } from '../../../../../lib/auth';
import { updateOrderNotification } from '../../../../../lib/discord';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'tokens');

async function ensureDir(d) {
  try { await fs.access(d); } catch { await fs.mkdir(d, { recursive: true }); }
}

// POST /api/orders/[id]/approve-web
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

    let fileUrl = null;

    if (order.type === 'TOKEN') {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!file) return Response.json({ message: 'Vui lòng tải lên file Token (.txt).' }, { status: 400 });

      await ensureDir(UPLOADS_DIR);
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `tokens-${order.id}-${Date.now()}.txt`;
      await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer);
      fileUrl = `/uploads/tokens/${filename}`;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'APPROVED', fileUrl }
    });

    try {
      await updateOrderNotification(updated, order.user.username, 'APPROVED', order.tool?.name || '');
    } catch (e) { console.warn('[Discord] Update failed:', e.message); }

    await prisma.log.create({
      data: { userId: user.id, action: 'APPROVE_ORDER', details: `Duyệt đơn hàng: ${id}` }
    });

    return Response.json({ message: 'Duyệt đơn hàng thành công.', order: updated });
  } catch (err) {
    console.error('[Approve Web Error]', err);
    return Response.json({ message: 'Lỗi duyệt đơn hàng.' }, { status: 500 });
  }
}
