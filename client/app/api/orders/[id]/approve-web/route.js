import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/db';
import { verifyAuth, hasRole } from '../../../../../lib/auth';
import { updateOrderNotification } from '../../../../../lib/discord';

// Force Node.js runtime (NOT Edge) because we use Prisma + fs
export const runtime = 'nodejs';

// POST /api/orders/[id]/approve-web
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const user = await verifyAuth(req);
    if (!user || !hasRole(user, ['ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ message: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: true, tool: true }
    });
    if (!order) return NextResponse.json({ message: 'Không tìm thấy đơn hàng.' }, { status: 404 });
    if (order.status !== 'PENDING') return NextResponse.json({ message: 'Đơn hàng đã được xử lý.' }, { status: 400 });

    let fileDataUrl = null;

    if (order.type === 'TOKEN') {
      // Parse multipart form data
      const formData = await req.formData();
      const file = formData.get('file');

      if (!file) {
        return NextResponse.json({ message: 'Vui lòng tải lên file Token (.txt).' }, { status: 400 });
      }

      // Read file content and store as base64 data URI in DB
      // This works on Netlify serverless (no filesystem dependency)
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64Content = buffer.toString('base64');
      fileDataUrl = `data:text/plain;base64,${base64Content}`;
    } else if (order.type === 'TOOL' && order.tool) {
      // For tools: use the file path stored in the Tool record
      fileDataUrl = order.tool.fileUrl || null;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'APPROVED', fileUrl: fileDataUrl }
    });

    try {
      await updateOrderNotification(updated, order.user.username, 'APPROVED', order.tool?.name || '');
    } catch (e) {
      console.warn('[Discord] Update failed:', e.message);
    }

    await prisma.log.create({
      data: { userId: user.id, action: 'APPROVE_ORDER', details: `Duyệt đơn hàng: ${id}` }
    });

    return NextResponse.json({ message: 'Duyệt đơn hàng thành công.', order: updated });
  } catch (err) {
    console.error('[Approve Web Error]', err);
    return NextResponse.json({ message: 'Lỗi duyệt đơn hàng: ' + err.message }, { status: 500 });
  }
}
