import { Router } from 'express';
import { prisma } from '../db.js';
import bcrypt from 'bcryptjs';
import { upload } from '../upload.js';
import { verifyImageContents } from '../middleware/image-content.js';
import { requireVerifiedEmail } from '../middleware/verified-email.js';
import { createEmailVerificationToken } from '../services/tokens.js';
import { sendVerificationEmail } from '../services/mail.js';
import { isMailConfigured } from '../mailer.js';
import { saveImage } from '../storage.js';
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
        bio: true,
        twitterUrl: true,
        githubUrl: true,
        steamUrl: true,
        discordUrl: true,
        websiteUrl: true,
        createdAt: true,
        showOnlineStatus: true,
        showLastActive: true,
        lastActiveAt: true,
        birthDate: true,
        showBirthDate: true,
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

    const ONLINE_THRESHOLD_MINUTES = 5;
    const isOnline =
      user.lastActiveAt &&
      Date.now() - user.lastActiveAt.getTime() <
        ONLINE_THRESHOLD_MINUTES * 60 * 1000;

    /* Bakan kişi bu profili engellemiş mi? Arayüz butonu buna göre
       "Engelle" ya da "Engeli Kaldır" gösteriyor; alan dönmediği için
       buton her zaman "Engelle" kalıyor ve engelleme hiçbir şey yapmamış
       gibi görünüyordu. */
    const hasBlocked = req.userId
      ? Boolean(
          await prisma.userBlock.findUnique({
            where: {
              blockerId_blockedId: {
                blockerId: req.userId,
                blockedId: user.id,
              },
            },
          }),
        )
      : false;

    const publicUser = {
      id: user.id,
      hasBlocked,
      username: user.username,
      avatarUrl: user.avatarUrl,
      coverUrl: user.coverUrl,
      bio: user.bio,
      twitterUrl: user.twitterUrl,
      githubUrl: user.githubUrl,
      steamUrl: user.steamUrl,
      discordUrl: user.discordUrl,
      websiteUrl: user.websiteUrl,
      createdAt: user.createdAt,
      isOnline: user.showOnlineStatus ? Boolean(isOnline) : null,
      lastActiveAt: user.showLastActive ? user.lastActiveAt : null,
      birthDate: user.showBirthDate || isOwner ? user.birthDate : null,
    };

    res.json({ user: publicUser, builds, isOwner, wallComments });
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
  verifyImageContents,
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Görsel bulunamadı.' });
        return;
      }

      const avatarUrl = await saveImage(req.file);

      const user = await prisma.user.update({
        where: { id: req.userId! },
        data: { avatarUrl },
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
  verifyImageContents,
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Görsel bulunamadı.' });
        return;
      }

      const coverUrl = await saveImage(req.file);

      const user = await prisma.user.update({
        where: { id: req.userId! },
        data: { coverUrl },
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
router.post(
  '/:username/wall',
  requireAuth,
  requireVerifiedEmail,
  async (req: AuthRequest, res) => {
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

      const isBlocked = await prisma.userBlock.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: profileUser.id,
            blockedId: req.userId!,
          },
        },
      });

      if (isBlocked) {
        res.status(403).json({
          error: 'Bu kullanıcı seni engellemiş, profiline yorum yapamazsın.',
        });
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
  },
);

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
        emailVerified: true,
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
        birthDate: true,
        showBirthDate: true,
        showOnlineStatus: true,
        showLastActive: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }

    /* Giriş yanıtıyla aynı sebep: mail gönderilemiyorken doğrulama
       istenmiyor, dolayısıyla ayarlar sayfası da "doğrulanmadı" demiyor. */
    res.json({
      user: {
        ...user,
        emailVerified: isMailConfigured ? user.emailVerified : true,
      },
    });
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

    /* Adres değişince doğrulama sıfırlanıyor. Aksi halde kendi adresini
       doğrulayıp sonra başka bir adrese geçen biri, sahibi olduğunu hiç
       kanıtlamadığı bir adresle "doğrulanmış" kalırdı — doğrulamayı
       anlamsızlaştıran tam olarak bu boşluk. */
    const updated = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        email: newEmail,
        emailVerified: false,
        emailVerifiedAt: null,
      },
    });

    const token = await createEmailVerificationToken(updated.id);
    await sendVerificationEmail(updated.email, updated.username, token);

    res.json({
      message:
        'E-posta güncellendi. Yeni adresine doğrulama bağlantısı gönderdik.',
      emailVerified: false,
    });
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

