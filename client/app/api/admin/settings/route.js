export const runtime = 'nodejs';
import prisma from '../../../lib/db';
import { verifyAuth, hasRole } from '../../../lib/auth';

// GET: Retrieve all system settings
export async function GET(req) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return Response.json({ message: 'Bạn chưa đăng nhập.' }, { status: 401 });
    }

    const settings = await prisma.setting.findMany();
    
    // Map list to key-value object for easy frontend usage
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    return Response.json(settingsMap);
  } catch (err) {
    console.error('[GET Settings API Error]', err);
    return Response.json({ message: 'Lỗi tải thiết lập hệ thống.' }, { status: 500 });
  }
}

// PUT: Save/update a setting
export async function PUT(req) {
  try {
    const user = await verifyAuth(req);
    if (!user || !hasRole(user, ['ADMIN', 'SUPER_ADMIN'])) {
      return Response.json({ message: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const settingsData = await req.json(); // Expected: { key: value, ... }

    // Save key-values sequentially or via transaction
    const updatePromises = Object.entries(settingsData).map(([key, value]) => {
      return prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
    });

    await Promise.all(updatePromises);

    // Logging action
    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'UPDATE_SETTINGS',
        details: `Cập nhật cấu hình hệ thống: ${Object.keys(settingsData).join(', ')}`
      }
    });

    return Response.json({ message: 'Lưu cấu hình hệ thống thành công.' });
  } catch (err) {
    console.error('[PUT Settings API Error]', err);
    return Response.json({ message: 'Lỗi lưu thiết lập hệ thống.' }, { status: 500 });
  }
}
