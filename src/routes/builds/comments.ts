import { Router } from 'express';
import { prisma } from '../../db.js';
import { requireAuth, type AuthRequest } from '../../middleware/auth.js';
import { containsBannedWord } from '../../services/moderation.js';

const router = Router();

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

    const build = await prisma.build.findUnique({ where: { id: buildId } });
    if (!build) {
      res.status(404).json({ error: 'Sistem bulunamadı.' });
      return;
    }

    const isBlocked = await prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: build.userId,
          blockedId: req.userId!,
        },
      },
    });

    if (isBlocked) {
      res.status(403).json({
        error: 'Bu sistemin sahibi seni engellemiş, yorum yapamazsın.',
      });
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
