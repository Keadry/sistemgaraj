import { prisma } from '../db.js';
import type { NotificationType } from '../generated/prisma/client.js';

/**
 * Bildirim üretimi.
 *
 * Tek giriş noktası olması bilinçli: kendine bildirim göndermeme ve kullanıcı
 * tercihlerine uyma kuralları her çağrı noktasında tekrar yazılsaydı, biri
 * eksik kalır ve fark edilmezdi — sessizce yanlış çalışan bir bildirim
 * sistemi, hiç olmayandan daha kötü.
 */

type CreateInput = {
  /** Bildirimi alacak kişi. */
  userId: string;
  type: NotificationType;
  /** Eylemi yapan. Moderasyon ve duyurularda yok. */
  actorId?: string | null;
  buildId?: string | null;
  commentId?: string | null;
  /** Yalnızca duyurularda kullanılıyor. */
  message?: string | null;
};

/** Hangi tercih hangi türü susturuyor. Listede olmayan türler her zaman
 *  gönderiliyor: moderasyon sonucu ve duyuru kapatılabilir şeyler değil. */
const PREFERENCE_BY_TYPE: Partial<
  Record<NotificationType, 'notifyOnBuildComment' | 'notifyOnBuildLike'>
> = {
  BUILD_COMMENT: 'notifyOnBuildComment',
  COMMENT_REPLY: 'notifyOnBuildComment',
  BUILD_LIKE: 'notifyOnBuildLike',
  COMMENT_LIKE: 'notifyOnBuildLike',
};

export async function createNotification(input: CreateInput): Promise<void> {
  try {
    // Kendi eylemin sana bildirilmez. Kendi sistemini beğenince bildirim
    // almak, listeyi işe yaramaz hale getiren türden bir gürültü.
    if (input.actorId && input.actorId === input.userId) return;

    const preferenceKey = PREFERENCE_BY_TYPE[input.type];
    if (preferenceKey) {
      // İki tercihi birlikte çekiyoruz: `select`i anahtara göre dinamik
      // kurmak Prisma'nın ürettiği tipleri kaybettiriyor ve `as` zinciri
      // gerektiriyordu. İki boolean okumanın maliyeti ölçülebilir değil.
      const recipient = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { notifyOnBuildComment: true, notifyOnBuildLike: true },
      });
      if (!recipient || recipient[preferenceKey] === false) return;
    }

    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        actorId: input.actorId ?? null,
        buildId: input.buildId ?? null,
        commentId: input.commentId ?? null,
        message: input.message ?? null,
      },
    });
  } catch (error) {
    // Bildirim yan etki; başarısız olması onu tetikleyen işlemi (yorum
    // yazma, beğenme) bozmamalı. Ama sessiz de kalmıyor.
    console.error('[notifications] oluşturulamadı:', error);
  }
}
