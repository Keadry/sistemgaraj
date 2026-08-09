'use client';

import { useState } from 'react';
import Link from 'next/link';
import LikeButton from './LikeButton';
import CommentForm from './CommentForm';
import CommentText from './CommentText';
import MentionTextarea, { type MentionCandidate } from './MentionTextarea';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';
import { useAuth } from '@/lib/auth-context';
import {
  editComment,
  deleteOwnComment,
  likeComment,
  unlikeComment,
  addComment,
  type Like,
  type Comment,
  type BuildUser,
  type TaggedComponent,
} from '@/lib/api';

import { imageUrl } from '@/lib/image-url';
import { componentTypeLabel } from '@/lib/component-labels';

/* Yorum altındaki metin butonları (beğen / yanıtla / düzenle / sil) aynı
   davranışı paylaşıyor. Tek sabitte toplandı çünkü beşinde de focus
   göstergesi yoktu — klavyeyle gezerken hiçbiri görünmüyordu. */
const ACTION_BUTTON =
  'text-xs rounded px-0.5 transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace';

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

function Avatar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl: string | null;
}) {
  return (
    <Link
      href={`/kullanici/${username}`}
      className="w-8 h-8 rounded-full bg-trace/10 border border-hairline flex items-center justify-center shrink-0 overflow-hidden"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl(avatarUrl)}
          alt={username}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-[family-name:var(--font-display)] text-xs font-semibold text-trace">
          {username.charAt(0).toUpperCase()}
        </span>
      )}
    </Link>
  );
}

/** Sohbetteki herkes: sistem sahibi + her derinlikteki yorum yazarları.
 *  `@` önerileri bu listeden geliyor.
 *
 *  Oturumdaki kullanıcı listede yok: kendini etiketlemek bildirim üretmiyor
 *  (bkz. `services/notifications.ts`), yani öneri hiçbir işe yaramayan bir
 *  seçenek olurdu. */
function collectParticipants(
  comments: Comment[],
  owner: BuildUser,
  currentUserId?: string,
): MentionCandidate[] {
  const byId = new Map<string, MentionCandidate>([
    [owner.id, { id: owner.id, username: owner.username }],
  ]);

  function walk(list: Comment[]) {
    for (const comment of list) {
      byId.set(comment.user.id, {
        id: comment.user.id,
        username: comment.user.username,
      });
      walk(comment.replies ?? []);
    }
  }
  walk(comments);

  if (currentUserId) byId.delete(currentUserId);

  return [...byId.values()];
}

