import prisma from '../../../../../lib/db';
import { verifyAuth, hasRole } from '../../../../../lib/auth';

// POST /api/admin/users/[id]/toggle-lock
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const user = await verifyAuth(req);
    if (!user || !hasRole(user, ['SUPER_ADMIN'])) {
      return Response.json({ message: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }
    if (user.id === id) {
      return Response.json({ message: 'Không thể khóa tài khoản của chính mình.' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return Response.json({ message: 'Không tìm thấy người dùng.' }, { status: 404 });

    const newStatus = target.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    const updated = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, username: true, role: true, status: true }
    });

    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'UPDATE_USER',
        details: `${newStatus === 'LOCKED' ? 'Khóa' : 'Mở khóa'} tài khoản: ${target.username}`
      }
    });

    return Response.json({ message: `Tài khoản đã được ${newStatus === 'LOCKED' ? 'khóa' : 'mở khóa'}.`, user: updated });
  } catch (err) {
    console.error('[Toggle Lock Error]', err);
    return Response.json({ message: 'Lỗi thay đổi trạng thái tài khoản.' }, { status: 500 });
  }
}
