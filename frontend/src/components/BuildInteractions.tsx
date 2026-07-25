'use client';

import { useState } from 'react';
import Link from 'next/link';
import LikeButton from './LikeButton';
import CommentForm from './CommentForm';
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
} from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
          src={`${API_URL}${avatarUrl}`}
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

export default function BuildInteractions({
  buildId,
  initialLikes,
  initialComments,
}: {
  buildId: string;
  initialLikes: Like[];
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState(initialComments);

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

      <section className="mt-10 pb-16">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold mb-4">
          Yorumlar ({totalCommentCount})
        </h2>

        <CommentForm
          buildId={buildId}
          onCommentAdded={(comment) =>
            setComments((prev) => [{ ...comment, replies: [] }, ...prev])
          }
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
  onUpdated,
  onDeleted,
  onReplyAdded,
}: {
  buildId: string;
  comment: Comment;
  depth: number;
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

  async function handleReply() {
    if (!token || !replyText.trim()) return;
    setIsReplySubmitting(true);
    try {
      const { comment: reply } = await addComment(
        buildId,
        replyText,
        token,
        comment.id,
      );
      onReplyAdded(comment.id, reply);
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
    <div className={depth > 0 ? 'pl-4 border-l-2 border-hairline' : ''}>
      <div className="rounded-xl bg-surface p-4">
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

            {isEditing ? (
              <div className="mt-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-hairline px-3 py-2 text-sm outline-none focus:border-trace transition-colors resize-none bg-paper"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="text-xs rounded-lg bg-ink text-paper px-3 py-1.5 disabled:opacity-50"
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
                    className="text-xs rounded-lg border border-hairline px-3 py-1.5"
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
                {comment.content}
              </p>
            )}

            {!isEditing && (
              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={handleLikeToggle}
                  disabled={!user || isLiking}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    hasLiked ? 'text-trace' : 'text-ink-muted hover:text-trace'
                  } disabled:opacity-50`}
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
                    onClick={() => setIsReplying((v) => !v)}
                    className="text-xs text-ink-muted hover:text-trace transition-colors"
                  >
                    Yanıtla
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-ink-muted hover:text-trace transition-colors"
                  >
                    Düzenle
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={handleDelete}
                    className="text-xs text-ink-muted hover:text-incompatible transition-colors"
                  >
                    Sil
                  </button>
                )}
              </div>
            )}

            {isReplying && (
              <div className="mt-2 flex gap-2">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Yanıt yaz..."
                  className="flex-1 rounded-lg border border-hairline px-3 py-1.5 text-sm outline-none focus:border-trace transition-colors bg-paper"
                />
                <button
                  onClick={handleReply}
                  disabled={isReplySubmitting || !replyText.trim()}
                  className="text-xs rounded-lg bg-ink text-paper px-3 py-1.5 disabled:opacity-50"
                >
                  Gönder
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
