import { Router } from 'express';
import { prisma } from '../../db.js';
import { requireAuth, type AuthRequest } from '../../middleware/auth.js';
import { containsBannedWord } from '../../services/moderation.js';
import { createNotification } from '../../services/notifications.js';
import { syncCommentMentions } from '../../services/mentions.js';

const router = Router();

// ==============================
// YORUM EKLE
// ==============================
router.post('/:id/comments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const buildId = req.params.id as string;
    const { content, parentId, componentId } = req.body;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: 'Yorum içeriği boş olamaz.' });
      return;
    }

    /* Parça etiketi yalnızca üst seviye yorumlarda. Yanıt, konusu zaten
       belirlenmiş bir sohbetin içi — orada ikinci bir konu başlığı açmak
       hem bildirimi belirsizleştirir (yanıt mı, parça sorusu mu?) hem de
       arayüzde iki farklı bağlam üst üste biner. */
    if (componentId && parentId) {
      res.status(400).json({
        error: 'Parça etiketi yalnızca üst seviye yorumlarda kullanılabilir.',
      });
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

    /* Etiketlenen parçanın bu sistemde bulunduğu doğrulanıyor. Kontrol
       olmasa istemci herhangi bir parça id'si gönderip, o sistemde
       bulunmayan bir parça hakkında soru sormuş gibi görünebilirdi. */
    if (componentId) {
      const inBuild = await prisma.buildComponent.findUnique({
        where: { buildId_componentId: { buildId, componentId } },
      });
      if (!inBuild) {
        res
          .status(400)
          .json({ error: 'Etiketlenen parça bu sistemde bulunmuyor.' });
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
        componentId: componentId || null,
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        likes: true,
        component: {
          select: { id: true, brand: true, name: true, type: true },
        },
      },
    });

    let mentionsForResponse: { user: { id: string; username: string } }[] = [];

    /* Yalnızca yayına giren yorumlar bildiriliyor. İncelemedeki bir yorum
       için sahibine haber vermek, tıklayınca göremeyeceği bir şeye
       yönlendirmek olurdu.

       Etiket satırları da aynı koşulda yazılıyor: incelemede takılan bir
       yorumun etiketleri kimseye görünmüyor, yayına girerse zaten
       moderasyon akışı yeniden eşitliyor. */
    if (status === 'APPROVED') {
      /* Bir yorum için bir kişiye bir bildirim. Sistem sahibini kendi
         sisteminin altında etiketlemek, aksi halde aynı yorum için iki
         bildirim gönderirdi — biri "yorum geldi", biri "etiketlendin". */
      const alreadyNotified = new Set<string>();

      if (parentId) {
        const parent = await prisma.comment.findUnique({
          where: { id: parentId },
          select: { userId: true },
        });
        if (parent) {
          alreadyNotified.add(parent.userId);
          await createNotification({
            userId: parent.userId,
            type: 'COMMENT_REPLY',
            actorId: req.userId!,
            buildId,
            commentId: comment.id,
          });
        }
      } else {
        alreadyNotified.add(build.userId);
        await createNotification({
          userId: build.userId,
          // Parça etiketliyse sahibine "şu parça hakkında" diyen tür
          // gidiyor. İkisini birlikte göndermek aynı yorumu iki kez
          // duyurmak olurdu.
          type: componentId ? 'BUILD_PART_COMMENT' : 'BUILD_COMMENT',
          actorId: req.userId!,
          buildId,
          commentId: comment.id,
        });
      }

      const { added, all } = await syncCommentMentions({
        commentId: comment.id,
        content,
        authorId: req.userId!,
      });

      for (const user of added) {
        if (alreadyNotified.has(user.id)) continue;
        await createNotification({
          userId: user.id,
          type: 'MENTION',
          actorId: req.userId!,
          buildId,
          commentId: comment.id,
        });
      }

      /* Etiketler yoruma yanıtta da dönüyor. İstemci yeni yorumu listeye
         sunucuya tekrar sormadan ekliyor; bu alan olmasa etiket, sayfa
         yenilenene kadar bağlantı değil düz metin olarak görünürdü. */
      mentionsForResponse = all.map((user) => ({
        user: { id: user.id, username: user.username },
      }));
    }

    res.status(201).json({
      message:
        status === 'PENDING'
          ? 'Yorumun incelemeye alındı, onaylandıktan sonra görünecek.'
          : 'Yorum eklendi',
      comment: { ...comment, mentions: mentionsForResponse },
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
        include: {
          user: { select: { id: true, username: true } },
          component: {
            select: { id: true, brand: true, name: true, type: true },
          },
        },
      });

      let mentionsForResponse: { user: { id: string; username: string } }[] =
        [];

      /* Düzenleme etiketleri de değiştirebiliyor. Eşitleyici yeni eklenenleri
         ayrı döndürüyor: metinde baştan beri duran bir etiket, her
         düzeltmede o kişiye tekrar bildirim göndermez. */
      if (status === 'APPROVED') {
        const { added, all } = await syncCommentMentions({
          commentId,
          content,
          authorId: req.userId!,
        });

        mentionsForResponse = all.map((user) => ({
          user: { id: user.id, username: user.username },
        }));

        /* Bu yorum için kimin zaten bildirimi varsa atlanıyor — aynı kural
           yorum ilk yazılırken de uygulanıyor. Sistem sahibi yorumun
           kendisi için haber almışken, düzenlemeyle adı eklendiğinde ikinci
           bir bildirim alması aynı olayı iki kez duyurmak olurdu.

           Burada bellekteki bir kümeyle değil sorguyla bakılıyor: yorum
           kaç kez düzenlenirse düzenlensin, daha önce gönderilmiş her
           bildirim görünür kalıyor. */
        if (added.length > 0) {
          const existing = await prisma.notification.findMany({
            where: {
              commentId,
              userId: { in: added.map((user) => user.id) },
            },
            select: { userId: true },
          });
          const notified = new Set(existing.map((row) => row.userId));

          for (const user of added) {
            if (notified.has(user.id)) continue;
            await createNotification({
              userId: user.id,
              type: 'MENTION',
              actorId: req.userId!,
              buildId: comment.buildId,
              commentId,
            });
          }
        }
      }

      res.json({
        message:
          status === 'PENDING'
            ? 'Yorumun tekrar incelemeye alındı.'
            : 'Yorum güncellendi.',
        comment: { ...updated, mentions: mentionsForResponse },
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

      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { userId: true, buildId: true },
      });
      if (comment) {
        await createNotification({
          userId: comment.userId,
          type: 'COMMENT_LIKE',
          actorId: req.userId!,
          buildId: comment.buildId,
          commentId,
        });
      }

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
