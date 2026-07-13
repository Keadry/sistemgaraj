import { Router } from 'express';
import { prisma } from '../db.js';
import {
  requireAuth,
  requireModerator,
  requireAdmin,
  type AuthRequest,
} from '../middleware/auth.js';

const router = Router();

// ==============================
// KULLANICI LİSTESİ (moderatör+)
// ==============================
router.get('/users', requireAuth, requireModerator, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBanned: true,
        banReason: true,
        mutedUntil: true,
        createdAt: true,
      },
    });

    res.json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// KULLANICI DETAYI (yorumları + beğenileri) (moderatör+)
// ==============================
router.get('/users/:id', requireAuth, requireModerator, async (req, res) => {
  try {
    const targetUserId = req.params.id as string;

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBanned: true,
        banReason: true,
        mutedUntil: true,
        createdAt: true,
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { build: { select: { id: true, name: true } } },
        },
        likes: {
          orderBy: { createdAt: 'desc' },
          include: { build: { select: { id: true, name: true } } },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// TÜM YORUMLARI LİSTELE (moderatör+)
// ==============================
router.get('/comments', requireAuth, requireModerator, async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        build: { select: { id: true, name: true } },
      },
    });

    res.json({ comments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// YORUMU ONAYLA (moderatör+)
// ==============================
router.post(
  '/comments/:id/approve',
  requireAuth,
  requireModerator,
  async (req, res) => {
    try {
      const commentId = req.params.id as string;

      const comment = await prisma.comment.update({
        where: { id: commentId },
        data: { status: 'APPROVED' },
      });

      res.json({ message: 'Yorum onaylandı.', comment });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// YORUMU REDDET (moderatör+) — kalıcı olarak reddedilmiş sayılır, silinmez
// ==============================
router.post(
  '/comments/:id/reject',
  requireAuth,
  requireModerator,
  async (req, res) => {
    try {
      const commentId = req.params.id as string;

      const comment = await prisma.comment.update({
        where: { id: commentId },
        data: { status: 'REJECTED' },
      });

      res.json({ message: 'Yorum reddedildi.', comment });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// YORUM SİL (moderatör+)
// ==============================
router.delete(
  '/comments/:id',
  requireAuth,
  requireModerator,
  async (req, res) => {
    try {
      const commentId = req.params.id as string;
      await prisma.comment.delete({ where: { id: commentId } });
      res.json({ message: 'Yorum silindi.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// KULLANICIYI SUSTUR (moderatör+)
// ==============================
router.post(
  '/users/:id/mute',
  requireAuth,
  requireModerator,
  async (req, res) => {
    try {
      const targetUserId = req.params.id as string;
      const { hours, reason } = req.body;

      if (!hours || hours <= 0) {
        res.status(400).json({ error: 'Geçerli bir saat değeri gir.' });
        return;
      }

      const mutedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

      const user = await prisma.user.update({
        where: { id: targetUserId },
        data: { mutedUntil, banReason: reason || null },
      });

      res.json({ message: `Kullanıcı ${hours} saat susturuldu.`, user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// SUSTURMAYI KALDIR (moderatör+)
// ==============================
router.post(
  '/users/:id/unmute',
  requireAuth,
  requireModerator,
  async (req, res) => {
    try {
      const targetUserId = req.params.id as string;

      const user = await prisma.user.update({
        where: { id: targetUserId },
        data: { mutedUntil: null },
      });

      res.json({ message: 'Susturma kaldırıldı.', user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// KULLANICIYI BANLA (sadece admin)
// ==============================
router.post('/users/:id/ban', requireAuth, requireAdmin, async (req, res) => {
  try {
    const targetUserId = req.params.id as string;
    const { reason } = req.body;

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { isBanned: true, banReason: reason || 'Belirtilmedi' },
    });

    res.json({ message: 'Kullanıcı banlandı.', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// BANI KALDIR (sadece admin)
// ==============================
router.post('/users/:id/unban', requireAuth, requireAdmin, async (req, res) => {
  try {
    const targetUserId = req.params.id as string;

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { isBanned: false, banReason: null },
    });

    res.json({ message: 'Ban kaldırıldı.', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// KULLANICI ROLÜNÜ DEĞİŞTİR (sadece admin)
// ==============================
router.patch('/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const targetUserId = req.params.id as string;
    const { role } = req.body;

    if (!['USER', 'MODERATOR', 'ADMIN'].includes(role)) {
      res.status(400).json({ error: 'Geçersiz rol.' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
    });

    res.json({ message: 'Rol güncellendi.', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// SİSTEMİ FEATURED YAP / KALDIR (sadece admin)
// ==============================
router.patch(
  '/builds/:id/feature',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const buildId = req.params.id as string;

      const build = await prisma.build.findUnique({
        where: { id: buildId },
      });

      if (!build) {
        res.status(404).json({ error: 'Sistem bulunamadı.' });
        return;
      }

      const updated = await prisma.build.update({
        where: { id: buildId },
        data: { isFeatured: !build.isFeatured },
      });

      res.json({
        message: updated.isFeatured
          ? 'Sistem öne çıkarıldı.'
          : 'Sistem öne çıkarmadan kaldırıldı.',
        build: updated,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

export default router;
