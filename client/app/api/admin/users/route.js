export const runtime = 'nodejs';
import prisma from '../../../lib/db';
import { verifyAuth, hasRole } from '../../../lib/auth';

export async function GET(req) {
  try {
    const user = await verifyAuth(req);
    if (!user || !hasRole(user, ['ADMIN', 'SUPER_ADMIN'])) {
      return Response.json({ message: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return Response.json(users);
  } catch (err) {
    console.error('[Admin GET Users API Error]', err);
    return Response.json({ message: 'Lỗi tải danh sách người dùng.' }, { status: 500 });
  }
}
