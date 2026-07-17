import { Router } from 'express';
import { prisma } from '../db.js';
import { upload } from '../upload.js';
import {
  requireAuth,
  optionalAuth,
  type AuthRequest,
} from '../middleware/auth.js';
const router = Router();

router.get('/:username', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const username = req.params.username as string;

    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        coverUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }

    const isOwner = req.userId === user.id;

    const builds = await prisma.build.findMany({
      where: {
        userId: user.id,
        ...(isOwner ? {} : { isPublic: true, reviewStatus: 'APPROVED' }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true } },
        components: { include: { component: true } },
        likes: true,
        comments: { where: { status: 'APPROVED' } },
        images: { where: { status: 'APPROVED' }, orderBy: { order: 'asc' } },
      },
    });

    const wallComments = await prisma.profileComment.findMany({
      where: { profileUserId: user.id, parentId: null },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, username: true, avatarUrl: true } },
          },
        },
      },
    });

    res.json({ user, builds, isOwner, wallComments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// AVATAR GÜNCELLE (sadece kendi hesabı)
// ==============================
router.post(
  '/me/avatar',
  requireAuth,
  upload.single('avatar'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Görsel bulunamadı.' });
        return;
      }

      const user = await prisma.user.update({
        where: { id: req.userId! },
        data: { avatarUrl: `/uploads/${req.file.filename}` },
      });

      res.json({
        message: 'Profil resmi güncellendi.',
        avatarUrl: user.avatarUrl,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// KAPAK FOTOĞRAFI GÜNCELLE (sadece kendi hesabı)
// ==============================
router.post(
  '/me/cover',
  requireAuth,
  upload.single('cover'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Görsel bulunamadı.' });
        return;
      }

      const user = await prisma.user.update({
        where: { id: req.userId! },
        data: { coverUrl: `/uploads/${req.file.filename}` },
      });

      res.json({
        message: 'Kapak fotoğrafı güncellendi.',
        coverUrl: user.coverUrl,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// DUVAR YORUMU EKLE (soru/yorum, ya da cevap)
// ==============================
router.post('/:username/wall', requireAuth, async (req: AuthRequest, res) => {
  try {
    const username = req.params.username as string;
    const { content, parentId } = req.body;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: 'Yorum içeriği boş olamaz.' });
      return;
    }

    const profileUser = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });

    if (!profileUser) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }

    // Cevap veriliyorsa, üst yorumun gerçekten bu profile ait olduğunu doğrula
    if (parentId) {
      const parent = await prisma.profileComment.findUnique({
        where: { id: parentId },
      });
      if (!parent || parent.profileUserId !== profileUser.id) {
        res.status(400).json({ error: 'Geçersiz yanıt hedefi.' });
        return;
      }
    }

    const comment = await prisma.profileComment.create({
      data: {
        content,
        authorId: req.userId!,
        profileUserId: profileUser.id,
        parentId: parentId || null,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    res.status(201).json({ message: 'Yorum eklendi.', comment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// DUVAR YORUMUNU SİL (yazarı, profil sahibi veya moderatör)
// ==============================
router.delete(
  '/wall/:commentId',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const commentId = req.params.commentId as string;

      const comment = await prisma.profileComment.findUnique({
        where: { id: commentId },
      });

      if (!comment) {
        res.status(404).json({ error: 'Yorum bulunamadı.' });
        return;
      }

      const requester = await prisma.user.findUnique({
        where: { id: req.userId! },
      });

      const canDelete =
        comment.authorId === req.userId ||
        comment.profileUserId === req.userId ||
        requester?.role === 'MODERATOR' ||
        requester?.role === 'ADMIN';

      if (!canDelete) {
        res.status(403).json({ error: 'Bu işlem için yetkin yok.' });
        return;
      }

      // Cevapları da sil (basit temizlik, tek seviye olduğu için sorun çıkarmaz)
      await prisma.profileComment.deleteMany({
        where: { parentId: commentId },
      });
      await prisma.profileComment.delete({ where: { id: commentId } });

      res.json({ message: 'Yorum silindi.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

export default router;
