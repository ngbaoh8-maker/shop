import prisma from '../../lib/db';
import { verifyAuth, hasRole } from '../../lib/auth';
export const runtime = 'nodejs';

// GET: List all tools
export async function GET(req) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return Response.json({ message: 'Bạn cần đăng nhập để xem danh sách tools.' }, { status: 401 });
    }

    const tools = await prisma.tool.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return Response.json(tools);
  } catch (err) {
    console.error('[GET Tools API Error]', err);
    return Response.json({ message: 'Lỗi tải danh sách tools.' }, { status: 500 });
  }
}

// POST: Add a new tool (Admin / Super Admin) — store file as base64 in DB
export async function POST(req) {
  try {
    const user = await verifyAuth(req);
    if (!user || !hasRole(user, ['ADMIN', 'SUPER_ADMIN'])) {
      return Response.json({ message: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const formData = await req.formData();
    const name = formData.get('name');
    const description = formData.get('description');
    const priceInput = formData.get('price');
    const file = formData.get('file');

    if (!name || !description || !priceInput || !file) {
      return Response.json({ message: 'Vui lòng cung cấp đầy đủ thông tin: name, description, price, và file.' }, { status: 400 });
    }

    const price = parseFloat(priceInput);
    if (isNaN(price) || price < 0) {
      return Response.json({ message: 'Giá tiền không hợp lệ.' }, { status: 400 });
    }

    // Store file as base64 data URI in DB (serverless compatible)
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Content = buffer.toString('base64');
    const mimeType = file.type || 'application/octet-stream';
    const fileUrl = `data:${mimeType};base64,${base64Content}`;

    const newTool = await prisma.tool.create({
      data: {
        name,
        description,
        price,
        fileUrl
      }
    });

    // Logging action
    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'CREATE_TOOL',
        details: `Tạo sản phẩm tool mới: ${name} - Giá: ${price} VNĐ`
      }
    });

    return Response.json({
      message: 'Thêm sản phẩm tool thành công.',
      tool: newTool
    }, { status: 201 });
  } catch (err) {
    console.error('[POST Tool API Error]', err);
    return Response.json({ message: 'Thêm tool thất bại. Vui lòng thử lại.' }, { status: 500 });
  }
}
