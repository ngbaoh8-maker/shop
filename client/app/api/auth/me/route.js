export const runtime = 'nodejs';
import { verifyAuth } from '../../../lib/auth';

export async function GET(req) {
  try {
    const user = await verifyAuth(req);

    if (!user) {
      return Response.json({ message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' }, { status: 401 });
    }

    return Response.json({
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error('[Verify Me API Error]', err);
    return Response.json({ message: 'Lỗi xác thực phiên đăng nhập.' }, { status: 500 });
  }
}
