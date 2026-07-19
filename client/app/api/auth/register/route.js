import bcrypt from 'bcryptjs';
import prisma from '../../../lib/db';

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ message: 'Tên đăng nhập và mật khẩu là bắt buộc.' }, { status: 400 });
    }

    // Input validation
    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 32) {
      return Response.json({ message: 'Tên đăng nhập phải từ 3 đến 32 ký tự.' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return Response.json({ message: 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới.' }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ message: 'Mật khẩu phải có nhất 6 ký tự.' }, { status: 400 });
    }

    // Check availability
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername }
    });

    if (existingUser) {
      return Response.json({ message: 'Tên đăng nhập đã tồn tại.' }, { status: 400 });
    }

    // Determine role (first registered user gets SUPER_ADMIN role)
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'SUPER_ADMIN' : 'USER';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        password: hashedPassword,
        role
      }
    });

    // Logging action
    await prisma.log.create({
      data: {
        userId: newUser.id,
        action: 'REGISTER',
        details: `Đăng ký tài khoản thành công với vai trò ${role}`
      }
    });

    return Response.json({
      message: 'Đăng ký tài khoản thành công.',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role
      }
    }, { status: 201 });
  } catch (err) {
    console.error('[Register API Error]', err);
    return Response.json({ message: 'Đăng ký thất bại. Vui lòng thử lại.' }, { status: 500 });
  }
}