// ==============================
// GİZLİLİK AYARLARINI GÜNCELLE
// ==============================
router.patch('/me/privacy', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { birthDate, showBirthDate, showOnlineStatus, showLastActive } =
      req.body;

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        ...(birthDate !== undefined
          ? { birthDate: birthDate ? new Date(birthDate) : null }
          : {}),
        ...(showBirthDate !== undefined ? { showBirthDate } : {}),
        ...(showOnlineStatus !== undefined ? { showOnlineStatus } : {}),
        ...(showLastActive !== undefined ? { showLastActive } : {}),
      },
    });

    res.json({
      message: 'Gizlilik ayarları güncellendi.',
      privacy: {
        birthDate: user.birthDate,
        showBirthDate: user.showBirthDate,
        showOnlineStatus: user.showOnlineStatus,
        showLastActive: user.showLastActive,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// KULLANICIYI ENGELLE
// ==============================
router.post('/:username/block', requireAuth, async (req: AuthRequest, res) => {
  try {
    const username = req.params.username as string;

    const target = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });

    if (!target) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }

    if (target.id === req.userId) {
      res.status(400).json({ error: 'Kendini engelleyemezsin.' });
      return;
    }

    const existing = await prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: { blockerId: req.userId!, blockedId: target.id },
      },
    });

    if (existing) {
      res.status(409).json({ error: 'Bu kullanıcıyı zaten engellemişsin.' });
      return;
    }

    await prisma.userBlock.create({
      data: { blockerId: req.userId!, blockedId: target.id },
    });

    res.status(201).json({ message: 'Kullanıcı engellendi.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// ENGELİ KALDIR
// ==============================
router.delete(
  '/:username/block',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const username = req.params.username as string;

      const target = await prisma.user.findFirst({
        where: { username: { equals: username, mode: 'insensitive' } },
      });

      if (!target) {
        res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        return;
      }

      await prisma.userBlock.delete({
        where: {
          blockerId_blockedId: { blockerId: req.userId!, blockedId: target.id },
        },
      });

      res.json({ message: 'Engel kaldırıldı.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// ENGELLENEN KULLANICILARI LİSTELE
// ==============================
router.get('/me/blocked', requireAuth, async (req: AuthRequest, res) => {
  try {
    const blocks = await prisma.userBlock.findMany({
      where: { blockerId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: {
        blocked: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    res.json({ blocked: blocks.map((b) => b.blocked) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

export default router;

// ==============================
// REAKSİYONLAR: Sistemlerime ve yorumlarıma gelen beğeniler
// ==============================
router.get('/me/reactions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const buildLikes = await prisma.like.findMany({
      where: { build: { userId: req.userId! } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        build: { select: { id: true, name: true } },
      },
    });

    const commentLikes = await prisma.commentLike.findMany({
      where: { comment: { userId: req.userId! } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        comment: { select: { id: true, content: true, buildId: true } },
      },
    });

    const combined = [
      ...buildLikes.map((l) => ({
        type: 'build_like' as const,
        id: l.id,
        createdAt: l.createdAt,
        user: l.user,
        buildId: l.build.id,
        buildName: l.build.name,
        commentContent: null as string | null,
      })),
      ...commentLikes.map((l) => ({
        type: 'comment_like' as const,
        id: l.id,
        createdAt: l.createdAt,
        user: l.user,
        buildId: l.comment.buildId,
        buildName: null as string | null,
        commentContent: l.comment.content,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 30);

    res.json({ reactions: combined });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});
