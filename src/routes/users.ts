import { Router } from 'express';
import { prisma } from '../db.js';
import { upload } from '../upload.js';
import {
  requireAuth,
  optionalAuth,
  type AuthRequest,
} from '../middleware/auth.js';
const router = Router();

router.get('/:username', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const username = req.params.username as string;

    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        coverUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }

    const isOwner = req.userId === user.id;

    const builds = await prisma.build.findMany({
      where: {
        userId: user.id,
        ...(isOwner ? {} : { isPublic: true, reviewStatus: 'APPROVED' }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true } },
        components: { include: { component: true } },
        likes: true,
        comments: { where: { status: 'APPROVED' } },
        images: { where: { status: 'APPROVED' }, orderBy: { order: 'asc' } },
      },
    });

    res.json({ user, builds, isOwner });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// AVATAR GÜNCELLE (sadece kendi hesabı)
// ==============================
router.post(
  '/me/avatar',
  requireAuth,
  upload.single('avatar'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Görsel bulunamadı.' });
        return;
      }

      const user = await prisma.user.update({
        where: { id: req.userId! },
        data: { avatarUrl: `/uploads/${req.file.filename}` },
      });

      res.json({
        message: 'Profil resmi güncellendi.',
        avatarUrl: user.avatarUrl,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// KAPAK FOTOĞRAFI GÜNCELLE (sadece kendi hesabı)
// ==============================
router.post(
  '/me/cover',
  requireAuth,
  upload.single('cover'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Görsel bulunamadı.' });
        return;
      }

      const user = await prisma.user.update({
        where: { id: req.userId! },
        data: { coverUrl: `/uploads/${req.file.filename}` },
      });

      res.json({
        message: 'Kapak fotoğrafı güncellendi.',
        coverUrl: user.coverUrl,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

export default router;
