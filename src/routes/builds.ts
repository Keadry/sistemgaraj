import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { validateBuild } from '../services/compatibility.js';
import { containsBannedWord } from '../services/moderation.js';
import { upload } from '../upload.js';
import type { Component } from '../generated/prisma/client.js';

const router = Router();

const buildIncludes = {
  user: { select: { id: true, username: true } },
  components: { include: { component: true } },
  likes: true,
  comments: { where: { status: 'APPROVED' as const } },
  images: {
    where: { status: 'APPROVED' as const },
    orderBy: { order: 'asc' as const },
  },
};

// ==============================
// SİSTEM TOPLA
// ==============================
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      name,
      cpuId,
      motherboardId,
      ramId,
      gpuId,
      psuId,
      caseId,
      isPublic,
    } = req.body;

    if (!cpuId || !motherboardId || !ramId || !gpuId || !psuId || !caseId) {
      res.status(400).json({
        error:
          "6 parça ID'sinin tamamı zorunludur (cpuId, motherboardId, ramId, gpuId, psuId, caseId).",
      });
      return;
    }

    const ids: string[] = [cpuId, motherboardId, ramId, gpuId, psuId, caseId];
    const components = await prisma.component.findMany({
      where: { id: { in: ids } },
    });

    if (components.length !== 6) {
      res
        .status(404)
        .json({ error: 'Bir veya birden fazla parça bulunamadı.' });
      return;
    }

    const findById = (id: string): Component => {
      return components.find((c) => c.id === id)!;
    };

    const parts = {
      cpu: findById(cpuId),
      motherboard: findById(motherboardId),
      ram: findById(ramId),
      gpu: findById(gpuId),
      psu: findById(psuId),
      pcCase: findById(caseId),
    };

    const result = validateBuild(parts);

    if (!result.isCompatible) {
      res.status(422).json({
        error: 'Seçilen parçalar uyumlu değil.',
        issues: result.issues,
      });
      return;
    }

    const totalPrice = Object.values(parts).reduce(
      (sum, part) => sum + part.price,
      0,
    );

    const build = await prisma.build.create({
      data: {
        name: name || 'Adsız Sistem',
        totalPrice,
        isPublic: isPublic !== false,
        userId: req.userId!,
        components: {
          create: ids.map((componentId) => ({ componentId })),
        },
      },
      include: {
        components: { include: { component: true } },
      },
    });

    res.status(201).json({
      message: 'Sistem başarıyla oluşturuldu',
      build,
      warnings: result.issues,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// KENDİ SİSTEMLERİMİ LİSTELE
// ==============================
router.get('/me/all', requireAuth, async (req: AuthRequest, res) => {
  try {
    const builds = await prisma.build.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: buildIncludes,
    });

    res.json({ builds });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// FEED
// ==============================
router.get('/', async (req, res) => {
  try {
    const featuredOnly = req.query.featured === 'true';

    const builds = await prisma.build.findMany({
      where: {
        isPublic: true,
        ...(featuredOnly ? { isFeatured: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: buildIncludes,
    });

    res.json({ builds });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// TEK SİSTEM DETAYI
// ==============================
router.get('/:id', async (req, res) => {
  try {
    const buildId = req.params.id as string;

    const build = await prisma.build.findUnique({
      where: { id: buildId },
      include: {
        user: { select: { id: true, username: true } },
        components: { include: { component: true } },
        likes: true,
        comments: {
          where: { status: 'APPROVED' },
          include: { user: { select: { id: true, username: true } } },
          orderBy: { createdAt: 'asc' },
        },
        images: { orderBy: { order: 'asc' } },
      },
    });

    if (!build) {
      res.status(404).json({ error: 'Sistem bulunamadı.' });
      return;
    }

    res.json({ build });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// BEĞEN
// ==============================
router.post('/:id/like', requireAuth, async (req: AuthRequest, res) => {
  try {
    const buildId = req.params.id as string;

    const existingLike = await prisma.like.findUnique({
      where: { userId_buildId: { userId: req.userId!, buildId } },
    });

    if (existingLike) {
      res.status(409).json({ error: 'Bu sistemi zaten beğendin.' });
      return;
    }

    await prisma.like.create({
      data: { userId: req.userId!, buildId },
    });

    res.status(201).json({ message: 'Beğenildi.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// BEĞENİYİ GERİ AL
// ==============================
router.delete('/:id/like', requireAuth, async (req: AuthRequest, res) => {
  try {
    const buildId = req.params.id as string;

    await prisma.like.delete({
      where: { userId_buildId: { userId: req.userId!, buildId } },
    });

    res.json({ message: 'Beğeni geri alındı.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// YORUM EKLE
// ==============================
router.post('/:id/comments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const buildId = req.params.id as string;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: 'Yorum içeriği boş olamaz.' });
      return;
    }

    const lastComment = await prisma.comment.findFirst({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });

    if (lastComment) {
      const secondsSinceLastComment =
        (Date.now() - lastComment.createdAt.getTime()) / 1000;

      if (secondsSinceLastComment < 30) {
        res.status(429).json({
          error: `Çok hızlı yorum yapıyorsun. ${Math.ceil(
            30 - secondsSinceLastComment,
          )} saniye bekle.`,
        });
        return;
      }

      if (lastComment.content.trim() === content.trim()) {
        res.status(429).json({
          error: 'Bu yorumu zaten yaptın, aynısını tekrar gönderemezsin.',
        });
        return;
      }
    }

    const status = containsBannedWord(content) ? 'PENDING' : 'APPROVED';

    const comment = await prisma.comment.create({
      data: { content, userId: req.userId!, buildId, status },
      include: { user: { select: { id: true, username: true } } },
    });

    res.status(201).json({
      message:
        status === 'PENDING'
          ? 'Yorumun incelemeye alındı, onaylandıktan sonra görünecek.'
          : 'Yorum eklendi',
      comment,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// GÖRSEL YÜKLE (max 5, ilk yüklenen ana görsel olur)
// ==============================
router.post(
  '/:id/images',
  requireAuth,
  upload.array('images', 5),
  async (req: AuthRequest, res) => {
    try {
      const buildId = req.params.id as string;

      const build = await prisma.build.findUnique({ where: { id: buildId } });

      if (!build) {
        res.status(404).json({ error: 'Sistem bulunamadı.' });
        return;
      }

      if (build.userId !== req.userId) {
        res.status(403).json({ error: 'Bu işlem için yetkin yok.' });
        return;
      }

      const files = req.files as Express.Multer.File[] | undefined;

      if (!files || files.length === 0) {
        res.status(400).json({ error: 'Görsel dosyası bulunamadı.' });
        return;
      }

      const existingCount = await prisma.buildImage.count({
        where: { buildId },
      });

      const created = await prisma.$transaction(
        files.map((file, i) =>
          prisma.buildImage.create({
            data: {
              url: `/uploads/${file.filename}`,
              buildId,
              order: existingCount + i,
              isMain: existingCount === 0 && i === 0,
            },
          }),
        ),
      );

      res.status(201).json({
        message: 'Görseller yüklendi, onaylandıktan sonra herkese görünecek.',
        images: created,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// GÖRSELİ ANA GÖRSEL YAP (sadece sahibi)
// ==============================
router.patch(
  '/:id/images/:imageId/main',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const buildId = req.params.id as string;
      const imageId = req.params.imageId as string;

      const build = await prisma.build.findUnique({ where: { id: buildId } });

      if (!build || build.userId !== req.userId) {
        res.status(403).json({ error: 'Bu işlem için yetkin yok.' });
        return;
      }

      await prisma.buildImage.updateMany({
        where: { buildId },
        data: { isMain: false },
      });

      const updated = await prisma.buildImage.update({
        where: { id: imageId },
        data: { isMain: true },
      });

      res.json({ message: 'Ana görsel güncellendi.', image: updated });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// GÖRSELİ SİL (sadece sahibi)
// ==============================
router.delete(
  '/:id/images/:imageId',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const buildId = req.params.id as string;
      const imageId = req.params.imageId as string;

      const build = await prisma.build.findUnique({ where: { id: buildId } });

      if (!build || build.userId !== req.userId) {
        res.status(403).json({ error: 'Bu işlem için yetkin yok.' });
        return;
      }

      await prisma.buildImage.delete({ where: { id: imageId } });

      res.json({ message: 'Görsel silindi.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// PARÇA NOTUNU GÜNCELLE (sadece sahibi)
// ==============================
router.patch(
  '/:id/components/:buildComponentId/note',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const buildId = req.params.id as string;
      const buildComponentId = req.params.buildComponentId as string;
      const { note } = req.body;

      const build = await prisma.build.findUnique({ where: { id: buildId } });

      if (!build) {
        res.status(404).json({ error: 'Sistem bulunamadı.' });
        return;
      }

      if (build.userId !== req.userId) {
        res.status(403).json({ error: 'Bu işlem için yetkin yok.' });
        return;
      }

      const noteStatus =
        note && containsBannedWord(note) ? 'PENDING' : 'APPROVED';

      const updated = await prisma.buildComponent.update({
        where: { id: buildComponentId },
        data: { note: note || null, noteStatus },
      });

      res.json({
        message:
          noteStatus === 'PENDING'
            ? 'Notun incelemeye alındı, onaylandıktan sonra herkese görünecek.'
            : 'Not güncellendi.',
        buildComponent: updated,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

export default router;
