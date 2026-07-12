import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Express'in Request tipine kendi userId alanımızı ekliyoruz
export interface AuthRequest extends Request {
  userId?: string;
}

export function requireAuth(
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
    req.userId = decoded.userId;
    next(); // Her şey yolunda, isteğin devam etmesine izin ver
  } catch (error) {
    return res
      .status(401)
      .json({ error: 'Geçersiz veya süresi dolmuş token.' });
  }
}