export default function BuildInteractions({
  buildId,
  owner,
  initialLikes,
  initialComments,
  taggedComponent,
  onClearTag,
}: {
  buildId: string;
  owner: BuildUser;
  initialLikes: Like[];
  initialComments: Comment[];
  /** Parça listesindeki "sor" düğmesiyle seçilen parça. */
  taggedComponent?: TaggedComponent | null;
  onClearTag?: () => void;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const mentionCandidates = collectParticipants(comments, owner, user?.id);

  function updateCommentTree(
    list: Comment[],
    id: string,
    updater: (c: Comment) => Comment,
  ): Comment[] {
    return list.map((c) => {
      if (c.id === id) return updater(c);
      const replies = c.replies ?? [];
      if (replies.length > 0) {
        return { ...c, replies: updateCommentTree(replies, id, updater) };
      }
      return { ...c, replies };
    });
  }

  function removeCommentFromTree(list: Comment[], id: string): Comment[] {
    return list
      .filter((c) => c.id !== id)
      .map((c) => ({
        ...c,
        replies: removeCommentFromTree(c.replies ?? [], id),
      }));
  }

  const totalCommentCount = comments.reduce(
    (sum, c) => sum + 1 + (c.replies?.length ?? 0),
    0,
  );

  return (
    <>
      <div className="mt-6 flex items-center gap-3 pb-6 border-b border-hairline">
        <LikeButton buildId={buildId} initialLikes={initialLikes} />
        <span className="text-sm text-ink-muted">
          {totalCommentCount} yorum
        </span>
      </div>

      {/* Parça listesindeki "Sor" düğmesi buraya kaydırıyor. */}
      <section id="yorumlar" className="mt-10 pb-16 scroll-mt-24">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold mb-4">
          Yorumlar ({totalCommentCount})
        </h2>

        <CommentForm
          buildId={buildId}
          onCommentAdded={(comment) =>
            setComments((prev) => [{ ...comment, replies: [] }, ...prev])
          }
          taggedComponent={taggedComponent}
          onClearTag={onClearTag}
          mentionCandidates={mentionCandidates}
        />

        {comments.length === 0 ? (
          <p className="text-ink-muted text-sm">
            Henüz yorum yok. İlk yorumu sen yaz.
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                buildId={buildId}
                comment={comment}
                depth={0}
                mentionCandidates={mentionCandidates}
                onUpdated={(updated) =>
                  setComments((prev) =>
                    updateCommentTree(prev, updated.id, () => updated),
                  )
                }
                onDeleted={(id) =>
                  setComments((prev) => removeCommentFromTree(prev, id))
                }
                onReplyAdded={(parentId, reply) =>
                  setComments((prev) =>
                    updateCommentTree(prev, parentId, (c) => ({
                      ...c,
                      replies: [
                        ...(c.replies ?? []),
                        { ...reply, replies: [] },
                      ],
                    })),
                  )
                }
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function CommentItem({
  buildId,
  comment,
  depth,
  mentionCandidates,
  onUpdated,
  onDeleted,
  onReplyAdded,
}: {
  buildId: string;
  comment: Comment;
  depth: number;
  mentionCandidates: MentionCandidate[];
  onUpdated: (comment: Comment) => void;
  onDeleted: (id: string) => void;
  onReplyAdded: (parentId: string, reply: Comment) => void;
}) {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const confirmDialog = useConfirm();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);

  const [isLiking, setIsLiking] = useState(false);

  const canEdit = user?.id === comment.user.id;
  const hasLiked = user
    ? comment.likes.some((l) => l.userId === user.id)
    : false;

  async function handleSave() {
    if (!token || !editText.trim()) return;
    setIsSubmitting(true);
    setInfo(null);
    setError(null);
    try {
      const { comment: updated, message } = await editComment(
        buildId,
        comment.id,
        editText,
        token,
      );
      onUpdated({ ...comment, ...updated });
      if (updated.status === 'PENDING') {
        setInfo(message);
      } else {
        setIsEditing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!token) return;
    const ok = await confirmDialog({
      title: 'Yorumu sil',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;

    try {
      await deleteOwnComment(buildId, comment.id, token);
      onDeleted(comment.id);
      showToast('Yorum silindi.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    }
  }

  /* Yanıt kutusu `@yazar ` ile açılıyor. İki işi birden yapıyor: etiketin
     var olduğunu gösteriyor (kimse belgelenmemiş bir söz dizimini kendi
     kendine denemez) ve yanıtın hedefine bildirim gitmesini sağlıyor.
     Kendine yanıt verirken eklenmiyor — kendini etiketlemek bildirim
     üretmiyor, yalnızca gürültü olurdu. Kullanıcı silebilir. */
  function handleReplyToggle() {
    const next = !isReplying;
    setIsReplying(next);
    if (next && !replyText && comment.user.id !== user?.id) {
      setReplyText(`@${comment.user.username} `);
    }
  }

  async function handleReply() {
    if (!token || !replyText.trim()) return;
    setIsReplySubmitting(true);
    try {
      const { comment: reply, message } = await addComment(
        buildId,
        replyText,
        token,
        comment.id,
      );

      // Moderasyona düşen yanıt yayınlanmış sayılmamalı. Eskiden durum
      // kontrol edilmeden listeye ekleniyordu: kullanıcı yanıtını ekranda
      // görüyor, sayfayı yenileyince kayboluyordu — çünkü sunucu yalnızca
      // APPROVED yanıtları döndürüyor. Üst seviye yorum formu bu ayrımı
      // zaten yapıyordu, yanıt akışı atlamış.
      if (reply.status === 'APPROVED') {
        onReplyAdded(comment.id, reply);
      } else {
        showToast(message, 'info');
      }

      setReplyText('');
      setIsReplying(false);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setIsReplySubmitting(false);
    }
  }

  async function handleLikeToggle() {
    if (!user || !token) return;
    setIsLiking(true);
    try {
      if (hasLiked) {
        await unlikeComment(buildId, comment.id, token);
        onUpdated({
          ...comment,
          likes: comment.likes.filter((l) => l.userId !== user.id),
        });
      } else {
        await likeComment(buildId, comment.id, token);
        onUpdated({
          ...comment,
          likes: [...comment.likes, { id: 'temp', userId: user.id }],
        });
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setIsLiking(false);
    }
  }

  return (
    /* Yanıtlar mor bir izle bağlanıyor: çizgi yorumu kendi yanıtlarıyla
       birlikte kapsıyor, yani zincirin nereye ait olduğu görünüyor.
       Derinlik arttıkça kutu hafifliyor — üst seviye dolgulu, yanıtlar
       yalnızca kenarlıklı. Hepsi dolgulu olsaydı iç içe bloklar üst üste
       yığılıp okunmaz hale geliyordu. */
    <div className={depth > 0 ? 'relative pl-5' : ''}>
      {depth > 0 && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 border-l border-trace/30"
        />
      )}
      <div
        className={
          depth === 0
            ? 'rounded-xl bg-surface p-4'
            : 'rounded-xl border border-hairline bg-paper p-3.5'
        }
      >
        <div className="flex items-start gap-3">
          <Avatar
            username={comment.user.username}
            avatarUrl={comment.user.avatarUrl}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/kullanici/${comment.user.username}`}
                className="font-medium text-sm hover:text-trace transition-colors"
              >
                @{comment.user.username}
              </Link>
              <span className="text-xs text-ink-muted font-[family-name:var(--font-mono)] shrink-0">
                {formatDate(comment.createdAt)}
              </span>
            </div>

            {/* Yorumun hangi parça hakkında olduğu, metinden önce: soru
                okunmaya başlamadan önce konusu belli olmalı. */}
            {comment.component && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-trace/30 bg-trace/5 px-2 py-1 max-w-full">
                <span className="text-[10px] font-bold uppercase tracking-wider text-trace font-[family-name:var(--font-mono)] shrink-0">
                  {componentTypeLabel(comment.component.type)}
                </span>
                <span className="text-[11px] text-ink truncate">
                  {comment.component.brand} {comment.component.name}
                </span>
              </p>
            )}

            {isEditing ? (
              <div className="mt-2">
                <MentionTextarea
                  value={editText}
                  onChange={setEditText}
                  candidates={mentionCandidates}
                  rows={2}
                  className="w-full rounded-lg border border-hairline px-3 py-2 text-sm outline-none focus:border-trace transition-colors resize-none bg-paper"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="text-xs rounded-lg bg-ink text-paper px-3 py-1.5 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => {
                      setEditText(comment.content);
                      setIsEditing(false);
                      setInfo(null);
                      setError(null);
                    }}
                    className="text-xs rounded-lg border border-hairline px-3 py-1.5 hover:border-trace transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
                  >
                    Vazgeç
                  </button>
                </div>
                {info && <p className="text-xs text-trace mt-2">{info}</p>}
                {error && (
                  <p className="text-xs text-incompatible mt-2">{error}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink mt-1 leading-relaxed break-words">
                <CommentText
                  content={comment.content}
                  mentions={comment.mentions}
                />
              </p>
            )}

            {!isEditing && (
              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={handleLikeToggle}
                  disabled={!user || isLiking}
                  aria-pressed={hasLiked}
                  className={`${ACTION_BUTTON} flex items-center gap-1 ${
                    hasLiked ? 'text-trace' : 'text-ink-muted hover:text-trace'
                  }`}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill={hasLiked ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {comment.likes.length > 0 && comment.likes.length}
                </button>

                {user && depth < 2 && (
                  <button
                    onClick={handleReplyToggle}
                    aria-expanded={isReplying}
                    className={`${ACTION_BUTTON} text-ink-muted hover:text-trace`}
                  >
                    Yanıtla
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`${ACTION_BUTTON} text-ink-muted hover:text-trace`}
                  >
                    Düzenle
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={handleDelete}
                    className={`${ACTION_BUTTON} text-ink-muted hover:text-incompatible focus-visible:outline-incompatible`}
                  >
                    Sil
                  </button>
                )}
              </div>
            )}

            {isReplying && (
              /* Alan ve düğme yan yana değil alt alta: öneri paneli metin
                 alanının altına açılıyor, yan yana dizilişte düğmenin
                 üstüne biniyordu. */
              <div className="mt-2">
                <MentionTextarea
                  value={replyText}
                  onChange={setReplyText}
                  candidates={mentionCandidates}
                  placeholder="Yanıt yaz... (@ ile birini etiketleyebilirsin)"
                  rows={2}
                  autoFocus
                  className="w-full rounded-lg border border-hairline px-3 py-1.5 text-sm outline-none focus:border-trace transition-colors bg-paper resize-none"
                />
                <button
                  onClick={handleReply}
                  disabled={isReplySubmitting || !replyText.trim()}
                  className="mt-2 text-xs rounded-lg bg-ink text-paper px-3 py-1.5 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
                >
                  {isReplySubmitting ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {(comment.replies ?? []).length > 0 && (
        <div className="mt-3 space-y-3">
          {(comment.replies ?? []).map((reply) => (
            <CommentItem
              key={reply.id}
              buildId={buildId}
              comment={reply}
              depth={depth + 1}
              mentionCandidates={mentionCandidates}
              onUpdated={onUpdated}
              onDeleted={onDeleted}
              onReplyAdded={onReplyAdded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
