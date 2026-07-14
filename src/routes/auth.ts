import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      res
        .status(400)
        .json({ error: 'E-posta, şifre ve kullanıcı adı zorunludur.' });
      return;
    }

    const trimmedUsername = String(username).trim();

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) {
      res.status(400).json({
        error:
          'Kullanıcı adı 3-20 karakter olmalı, sadece harf, rakam ve alt çizgi içerebilir.',
      });
      return;
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      res.status(409).json({ error: 'Bu e-posta zaten kayıtlı.' });
      return;
    }

    const existingUsername = await prisma.user.findFirst({
      where: { username: { equals: trimmedUsername, mode: 'insensitive' } },
    });
    if (existingUsername) {
      res.status(409).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username: trimmedUsername,
      },
    });

    res.status(201).json({
      message: 'Kayıt başarılı',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'E-posta ve şifre zorunludur.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' },
    );

    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

export default router;
