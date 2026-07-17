import { Router } from 'express';
import { prisma } from '../db.js';
import fs from 'fs';
import path from 'path';
import {
  requireAuth,
  optionalAuth,
  type AuthRequest,
} from '../middleware/auth.js';
import { validateBuild } from '../services/compatibility.js';
import {
  containsBannedWord,
  anyContainsBannedWord,
} from '../services/moderation.js';
import { applyEditRequestChanges } from '../services/buildEdits.js';
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
// SİSTEM TOPLA (görsel destekli, multipart/form-data)
// ==============================
router.post(
  '/',
  requireAuth,
  upload.array('images', 5),
  async (req: AuthRequest, res) => {
    try {
      const { name, cpuId, motherboardId, ramId, gpuId, psuId, caseId } =
        req.body;

      const isPublic = req.body.isPublic !== 'false';

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

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const hasImages = files.length > 0;

      const build = await prisma.build.create({
        data: {
          name: name || 'Adsız Sistem',
          totalPrice,
          isPublic,
          reviewStatus: hasImages ? 'PENDING' : 'APPROVED',
          userId: req.userId!,
          components: {
            create: ids.map((componentId) => ({ componentId })),
          },
          images: hasImages
            ? {
                create: files.map((file, i) => ({
                  url: `/uploads/${file.filename}`,
                  order: i,
                  isMain: i === 0,
                  status: 'PENDING',
                })),
              }
            : undefined,
        },
        include: {
          components: { include: { component: true } },
          images: true,
        },
      });

      res.status(201).json({
        message: hasImages
          ? 'Sistem oluşturuldu, görsellerin onaylandıktan sonra herkese görünecek.'
          : 'Sistem başarıyla oluşturuldu',
        build,
        warnings: result.issues,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// KENDİ SİSTEMLERİMİ LİSTELE
// ==============================
router.get('/me/all', requireAuth, async (req: AuthRequest, res) => {
  try {
    const builds = await prisma.build.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true } },
        components: { include: { component: true } },
        likes: true,
        comments: { where: { status: 'APPROVED' } },
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
// FEED
// ==============================
router.get('/', async (req, res) => {
  try {
    const featuredOnly = req.query.featured === 'true';

    const builds = await prisma.build.findMany({
      where: {
        isPublic: true,
        reviewStatus: 'APPROVED',
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
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
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

    const isOwner = req.userId === build.userId;

    if (build.reviewStatus !== 'APPROVED' && !isOwner) {
      res.status(404).json({ error: 'Sistem bulunamadı.' });
      return;
    }

    // Onaylanmamış görselleri, sahibi değilse gösterme
    const visibleImages = isOwner
      ? build.images
      : build.images.filter((img) => img.status === 'APPROVED');

    res.json({ build: { ...build, images: visibleImages }, isOwner });
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
// DÜZENLEME İSTEĞİ OLUŞTUR (sadece sahibi)
// ==============================
router.post(
  '/:id/edit-request',
  requireAuth,
  upload.array('images', 5),
  async (req: AuthRequest, res) => {
    try {
      const buildId = req.params.id as string;

      const build = await prisma.build.findUnique({
        where: { id: buildId },
        include: { components: { include: { component: true } } },
      });

      if (!build) {
        res.status(404).json({ error: 'Sistem bulunamadı.' });
        return;
      }

      if (build.userId !== req.userId) {
        res.status(403).json({ error: 'Bu işlem için yetkin yok.' });
        return;
      }

      const existingPending = await prisma.buildEditRequest.findFirst({
        where: { buildId, status: 'PENDING' },
      });

      if (existingPending) {
        res.status(409).json({
          error:
            'Bu sistem için zaten onay bekleyen bir düzenleme isteğin var.',
        });
        return;
      }

      const { description, cpuId, motherboardId, ramId, gpuId, psuId, caseId } =
        req.body;

      let notes: { componentType: string; note: string }[] = [];
      if (req.body.notes) {
        try {
          notes = JSON.parse(req.body.notes);
        } catch {
          notes = [];
        }
      }

      const proposedIds = { cpuId, motherboardId, ramId, gpuId, psuId, caseId };
      const hasPartChange = Object.values(proposedIds).some(Boolean);

      if (hasPartChange) {
        const currentByType: Record<string, string> = {};
        for (const bc of build.components) {
          currentByType[bc.component.type] = bc.componentId;
        }

        const finalIds = {
          cpuId: cpuId || currentByType['CPU'],
          motherboardId: motherboardId || currentByType['MOTHERBOARD'],
          ramId: ramId || currentByType['RAM'],
          gpuId: gpuId || currentByType['GPU'],
          psuId: psuId || currentByType['PSU'],
          caseId: caseId || currentByType['CASE'],
        };

        const ids = Object.values(finalIds);
        const parts = await prisma.component.findMany({
          where: { id: { in: ids } },
        });

        if (parts.length !== 6) {
          res
            .status(404)
            .json({ error: 'Bir veya birden fazla parça bulunamadı.' });
          return;
        }

        const findById = (id: string) => parts.find((c) => c.id === id)!;

        const result = validateBuild({
          cpu: findById(finalIds.cpuId),
          motherboard: findById(finalIds.motherboardId),
          ram: findById(finalIds.ramId),
          gpu: findById(finalIds.gpuId),
          psu: findById(finalIds.psuId),
          pcCase: findById(finalIds.caseId),
        });

        if (!result.isCompatible) {
          res.status(422).json({
            error: 'Önerdiğin parça kombinasyonu uyumlu değil.',
            issues: result.issues,
          });
          return;
        }
      }

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const hasImages = files.length > 0;

      const noteTexts = notes.map((n) => n.note);
      const descriptionBanned = description
        ? containsBannedWord(description)
        : false;
      const hasBannedContent =
        anyContainsBannedWord(noteTexts) || descriptionBanned;

      const requiresReview = hasImages || hasBannedContent;

      const editRequest = await prisma.buildEditRequest.create({
        data: {
          buildId,
          status: requiresReview ? 'PENDING' : 'APPROVED',
          reviewedAt: requiresReview ? null : new Date(),
          description: description || null,
          cpuId: cpuId || null,
          motherboardId: motherboardId || null,
          ramId: ramId || null,
          gpuId: gpuId || null,
          psuId: psuId || null,
          caseId: caseId || null,
          images: {
            create: files.map((file, i) => ({
              url: `/uploads/${file.filename}`,
              order: i,
            })),
          },
          notes: {
            create: notes
              .filter((n) => n.note && n.note.trim().length > 0)
              .map((n) => ({
                componentType: n.componentType as any,
                note: n.note,
              })),
          },
        },
        include: { images: true, notes: true },
      });

      if (!requiresReview) {
        await prisma.$transaction(async (tx) => {
          await applyEditRequestChanges(tx, buildId, editRequest);
        });
      }

      res.status(201).json({
        message: requiresReview
          ? 'Düzenleme isteğin gönderildi, admin onayı bekleniyor.'
          : 'Değişikliklerin uygulandı.',
        requiresReview,
        editRequest,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// SİSTEMİN BEKLEYEN DÜZENLEME İSTEĞİNİ GETİR (sadece sahibi)
// ==============================
router.get('/:id/edit-request', requireAuth, async (req: AuthRequest, res) => {
  try {
    const buildId = req.params.id as string;

    const build = await prisma.build.findUnique({ where: { id: buildId } });
    if (!build || build.userId !== req.userId) {
      res.status(403).json({ error: 'Bu işlem için yetkin yok.' });
      return;
    }

    const editRequest = await prisma.buildEditRequest.findFirst({
      where: { buildId, status: 'PENDING' },
      include: { images: true, notes: true },
    });

    res.json({ editRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// MEVCUT GÖRSELİ ANA GÖRSEL YAP (sadece sahibi, anında)
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

      await prisma.buildImage.update({
        where: { id: imageId },
        data: { isMain: true },
      });

      res.json({ message: 'Ana görsel güncellendi.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// MEVCUT GÖRSELİ SİL (sadece sahibi, anında)
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

      const image = await prisma.buildImage.findUnique({
        where: { id: imageId },
      });

      if (image) {
        const relativePath = image.url.startsWith('/')
          ? image.url.slice(1)
          : image.url;
        fs.unlink(path.join(process.cwd(), relativePath), () => {});
      }

      await prisma.buildImage.delete({ where: { id: imageId } });

      res.json({ message: 'Görsel silindi.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

export default router;
