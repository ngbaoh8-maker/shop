import prisma from '../../../../../lib/db';
import { verifyAuth, hasRole } from '../../../../../lib/auth';
export const runtime = 'nodejs';

// POST /api/admin/users/[id]/role
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const user = await verifyAuth(req);
    if (!user || !hasRole(user, ['SUPER_ADMIN'])) {
      return Response.json({ message: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }
    if (user.id === id) {
      return Response.json({ message: 'Không thể thay đổi vai trò của chính mình.' }, { status: 400 });
    }

    const { role } = await req.json();
    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return Response.json({ message: 'Vai trò không hợp lệ.' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return Response.json({ message: 'Không tìm thấy người dùng.' }, { status: 404 });

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, username: true, role: true, status: true }
    });

    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'UPDATE_USER',
        details: `Cập nhật vai trò ${target.username} → ${role}`
      }
    });

    return Response.json({ message: 'Cập nhật vai trò thành công.', user: updated });
  } catch (err) {
    console.error('[Update Role Error]', err);
    return Response.json({ message: 'Lỗi cập nhật vai trò.' }, { status: 500 });
  }
}
