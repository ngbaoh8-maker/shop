import prisma from '../../../../lib/db';
import { verifyAuth, hasRole } from '../../../../lib/auth';
export const runtime = 'nodejs';

// PUT: Modify user roles or lock/unlock status
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const user = await verifyAuth(req);
    if (!user || !hasRole(user, ['SUPER_ADMIN'])) {
      return Response.json({ message: 'Quyền quản trị cấp cao bị từ chối.' }, { status: 403 });
    }

    if (user.id === id) {
      return Response.json({ message: 'Bạn không thể tự thay đổi vai trò hoặc khóa tài khoản của chính mình.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return Response.json({ message: 'Không tìm thấy người dùng cần chỉnh sửa.' }, { status: 404 });
    }

    const { role, status } = await req.json();
    const updateData = {};

    if (role) {
      if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        return Response.json({ message: 'Vai trò cập nhật không hợp lệ.' }, { status: 400 });
      }
      updateData.role = role;
    }

    if (status) {
      if (!['ACTIVE', 'LOCKED'].includes(status)) {
        return Response.json({ message: 'Trạng thái tài khoản không hợp lệ.' }, { status: 400 });
      }
      updateData.status = status;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, role: true, status: true }
    });

    // Logging action
    const actionLabel = role ? 'Cập nhật vai trò' : 'Thay đổi trạng thái';
    const detailLabel = role ? `Vai trò mới: ${role}` : `Trạng thái mới: ${status}`;
    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'UPDATE_USER',
        details: `${actionLabel} cho user ${targetUser.username}. ${detailLabel}`
      }
    });

    return Response.json({
      message: 'Cập nhật tài khoản người dùng thành công.',
      user: updatedUser
    });
  } catch (err) {
    console.error('[Admin PUT User API Error]', err);
    return Response.json({ message: 'Cập nhật tài khoản thất bại.' }, { status: 500 });
  }
}

// DELETE: Remove user account (Super Admin only)
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const user = await verifyAuth(req);
    if (!user || !hasRole(user, ['SUPER_ADMIN'])) {
      return Response.json({ message: 'Quyền quản trị cấp cao bị từ chối.' }, { status: 403 });
    }

    if (user.id === id) {
      return Response.json({ message: 'Bạn không thể tự xóa tài khoản của chính mình.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return Response.json({ message: 'Không tìm thấy người dùng cần xóa.' }, { status: 404 });
    }

    // Delete user (Prisma cascade delete if set up, otherwise remove user)
    // NOTE: Order and Log references might require handling if not using cascade delete
    // In our SQLite/Postgres schema, we don't have constraints blocking delete or we can delete associated items first
    await prisma.$transaction([
      prisma.log.deleteMany({ where: { userId: id } }),
      prisma.order.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } })
    ]);

    // Logging action
    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'DELETE_USER',
        details: `Xóa vĩnh viễn người dùng: ${targetUser.username}`
      }
    });

    return Response.json({ message: 'Xóa tài khoản người dùng thành công.' });
  } catch (err) {
    console.error('[Admin DELETE User API Error]', err);
    return Response.json({ message: 'Xóa tài khoản thất bại.' }, { status: 500 });
  }
}
