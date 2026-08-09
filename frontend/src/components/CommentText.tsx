'use client';

import Link from 'next/link';
import type { CommentMention } from '@/lib/api';

/**
 * Yorum metnini, içindeki `@kullanıcı` etiketlerini profil bağlantısına
 * çevirerek yazar.
 *
 * Yalnızca sunucunun çözümlediği adlar bağlantıya dönüyor. Metindeki her
 * `@...` parçasını bağlantı yapmak daha kolaydı ama yanlış yazılmış bir
 * etiket ("@ahmettt") tıklanabilir görünüp 404'e giderdi — bağlantı gibi
 * duran ama hiçbir yere gitmeyen bir şey, düz metinden kötü.
 */

/** Sunucudaki desenle aynı (bkz. `services/mentions.ts`). İkisi ayrışırsa
 *  bildirim gidip bağlantı çıkmayan (veya tersi) etiketler oluşur. */
const MENTION_PATTERN = /(?<!\w)@([a-zA-Z0-9_]{3,20})/g;

export default function CommentText({
  content,
  mentions,
}: {
  content: string;
  mentions?: CommentMention[];
}) {
  if (!mentions || mentions.length === 0) {
    return <>{content}</>;
  }

  /* Küçük harfle eşleştirip özgün yazımı saklıyoruz: kullanıcı "@AHMET"
     yazsa da bağlantı hesabın gerçek yazımına gitmeli. */
  const byLowercase = new Map(
    mentions.map((mention) => [
      mention.user.username.toLowerCase(),
      mention.user.username,
    ]),
  );

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of content.matchAll(MENTION_PATTERN)) {
    const username = byLowercase.get(match[1]!.toLowerCase());
    if (!username) continue;

    const start = match.index!;
    if (start > cursor) parts.push(content.slice(cursor, start));

    parts.push(
      <Link
        key={`${start}-${username}`}
        href={`/kullanici/${username}`}
        className="font-semibold text-trace hover:underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-trace"
      >
        @{username}
      </Link>,
    );

    cursor = start + match[0].length;
  }

  if (cursor < content.length) parts.push(content.slice(cursor));

  return <>{parts}</>;
}
