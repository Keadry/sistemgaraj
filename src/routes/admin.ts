import { Router } from 'express';
import { prisma } from '../db.js';
import { deleteImages } from '../storage.js';
import {
  requireAuth,
  requireModerator,
  requireAdmin,
} from '../middleware/auth.js';
import { applyEditRequestChanges } from '../services/buildEdits.js';
import { createNotification } from '../services/notifications.js';
import type { NotificationType } from '../generated/prisma/client.js';

const router = Router();

/**
 * Moderasyon sonucunu sistemin sahibine bildirir.
 *
 * `actorId` bilerek verilmiyor: kararı bir kullanıcı değil moderasyon
 * veriyor. Hangi moderatörün baktığını sahibine göstermek, kişisel bir
 * anlaşmazlığa dönüşmesine açık kapı bırakırdı.
 */
async function notifyBuildOwner(buildId: string, type: NotificationType) {
  const build = await prisma.build.findUnique({
    where: { id: buildId },
    select: { userId: true },
  });
  if (!build) return;

  await createNotification({ userId: build.userId, type, buildId });
}


// ==============================
// KULLANICI LİSTESİ (moderatör+)
// ==============================
router.get('/users', requireAuth, requireModerator, async (req, res) => {
  try {
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : undefined;
    const offset = req.query.offset
      ? parseInt(req.query.offset as string, 10)
      : 0;
    const search =
      typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const where: any = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: search ? 0 : offset,
      ...(limit ? { take: limit } : {}),
      select: {
        id: true,
        email: true,
        username: true,
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
        username: true,
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
// KULLANICI ADINI DEĞİŞTİR (sadece admin)
// ==============================
router.patch(
  '/users/:id/username',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const targetUserId = req.params.id as string;
      const { username } = req.body;

      if (!username || typeof username !== 'string') {
        res.status(400).json({ error: 'Geçerli bir kullanıcı adı gir.' });
        return;
      }

      const trimmed = username.trim();

      if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmed)) {
        res.status(400).json({
          error:
            'Kullanıcı adı 3-20 karakter olmalı, sadece harf, rakam ve alt çizgi içerebilir.',
        });
        return;
      }

      const existing = await prisma.user.findFirst({
        where: {
          username: { equals: trimmed, mode: 'insensitive' },
          id: { not: targetUserId },
        },
      });

      if (existing) {
        res.status(409).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
        return;
      }

      const user = await prisma.user.update({
        where: { id: targetUserId },
        data: { username: trimmed },
      });

      res.json({ message: 'Kullanıcı adı güncellendi.', user });
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
// TÜM YORUMLARI LİSTELE (moderatör+)
// ==============================
router.get('/comments', requireAuth, requireModerator, async (req, res) => {
  try {
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : undefined;
    const offset = req.query.offset
      ? parseInt(req.query.offset as string, 10)
      : 0;
    const search =
      typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const where: any = search
      ? {
          OR: [
            { content: { contains: search, mode: 'insensitive' } },
            { user: { username: { contains: search, mode: 'insensitive' } } },
            { build: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const comments = await prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: search ? 0 : offset,
      ...(limit ? { take: limit } : {}),
      include: {
        user: { select: { id: true, username: true, email: true } },
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
// YORUMU REDDET (moderatör+)
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

// ==============================
// YENİ SİSTEM ONAYLARI: Görsel içeren, ilk kez oluşturulmuş sistemler
// ==============================
router.get('/new-builds', requireAuth, requireModerator, async (req, res) => {
  try {
    const builds = await prisma.build.findMany({
      where: { reviewStatus: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true } },
        components: { include: { component: true } },
        images: true,
      },
    });

    res.json({ builds });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// YENİ SİSTEMİ ONAYLA (moderatör+)
// ==============================
router.post(
  '/new-builds/:id/approve',
  requireAuth,
  requireModerator,
  async (req, res) => {
    try {
      const buildId = req.params.id as string;

      await prisma.$transaction([
        prisma.buildImage.updateMany({
          where: { buildId },
          data: { status: 'APPROVED' },
        }),
        prisma.build.update({
          where: { id: buildId },
          data: { reviewStatus: 'APPROVED' },
        }),
      ]);

      await notifyBuildOwner(buildId, 'BUILD_APPROVED');

      res.json({ message: 'Sistem onaylandı ve yayınlandı.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// YENİ SİSTEMİ REDDET (moderatör+)
// ==============================
router.post(
  '/new-builds/:id/reject',
  requireAuth,
  requireModerator,
  async (req, res) => {
    try {
      const buildId = req.params.id as string;

      const images = await prisma.buildImage.findMany({ where: { buildId } });
      await deleteImages(images.map((img) => img.url));

      await prisma.$transaction([
        prisma.buildImage.deleteMany({ where: { buildId } }),
        prisma.build.update({
          where: { id: buildId },
          data: { reviewStatus: 'REJECTED' },
        }),
      ]);

      await notifyBuildOwner(buildId, 'BUILD_REJECTED');

      res.json({ message: 'Sistem reddedildi, görseller silindi.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// DÜZENLEME İSTEKLERİ: Onay bekleyenleri listele (moderatör+)
// ==============================
router.get(
  '/edit-requests',
  requireAuth,
  requireModerator,
  async (req, res) => {
    try {
      const requests = await prisma.buildEditRequest.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: {
          images: true,
          notes: true,
          build: {
            include: {
              user: { select: { id: true, username: true } },
              components: { include: { component: true } },
            },
          },
        },
      });

      res.json({ requests });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// DÜZENLEME İSTEĞİNİ ONAYLA (moderatör+)
// ==============================
router.post(
  '/edit-requests/:id/approve',
  requireAuth,
  requireModerator,
  async (req, res) => {
    try {
      const requestId = req.params.id as string;

      const editRequest = await prisma.buildEditRequest.findUnique({
        where: { id: requestId },
        include: { images: true, notes: true },
      });

      if (!editRequest || editRequest.status !== 'PENDING') {
        res.status(404).json({ error: 'İstek bulunamadı veya zaten işlendi.' });
        return;
      }

      await prisma.$transaction(async (tx) => {
        await applyEditRequestChanges(tx, editRequest.buildId, editRequest);
        await tx.buildEditRequest.update({
          where: { id: requestId },
          data: { status: 'APPROVED', reviewedAt: new Date() },
        });
      });

      await notifyBuildOwner(editRequest.buildId, 'EDIT_APPROVED');

      res.json({ message: 'Düzenleme isteği onaylandı ve uygulandı.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// DÜZENLEME İSTEĞİNİ REDDET (moderatör+)
// ==============================
router.post(
  '/edit-requests/:id/reject',
  requireAuth,
  requireModerator,
  async (req, res) => {
    try {
      const requestId = req.params.id as string;

      const editRequest = await prisma.buildEditRequest.findUnique({
        where: { id: requestId },
        include: { images: true },
      });

      if (!editRequest || editRequest.status !== 'PENDING') {
        res.status(404).json({ error: 'İstek bulunamadı veya zaten işlendi.' });
        return;
      }

      await deleteImages(editRequest.images.map((img) => img.url));

      await prisma.buildEditRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED', reviewedAt: new Date() },
      });

      await notifyBuildOwner(editRequest.buildId, 'EDIT_REJECTED');

      res.json({ message: 'Düzenleme isteği reddedildi.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

export default router;
