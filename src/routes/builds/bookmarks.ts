import { Router } from 'express';
import { prisma } from '../../db.js';
import { requireAuth, type AuthRequest } from '../../middleware/auth.js';
import { buildIncludes } from './shared.js';

const router = Router();

// ==============================
// SİSTEMİ İŞARETLE (KAYDET)
// ==============================
router.post('/:id/bookmark', requireAuth, async (req: AuthRequest, res) => {
  try {
    const buildId = req.params.id as string;

    const existing = await prisma.buildBookmark.findUnique({
      where: { userId_buildId: { userId: req.userId!, buildId } },
    });

    if (existing) {
      res.status(409).json({ error: 'Bu sistemi zaten işaretledin.' });
      return;
    }

    await prisma.buildBookmark.create({
      data: { userId: req.userId!, buildId },
    });

    res.status(201).json({ message: 'Sistem işaretlendi.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// İŞARETİ KALDIR
// ==============================
router.delete('/:id/bookmark', requireAuth, async (req: AuthRequest, res) => {
  try {
    const buildId = req.params.id as string;

    await prisma.buildBookmark.delete({
      where: { userId_buildId: { userId: req.userId!, buildId } },
    });

    res.json({ message: 'İşaret kaldırıldı.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// İŞARETLENEN SİSTEMLERİ LİSTELE
// ==============================
router.get('/me/bookmarks', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookmarks = await prisma.buildBookmark.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: {
        build: {
          include: buildIncludes,
        },
      },
    });

    const builds = bookmarks
      .map((b) => b.build)
      .filter((b) => b.reviewStatus === 'APPROVED');

    res.json({ builds });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

export default router;
