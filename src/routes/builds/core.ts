import { Router } from 'express';
import { prisma } from '../../db.js';
import {
  requireAuth,
  optionalAuth,
  type AuthRequest,
} from '../../middleware/auth.js';
import {
  validateBuild,
  checkRamSlotCompatibility,
  checkStorageSlotCompatibility,
} from '../../services/compatibility.js';
import { upload } from '../../upload.js';
import { saveImages, deleteImages } from '../../storage.js';
import type { Component } from '../../generated/prisma/client.js';
import { buildIncludes, getArray } from './shared.js';

const router = Router();

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

      // Görselleri sistem kaydından önce yüklüyoruz: depolama başarısız
      // olursa ortada görselsiz bir sistem kalmasın.
      const imageUrls = await saveImages(files);

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
                create: imageUrls.map((url, i) => ({
                  url,
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
    const offset = req.query.offset
      ? parseInt(req.query.offset as string, 10)
      : 0;
    const search =
      typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const where: any = {
      isPublic: true,
      reviewStatus: 'APPROVED',
      ...(featuredOnly ? { isFeatured: true } : {}),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const builds = await prisma.build.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: search ? 0 : offset,
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
        user: { select: { id: true, username: true, avatarUrl: true } },
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

    let isBookmarked = false;
    if (req.userId) {
      const bookmark = await prisma.buildBookmark.findUnique({
        where: { userId_buildId: { userId: req.userId, buildId } },
      });
      isBookmarked = Boolean(bookmark);
    }

    if (build.reviewStatus !== 'APPROVED' && !isOwner) {
      res.status(404).json({ error: 'Sistem bulunamadı.' });
      return;
    }

    const visibleImages = isOwner
      ? build.images
      : build.images.filter((img) => img.status === 'APPROVED');

    res.json({
      build: { ...build, images: visibleImages },
      isOwner,
      isBookmarked,
    });
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

    await deleteImages(build.images.map((img) => img.url));

    await prisma.build.delete({ where: { id: buildId } });

    res.json({ message: 'Sistem silindi.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

export default router;
