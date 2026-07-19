import prisma from '../../../../lib/db';
import { verifyAuth } from '../../../../lib/auth';

export const runtime = 'nodejs';

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

    if (!order) return new Response('Không tìm thấy đơn hàng.', { status: 404 });

    // Ownership check
    if (order.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return new Response('Quyền truy cập bị từ chối.', { status: 403 });
    }

    if (order.status !== 'APPROVED') {
      return new Response('Đơn hàng chưa được duyệt.', { status: 400 });
    }

    let fileContent = null;
    let filename = `order-${order.id}.txt`;
    let mimeType = 'text/plain';

    const fileUrl = order.fileUrl || (order.type === 'TOOL' && order.tool?.fileUrl);

    if (!fileUrl) {
      return new Response('File chưa được thiết lập. Vui lòng liên hệ Admin.', { status: 404 });
    }

    // Handle base64 data URI stored in DB (new approach for Netlify serverless)
    if (fileUrl.startsWith('data:')) {
      const matches = fileUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) return new Response('Định dạng file lỗi.', { status: 500 });
      mimeType = matches[1] || 'application/octet-stream';
      fileContent = Buffer.from(matches[2], 'base64');

      if (order.type === 'TOKEN') filename = `tokens-${order.id}.txt`;
      else if (order.type === 'TOOL') filename = `tool-${order.tool?.name || order.id}.zip`;
    } else {
      // Legacy: it's a URL/path string — redirect or return error
      return Response.redirect(fileUrl, 302);
    }

    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'DOWNLOAD',
        details: `Tải xuống thành công đơn hàng: ${order.id}`
      }
    });

    return new Response(fileContent, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': fileContent.length.toString()
      }
    });
  } catch (err) {
    console.error('[Download API Error]', err);
    return new Response('Lỗi tải file: ' + err.message, { status: 500 });
  }
}
