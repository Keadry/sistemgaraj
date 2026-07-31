import { Router } from 'express';
import { prisma } from '../db.js';
import bcrypt from 'bcryptjs';
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

// ==============================
// KENDİ HESAP BİLGİLERİMİ GETİR (ayarlar sayfası için)
// ==============================
router.get('/me/account', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        coverUrl: true,
        bio: true,
        twitterUrl: true,
        githubUrl: true,
        steamUrl: true,
        discordUrl: true,
        websiteUrl: true,
        language: true,
        emailNewsletterOptIn: true,
        emailNotifyOnActivity: true,
        notifyOnBuildComment: true,
        notifyOnBuildLike: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// PROFİL BİLGİLERİNİ GÜNCELLE (hakkımda + sosyal linkler)
// ==============================
router.patch('/me/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { bio, twitterUrl, githubUrl, steamUrl, discordUrl, websiteUrl } =
      req.body;

    if (bio && bio.length > 300) {
      res
        .status(400)
        .json({ error: 'Hakkımda metni en fazla 300 karakter olabilir.' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        bio: bio || null,
        twitterUrl: twitterUrl || null,
        githubUrl: githubUrl || null,
        steamUrl: steamUrl || null,
        discordUrl: discordUrl || null,
        websiteUrl: websiteUrl || null,
      },
    });

    res.json({ message: 'Profil güncellendi.', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// KENDİ KULLANICI ADIMI DEĞİŞTİR (self-servis)
// ==============================
router.patch('/me/username', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { username } = req.body;

    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Geçerli bir kullanıcı adı gir.' });
      return;
    }

    const trimmed = username.trim();

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmed)) {
      res.status(400).json({
        error:
          'Kullanıcı adı 3-20 karakter olmalı, sadece harf, rakam ve alt çizgi içerebilir.',
      });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: {
        username: { equals: trimmed, mode: 'insensitive' },
        id: { not: req.userId! },
      },
    });

    if (existing) {
      res.status(409).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: { username: trimmed },
    });

    res.json({
      message: 'Kullanıcı adı güncellendi.',
      username: user.username,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// KENDİ E-POSTAMI DEĞİŞTİR (mevcut şifre ile doğrulama)
// ==============================
router.patch('/me/email', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { newEmail, currentPassword } = req.body;

    if (!newEmail || !currentPassword) {
      res
        .status(400)
        .json({ error: 'Yeni e-posta ve mevcut şifre zorunludur.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      res.status(401).json({ error: 'Şifre hatalı.' });
      return;
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: newEmail },
    });
    if (existingEmail) {
      res.status(409).json({ error: 'Bu e-posta zaten kullanımda.' });
      return;
    }

    await prisma.user.update({
      where: { id: req.userId! },
      data: { email: newEmail },
    });

    res.json({ message: 'E-posta güncellendi.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// KENDİ ŞİFREMİ DEĞİŞTİR (mevcut şifre ile doğrulama)
// ==============================
router.patch('/me/password', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Mevcut ve yeni şifre zorunludur.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalı.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      res.status(401).json({ error: 'Mevcut şifre hatalı.' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.userId! },
      data: { password: hashed },
    });

    res.json({ message: 'Şifre güncellendi.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// HESABIMI SİL (mevcut şifre ile doğrulama)
// ==============================
router.delete('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentPassword } = req.body;

    if (!currentPassword) {
      res.status(400).json({ error: 'Şifreni girmen gerekiyor.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      res.status(401).json({ error: 'Şifre hatalı.' });
      return;
    }

    await prisma.user.delete({ where: { id: req.userId! } });

    res.json({ message: 'Hesabın silindi.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// TERCİHLERİ GÜNCELLE
// ==============================
router.patch('/me/preferences', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      language,
      emailNewsletterOptIn,
      emailNotifyOnActivity,
      notifyOnBuildComment,
      notifyOnBuildLike,
    } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        ...(language !== undefined ? { language } : {}),
        ...(emailNewsletterOptIn !== undefined ? { emailNewsletterOptIn } : {}),
        ...(emailNotifyOnActivity !== undefined
          ? { emailNotifyOnActivity }
          : {}),
        ...(notifyOnBuildComment !== undefined ? { notifyOnBuildComment } : {}),
        ...(notifyOnBuildLike !== undefined ? { notifyOnBuildLike } : {}),
      },
    });

    res.json({
      message: 'Tercihler güncellendi.',
      preferences: {
        language: user.language,
        emailNewsletterOptIn: user.emailNewsletterOptIn,
        emailNotifyOnActivity: user.emailNotifyOnActivity,
        notifyOnBuildComment: user.notifyOnBuildComment,
        notifyOnBuildLike: user.notifyOnBuildLike,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

export default router;
