import { Router } from 'express';
import { prisma } from '../../db.js';
import { requireAuth, type AuthRequest } from '../../middleware/auth.js';

const router = Router();

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

export default router;
