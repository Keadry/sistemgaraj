import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { authLimiter } from '../middleware/rate-limit.js';

const router = Router();

router.post('/register', authLimiter, async (req, res) => {
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

router.post('/login', authLimiter, async (req, res) => {
  try {
    // `email` hâlâ okunuyor: kayıt sonrası otomatik giriş ve açık sekmede
    // duran eski istemciler o adla gönderiyor.
    const { identifier, email, password } = req.body;
    const trimmedIdentifier = String(identifier ?? email ?? '').trim();

    if (!trimmedIdentifier || !password) {
      res
        .status(400)
        .json({ error: 'E-posta veya kullanıcı adı ile şifre zorunludur.' });
      return;
    }

    // Kullanıcı adları `[a-zA-Z0-9_]` ile sınırlı (bkz. kayıt), yani "@"
    // içeren bir girdi kesin e-postadır — ayrım için tahmine gerek yok.
    const user = trimmedIdentifier.includes('@')
      ? await prisma.user.findUnique({ where: { email: trimmedIdentifier } })
      : await prisma.user.findFirst({
          // Kayıtta çakışma kontrolü büyük/küçük harfe duyarsız yapılıyor;
          // giriş duyarlı kalırsa "Ahmet" diye kaydolan "ahmet" yazarak
          // hesabına giremez.
          where: {
            username: { equals: trimmedIdentifier, mode: 'insensitive' },
          },
        });

    // İki durumda da aynı mesaj: ayrı mesajlar hangi hesapların var olduğunu
    // sayıp çıkarmayı mümkün kılar.
    if (!user) {
      res
        .status(401)
        .json({ error: 'E-posta/kullanıcı adı veya şifre hatalı.' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res
        .status(401)
        .json({ error: 'E-posta/kullanıcı adı veya şifre hatalı.' });
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
