import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

// Express'in Request tipine kendi userId alanımızı ekliyoruz
export interface AuthRequest extends Request {
  userId?: string;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Yetkilendirme token'ı bulunamadı." });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({ error: 'Kullanıcı bulunamadı.' });
    }

    if (user.isBanned) {
      return res.status(403).json({
        error: 'Hesabın askıya alındı.',
        reason: user.banReason,
      });
    }

    if (user.mutedUntil && user.mutedUntil > new Date()) {
      return res.status(403).json({
        error: 'Geçici olarak susturuldun.',
        mutedUntil: user.mutedUntil,
      });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ error: 'Geçersiz veya süresi dolmuş token.' });
  }
}

export async function requireModerator(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user || (user.role !== 'MODERATOR' && user.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Bu işlem için yetkin yok.' });
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
}

export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user || user.role !== 'ADMIN') {
      return res
        .status(403)
        .json({ error: 'Bu işlem sadece adminler içindir.' });
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
}

export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
    };
    req.userId = decoded.userId;
  } catch {
    // Token geçersizse sessizce yok say
  }

  next();
}
