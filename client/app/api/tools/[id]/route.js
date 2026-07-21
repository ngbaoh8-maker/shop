import prisma from '../../../lib/db';
import { verifyAuth, hasRole } from '../../../lib/auth';
export const runtime = 'nodejs';

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const user = await verifyAuth(req);
    if (!user || !hasRole(user, ['ADMIN', 'SUPER_ADMIN'])) {
      return Response.json({ message: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const tool = await prisma.tool.findUnique({
      where: { id }
    });

    if (!tool) {
      return Response.json({ message: 'Không tìm thấy sản phẩm tool.' }, { status: 404 });
    }

    // Delete tool in db (file is stored as base64 in DB, no filesystem cleanup needed)
    await prisma.tool.delete({
      where: { id }
    });

    // Logging action
    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'DELETE_TOOL',
        details: `Xóa sản phẩm tool: ${tool.name}`
      }
    });

    return Response.json({ message: 'Xóa sản phẩm tool thành công.' });
  } catch (err) {
    console.error('[DELETE Tool API Error]', err);
    return Response.json({ message: 'Lỗi xóa tool. Vui lòng thử lại.' }, { status: 500 });
  }
}
