import jwt from 'jsonwebtoken';
import prisma from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-token-key-2026';

export async function verifyAuth(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch user details including status
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user || user.status === 'LOCKED') return null;

    return user;
  } catch (err) {
    console.error('[verifyAuth Error]', err.message);
    return null;
  }
}

export function hasRole(user, allowedRoles) {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}
