import { promises as fs } from 'fs';
import path from 'path';
import prisma from '../../../../lib/db';
import { verifyAuth } from '../../../../lib/auth';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const user = await verifyAuth(req);
    if (!user) {
      return new Response('Bạn chưa đăng nhập.', { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { tool: true }
    });

    if (!order) {
      return new Response('Không tìm thấy đơn hàng.', { status: 404 });
    }

    // Ownership check
    if (order.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return new Response('Quyền truy cập bị từ chối.', { status: 403 });
    }

    if (order.status !== 'APPROVED') {
      return new Response('Đơn hàng chưa được thanh toán thành công hoặc chưa được duyệt.', { status: 400 });
    }

    let relativeFileUrl = order.fileUrl;
    // If it's a tool download, resolve from tool schema if not set on order directly
    if (!relativeFileUrl && order.type === 'TOOL' && order.tool) {
      relativeFileUrl = order.tool.fileUrl;
    }

    if (!relativeFileUrl) {
      return new Response('Tài nguyên tải về chưa được thiết lập cho đơn hàng này. Vui lòng liên hệ Admin.', { status: 404 });
    }

    // Resolve absolute path safely
    let absoluteFilePath = '';
    if (relativeFileUrl.startsWith('/')) {
      // Relative web path inside public folder
      absoluteFilePath = path.join(process.cwd(), 'public', relativeFileUrl);
    } else {
      // Relative file path from project root
      absoluteFilePath = path.join(process.cwd(), relativeFileUrl);
    }

    try {
      await fs.access(absoluteFilePath);
    } catch {
      // Try resolving relative to server path if migrating from legacy folder structure
      const legacyPath = path.join(process.cwd(), '..', 'server', relativeFileUrl);
      try {
        await fs.access(legacyPath);
        absoluteFilePath = legacyPath;
      } catch {
        return new Response('Không tìm thấy file trên máy chủ. Vui lòng liên hệ Admin.', { status: 404 });
      }
    }

    const fileBuffer = await fs.readFile(absoluteFilePath);
    const filename = path.basename(absoluteFilePath);

    // Logging action
    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'DOWNLOAD',
        details: `Tải xuống tài nguyên thành công cho đơn hàng: ${order.id}`
      }
    });

    // Stream download response headers
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': fileBuffer.length.toString()
      }
    });
  } catch (err) {
    console.error('[Download API Error]', err);
    return new Response('Lỗi tải file hệ thống.', { status: 500 });
  }
}
