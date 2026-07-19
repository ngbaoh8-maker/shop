import { promises as fs } from 'fs';
import path from 'path';
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

    // Try deleting physical file
    if (tool.fileUrl) {
      const filePath = path.join(process.cwd(), 'public', tool.fileUrl);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn(`[File Delete Warning] Could not remove tool file ${filePath}:`, err.message);
      }
    }

    // Delete tool in db
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
