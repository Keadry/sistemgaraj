import { Router } from 'express';
import { prisma } from '../db.js';
import {
  requireAuth,
  optionalAuth,
  type AuthRequest,
} from '../middleware/auth.js';
import {
  validateBuild,
  checkRamSlotCompatibility,
  checkStorageSlotCompatibility,
} from '../services/compatibility.js';
import {
  containsBannedWord,
  anyContainsBannedWord,
} from '../services/moderation.js';
import { applyEditRequestChanges } from '../services/buildEdits.js';
import { upload } from '../upload.js';
import fs from 'fs';
import path from 'path';
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

function getArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean) as string[];
  return [String(value)];
}

// ==============================
// SİSTEM TOPLA (görsel + çoklu RAM + çoklu depolama destekli)
// ==============================
router.post(
  '/',
  requireAuth,
  upload.array('images', 5),
  async (req: AuthRequest, res) => {
    try {
      const { name, cpuId, motherboardId, gpuId, psuId, caseId } = req.body;

      const ramIds = getArray(req.body.ramIds);
      const storageIds = getArray(req.body.storageIds);
      const isPublic = req.body.isPublic !== 'false';

      if (
        !cpuId ||
        !motherboardId ||
        !gpuId ||
        !psuId ||
        !caseId ||
        ramIds.length === 0 ||
        storageIds.length === 0
      ) {
        res.status(400).json({
          error:
            'CPU, Anakart, GPU, PSU, Kasa, en az 1 RAM ve en az 1 depolama zorunludur.',
        });
        return;
      }

      const singleIds: string[] = [cpuId, motherboardId, gpuId, psuId, caseId];
      const allIds = [...singleIds, ...ramIds, ...storageIds];

      const components = await prisma.component.findMany({
        where: { id: { in: allIds } },
      });

      if (components.length !== allIds.length) {
        res
          .status(404)
          .json({ error: 'Bir veya birden fazla parça bulunamadı.' });
        return;
      }

      const findById = (id: string): Component => {
        return components.find((c) => c.id === id)!;
      };

      const ramComponents = ramIds.map(findById);
      const storageComponents = storageIds.map(findById);

      const parts = {
        cpu: findById(cpuId),
        motherboard: findById(motherboardId),
        ram: ramComponents[0],
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

      const slotIssues = [
        ...checkRamSlotCompatibility(parts.motherboard, ramComponents.length),
        ...checkStorageSlotCompatibility(
          parts.motherboard,
          parts.pcCase,
          storageComponents,
        ),
      ];

      if (slotIssues.some((i) => i.level === 'error')) {
        res.status(422).json({
          error: 'Seçilen parçalar uyumlu değil.',
          issues: slotIssues,
        });
        return;
      }

      const totalPrice = components.reduce((sum, c) => sum + c.price, 0);

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
            create: allIds.map((componentId) => ({ componentId })),
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
        warnings: [...result.issues, ...slotIssues],
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
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : undefined;

    const builds = await prisma.build.findMany({
      where: {
        isPublic: true,
        reviewStatus: 'APPROVED',
        ...(featuredOnly ? { isFeatured: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : {}),
      include: buildIncludes,
    });

    res.json({ builds });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// TOPLAM SİSTEM SAYISI (hafif, sadece sayı döner)
// ==============================
router.get('/count', async (req, res) => {
  try {
    const count = await prisma.build.count({
      where: { isPublic: true, reviewStatus: 'APPROVED' },
    });
    res.json({ count });
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
          where: { status: 'APPROVED', parentId: null },
          include: {
            user: { select: { id: true, username: true, avatarUrl: true } },
            likes: true,
            replies: {
              where: { status: 'APPROVED' },
              include: {
                user: {
                  select: { id: true, username: true, avatarUrl: true },
                },
                likes: true,
                replies: {
                  where: { status: 'APPROVED' },
                  include: {
                    user: {
                      select: { id: true, username: true, avatarUrl: true },
                    },
                    likes: true,
                  },
                  orderBy: { createdAt: 'asc' },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
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
// SİSTEMİ SİL (sadece sahibi)
// ==============================
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const buildId = req.params.id as string;

    const build = await prisma.build.findUnique({
      where: { id: buildId },
      include: { images: true },
    });

    if (!build) {
      res.status(404).json({ error: 'Sistem bulunamadı.' });
      return;
    }

    if (build.userId !== req.userId) {
      res.status(403).json({ error: 'Bu işlem için yetkin yok.' });
      return;
    }

    for (const img of build.images) {
      const relativePath = img.url.startsWith('/') ? img.url.slice(1) : img.url;
      fs.unlink(path.join(process.cwd(), relativePath), () => {});
    }

    await prisma.build.delete({ where: { id: buildId } });

    res.json({ message: 'Sistem silindi.' });
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
    const { content, parentId } = req.body;

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

    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
      });
      if (!parent || parent.buildId !== buildId) {
        res.status(400).json({ error: 'Geçersiz yanıt hedefi.' });
        return;
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        userId: req.userId!,
        buildId,
        status,
        parentId: parentId || null,
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        likes: true,
      },
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
// YORUMU DÜZENLE (sadece yazarı)
// ==============================
router.patch(
  '/:id/comments/:commentId',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const commentId = req.params.commentId as string;
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        res.status(400).json({ error: 'Yorum içeriği boş olamaz.' });
        return;
      }

      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      });

      if (!comment) {
        res.status(404).json({ error: 'Yorum bulunamadı.' });
        return;
      }

      if (comment.userId !== req.userId) {
        res.status(403).json({ error: 'Bu işlem için yetkin yok.' });
        return;
      }

      const referenceTime = comment.lastEditedAt ?? comment.createdAt;
      const secondsSinceLastEdit =
        (Date.now() - referenceTime.getTime()) / 1000;

      if (secondsSinceLastEdit < 30) {
        res.status(429).json({
          error: `Çok hızlı düzenliyorsun. ${Math.ceil(
            30 - secondsSinceLastEdit,
          )} saniye bekle.`,
        });
        return;
      }

      const status = containsBannedWord(content) ? 'PENDING' : 'APPROVED';

      const updated = await prisma.comment.update({
        where: { id: commentId },
        data: { content, status, lastEditedAt: new Date() },
        include: { user: { select: { id: true, username: true } } },
      });

      res.json({
        message:
          status === 'PENDING'
            ? 'Yorumun tekrar incelemeye alındı.'
            : 'Yorum güncellendi.',
        comment: updated,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// YORUMU SİL (yazarı, sistem sahibi veya moderatör)
// ==============================
router.delete(
  '/:id/comments/:commentId',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const buildId = req.params.id as string;
      const commentId = req.params.commentId as string;

      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      });

      if (!comment) {
        res.status(404).json({ error: 'Yorum bulunamadı.' });
        return;
      }

      const build = await prisma.build.findUnique({ where: { id: buildId } });
      const requester = await prisma.user.findUnique({
        where: { id: req.userId! },
      });

      const canDelete =
        comment.userId === req.userId ||
        build?.userId === req.userId ||
        requester?.role === 'MODERATOR' ||
        requester?.role === 'ADMIN';

      if (!canDelete) {
        res.status(403).json({ error: 'Bu işlem için yetkin yok.' });
        return;
      }

      await prisma.comment.delete({ where: { id: commentId } });

      res.json({ message: 'Yorum silindi.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

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

      const { name, description, cpuId, motherboardId, gpuId, psuId, caseId } =
        req.body;

      const ramIds = getArray(req.body.ramIds);
      const storageIds = getArray(req.body.storageIds);

      let notes: { componentType: string; note: string }[] = [];
      if (req.body.notes) {
        try {
          notes = JSON.parse(req.body.notes);
        } catch {
          notes = [];
        }
      }

      const hasPartChange =
        Boolean(cpuId) ||
        Boolean(motherboardId) ||
        Boolean(gpuId) ||
        Boolean(psuId) ||
        Boolean(caseId) ||
        ramIds.length > 0 ||
        storageIds.length > 0;

      if (hasPartChange) {
        const currentByType: Record<string, string> = {};
        const currentStorageIds: string[] = [];
        const currentRamIds: string[] = [];
        for (const bc of build.components) {
          if (bc.component.type === 'STORAGE') {
            currentStorageIds.push(bc.componentId);
          } else if (bc.component.type === 'RAM') {
            currentRamIds.push(bc.componentId);
          } else {
            currentByType[bc.component.type] = bc.componentId;
          }
        }

        const finalSingleIds = {
          cpuId: cpuId || currentByType['CPU'],
          motherboardId: motherboardId || currentByType['MOTHERBOARD'],
          gpuId: gpuId || currentByType['GPU'],
          psuId: psuId || currentByType['PSU'],
          caseId: caseId || currentByType['CASE'],
        };

        const finalRamIds = ramIds.length > 0 ? ramIds : currentRamIds;
        const finalStorageIds =
          storageIds.length > 0 ? storageIds : currentStorageIds;

        const allIds = [
          ...Object.values(finalSingleIds),
          ...finalRamIds,
          ...finalStorageIds,
        ];
        const parts = await prisma.component.findMany({
          where: { id: { in: allIds } },
        });

        if (parts.length !== allIds.length) {
          res
            .status(404)
            .json({ error: 'Bir veya birden fazla parça bulunamadı.' });
          return;
        }

        const findById = (id: string) => parts.find((c) => c.id === id)!;

        const result = validateBuild({
          cpu: findById(finalSingleIds.cpuId),
          motherboard: findById(finalSingleIds.motherboardId),
          ram: findById(finalRamIds[0]),
          gpu: findById(finalSingleIds.gpuId),
          psu: findById(finalSingleIds.psuId),
          pcCase: findById(finalSingleIds.caseId),
        });

        if (!result.isCompatible) {
          res.status(422).json({
            error: 'Önerdiğin parça kombinasyonu uyumlu değil.',
            issues: result.issues,
          });
          return;
        }

        const motherboard = findById(finalSingleIds.motherboardId);
        const pcCase = findById(finalSingleIds.caseId);
        const ramComponents = finalRamIds.map(findById);
        const storageComponents = finalStorageIds.map(findById);

        const slotIssues = [
          ...checkRamSlotCompatibility(motherboard, ramComponents.length),
          ...checkStorageSlotCompatibility(
            motherboard,
            pcCase,
            storageComponents,
          ),
        ];

        if (slotIssues.some((i) => i.level === 'error')) {
          res.status(422).json({
            error: 'Önerdiğin parça kombinasyonu uyumlu değil.',
            issues: slotIssues,
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
      const nameBanned = name ? containsBannedWord(name) : false;
      const hasBannedContent =
        anyContainsBannedWord(noteTexts) || descriptionBanned || nameBanned;

      const requiresReview = hasImages || hasBannedContent;

      const editRequest = await prisma.buildEditRequest.create({
        data: {
          buildId,
          status: requiresReview ? 'PENDING' : 'APPROVED',
          reviewedAt: requiresReview ? null : new Date(),
          name: name || null,
          description: description || null,
          cpuId: cpuId || null,
          motherboardId: motherboardId || null,
          gpuId: gpuId || null,
          psuId: psuId || null,
          caseId: caseId || null,
          ramIds,
          storageId: storageIds,
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

// ==============================
// YORUMU BEĞEN
// ==============================
router.post(
  '/:id/comments/:commentId/like',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const commentId = req.params.commentId as string;

      const existing = await prisma.commentLike.findUnique({
        where: { userId_commentId: { userId: req.userId!, commentId } },
      });

      if (existing) {
        res.status(409).json({ error: 'Bu yorumu zaten beğendin.' });
        return;
      }

      await prisma.commentLike.create({
        data: { userId: req.userId!, commentId },
      });

      res.status(201).json({ message: 'Beğenildi.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// YORUM BEĞENİSİNİ GERİ AL
// ==============================
router.delete(
  '/:id/comments/:commentId/like',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const commentId = req.params.commentId as string;

      await prisma.commentLike.delete({
        where: { userId_commentId: { userId: req.userId!, commentId } },
      });

      res.json({ message: 'Beğeni geri alındı.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

export default router;
