import prisma from '../../../lib/db';
import { verifyAuth, hasRole } from '../../../lib/auth';

// /api/admin/stats → alias for metrics
export async function GET(req) {
  try {
    const user = await verifyAuth(req);
    if (!user || !hasRole(user, ['ADMIN', 'SUPER_ADMIN'])) {
      return Response.json({ message: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const [totalUsers, totalTools, totalOrders, rawRevenue, recentLogs] = await prisma.$transaction([
      prisma.user.count(),
      prisma.tool.count(),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: 'APPROVED' } }),
      prisma.log.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { user: { select: { username: true } } } })
    ]);

    return Response.json({
      totalUsers,
      totalTools,
      totalOrders,
      totalRevenue: rawRevenue._sum.totalAmount || 0,
      recentLogs
    });
  } catch (err) {
    console.error('[Admin Stats Error]', err);
    return Response.json({ message: 'Lỗi tải thống kê.' }, { status: 500 });
  }
}
