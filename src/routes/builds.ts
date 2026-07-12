import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { validateBuild } from '../services/compatibility.js';
import type { Component } from '../generated/prisma/client.js';

const router = Router();
// ==============================
// SİSTEM TOPLA (korumalı rota)
// ==============================
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, cpuId, motherboardId, ramId, gpuId, psuId, caseId } =
      req.body;

    if (!cpuId || !motherboardId || !ramId || !gpuId || !psuId || !caseId) {
      return res.status(400).json({
        error:
          "6 parça ID'sinin tamamı zorunludur (cpuId, motherboardId, ramId, gpuId, psuId, caseId).",
      });
    }

    // İlgili parçaları veritabanından tek seferde çekiyoruz
    const ids = [cpuId, motherboardId, ramId, gpuId, psuId, caseId];
    const components = await prisma.component.findMany({
      where: { id: { in: ids } },
    });

    // Hepsi gerçekten bulundu mu kontrol et
    if (components.length !== 6) {
      return res
        .status(404)
        .json({ error: 'Bir veya birden fazla parça bulunamadı.' });
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

    // FAZ 4'teki uyum algoritmasından geçiriyoruz
    const result = validateBuild(parts);

    if (!result.isCompatible) {
      return res.status(422).json({
        error: 'Seçilen parçalar uyumlu değil.',
        issues: result.issues,
      });
    }

    // Toplam fiyatı hesapla
    const totalPrice = Object.values(parts).reduce(
      (sum, part) => sum + part.price,
      0,
    );

    // Uyumluysa veritabanına kaydet
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
      warnings: result.issues, // varsa sadece "warning" seviyesindekiler kalmış olur
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
    const builds = await prisma.build.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        components: { include: { component: true } },
        likes: true,
        comments: true,
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
    const build = await prisma.build.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true } },
        components: { include: { component: true } },
        likes: true,
        comments: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!build) {
      return res.status(404).json({ error: 'Sistem bulunamadı.' });
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
    const buildId = req.params.id;

    const existingLike = await prisma.like.findUnique({
      where: { userId_buildId: { userId: req.userId!, buildId } },
    });

    if (existingLike) {
      return res.status(409).json({ error: 'Bu sistemi zaten beğendin.' });
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
    const buildId = req.params.id;

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
    const buildId = req.params.id;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Yorum içeriği boş olamaz.' });
    }

    const comment = await prisma.comment.create({
      data: { content, userId: req.userId!, buildId },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ message: 'Yorum eklendi', comment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

export default router;
