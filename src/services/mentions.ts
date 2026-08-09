import { prisma } from '../db.js';

/**
 * Yorum metnindeki `@kullanıcı` etiketlerini çözümleyip saklar.
 *
 * Çözümleme yazma anında bir kez yapılıyor ve `CommentMention` satırlarına
 * yazılıyor. Alternatif her okumada metni yeniden ayrıştırmaktı; o yol iki
 * yerde bozuluyor: her okuma yolunun aynı ayrıştırmayı tekrar etmesi
 * gerekirdi, ve yorum düzenlenince kimin daha önce bildirim aldığı
 * bilinemediği için aynı kişiye ikinci bildirim giderdi.
 */

/**
 * Kullanıcı adları kayıtta `[a-zA-Z0-9_]{3,20}` ile sınırlı; desen aynı
 * kümeyi kullanıyor.
 *
 * Baştaki geriye bakış, `@`nin bir kelimenin ortasında olmadığını garanti
 * ediyor: onsuz `birisi@ornek.com` gibi bir metin `@ornek` diye okunup
 * "ornek" adlı kullanıcıya bildirim gönderiyordu.
 */
const MENTION_PATTERN = /(?<!\w)@([a-zA-Z0-9_]{3,20})/g;

/**
 * Tek yorumda kaç kişi etiketlenebilir. Sınır olmadan tek yorumla yüzlerce
 * kişiye bildirim göndermek mümkün — etiketleme bir hitap yolu, duyuru
 * kanalı değil.
 */
const MAX_MENTIONS = 10;

/** Metindeki etiketleri döndürür: küçük harfe indirgenmiş, tekilleştirilmiş
 *  ve sınırla kırpılmış. */
export function parseMentionedUsernames(content: string): string[] {
  const seen = new Set<string>();

  for (const match of content.matchAll(MENTION_PATTERN)) {
    seen.add(match[1]!.toLowerCase());
    if (seen.size >= MAX_MENTIONS) break;
  }

  return [...seen];
}

type MentionedUser = { id: string; username: string };

/**
 * Etiketleri gerçek hesaplara çevirir. Karşılığı olmayan etiketler sessizce
 * düşüyor — kullanıcı adı yanlış yazılmış olabilir, bu bir hata değil.
 */
async function resolveUsernames(
  usernames: string[],
  authorId: string,
): Promise<MentionedUser[]> {
  if (usernames.length === 0) return [];

  /* `in` yerine `OR` + duyarsız `equals`: kullanıcı adı eşleşmesi kayıt ve
     giriş akışlarında da büyük/küçük harfe duyarsız, etiketleme farklı
     davranırsa "@Ahmet" ile "@ahmet" aynı kişiyi bulmaz. Liste zaten
     MAX_MENTIONS ile sınırlı, dal sayısı küçük kalıyor. */
  const users = await prisma.user.findMany({
    where: {
      OR: usernames.map((username) => ({
        username: { equals: username, mode: 'insensitive' as const },
      })),
    },
    select: { id: true, username: true },
  });

  // Kendini etiketlemek bildirim üretmez; `createNotification` bunu zaten
  // eliyor ama burada da düşürüyoruz ki satır bile yazılmasın.
  const others = users.filter((user) => user.id !== authorId);
  if (others.length === 0) return [];

  /* Engelleyen kişiye etiketle ulaşılamaz. Engel, yorum yazmayı zaten
     kapatıyor (bkz. comments.ts) ama o kontrol sistem sahibi için;
     üçüncü bir kişinin engellediği biri onu başka bir sistemin altında
     etiketleyerek yine karşısına çıkabilirdi. */
  const blocks = await prisma.userBlock.findMany({
    where: { blockerId: { in: others.map((u) => u.id) }, blockedId: authorId },
    select: { blockerId: true },
  });
  const blockedBy = new Set(blocks.map((block) => block.blockerId));

  return others.filter((user) => !blockedBy.has(user.id));
}

/**
 * Yorumun etiket satırlarını metinle eşitler.
 *
 * İki liste döndürüyor çünkü iki farklı iş var: `added` bildirim gönderilecek
 * kişiler (yalnızca yeni eklenenler), `all` ise yanıtla istemciye dönecek tam
 * liste — istemci `@ad` parçalarını yalnızca bu listeye bakarak bağlantıya
 * çeviriyor, eksik gelirse yeni yorumdaki etiket sayfa yenilenene kadar düz
 * metin kalıyor.
 *
 * Düzenlemede de çağrılıyor: metinden çıkarılan etiketin satırı siliniyor,
 * eklenen etiket bildirim üretiyor, yerinde duran etiket ikinci kez
 * bildirilmiyor.
 */
export async function syncCommentMentions({
  commentId,
  content,
  authorId,
}: {
  commentId: string;
  content: string;
  authorId: string;
}): Promise<{ added: MentionedUser[]; all: MentionedUser[] }> {
  const mentioned = await resolveUsernames(
    parseMentionedUsernames(content),
    authorId,
  );

  const existing = await prisma.commentMention.findMany({
    where: { commentId },
    select: { userId: true },
  });
  const existingIds = new Set(existing.map((row) => row.userId));
  const currentIds = new Set(mentioned.map((user) => user.id));

  const added = mentioned.filter((user) => !existingIds.has(user.id));
  const removedIds = [...existingIds].filter((id) => !currentIds.has(id));

  if (added.length > 0) {
    await prisma.commentMention.createMany({
      data: added.map((user) => ({ commentId, userId: user.id })),
      // Aynı yorum iki kez kaydedilirse (çift tıklama, yeniden deneme)
      // tekrar eden satır hata fırlatmasın.
      skipDuplicates: true,
    });
  }

  if (removedIds.length > 0) {
    await prisma.commentMention.deleteMany({
      where: { commentId, userId: { in: removedIds } },
    });
  }

  return { added, all: mentioned };
}
