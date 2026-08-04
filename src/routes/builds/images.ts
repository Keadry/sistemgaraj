import { Router } from 'express';
import { prisma } from '../../db.js';
import { requireAuth, type AuthRequest } from '../../middleware/auth.js';
import fs from 'fs';
import path from 'path';

const router = Router();

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
