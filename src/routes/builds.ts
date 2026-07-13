import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { validateBuild } from '../services/compatibility.js';
import type { Component } from '../generated/prisma/client.js';
import { containsBannedWord } from '../services/moderation.js';

const router = Router();

// ==============================
// SİSTEM TOPLA (korumalı rota)
// ==============================
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, cpuId, motherboardId, ramId, gpuId, psuId, caseId } =
      req.body;

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
// FEED: Herkese açık sistemleri listele
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
      include: {
        user: { select: { id: true, name: true } },
        components: { include: { component: true } },
        likes: true,
        comments: { where: { status: 'APPROVED' } },
      },
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
        user: { select: { id: true, name: true } },
        components: { include: { component: true } },
        likes: true,
        comments: {
          where: { status: 'APPROVED' },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
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
      include: { user: { select: { id: true, name: true } } },
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

export default router;
