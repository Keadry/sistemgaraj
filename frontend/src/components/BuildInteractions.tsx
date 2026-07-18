'use client';

import { useState } from 'react';
import LikeButton from './LikeButton';
import CommentForm from './CommentForm';
import type { Like, Comment } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { editComment, deleteOwnComment } from '@/lib/api';

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
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

  return (
    <>
      {/* BEĞENİ / YORUM SAYACI */}
      <div className="mt-6 flex items-center gap-3 pb-6 border-b border-hairline">
        <LikeButton buildId={buildId} initialLikes={initialLikes} />
        <span className="text-sm text-ink-muted">{comments.length} yorum</span>
      </div>

      {/* YORUMLAR */}
      <section className="mt-10 pb-16">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold mb-4">
          Yorumlar ({comments.length})
        </h2>

        <CommentForm
          buildId={buildId}
          onCommentAdded={(comment) =>
            setComments((prev) => [comment, ...prev])
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
                onUpdated={(updated) =>
                  setComments((prev) =>
                    prev.map((c) => (c.id === updated.id ? updated : c)),
                  )
                }
                onDeleted={(id) =>
                  setComments((prev) => prev.filter((c) => c.id !== id))
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
  onUpdated,
  onDeleted,
}: {
  buildId: string;
  comment: Comment;
  onUpdated: (comment: Comment) => void;
  onDeleted: (id: string) => void;
}) {
  const { user, token } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEdit = user?.id === comment.user.id;

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
      onUpdated(updated);
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
    if (!confirm('Bu yorumu silmek istediğine emin misin?')) return;
    try {
      await deleteOwnComment(buildId, comment.id, token);
      onDeleted(comment.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu.');
    }
  }

  return (
    <div className="rounded-xl bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">
          {comment.user.username ?? 'Anonim'}
        </span>
        <span className="text-xs text-ink-muted font-[family-name:var(--font-mono)]">
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
          {error && <p className="text-xs text-incompatible mt-2">{error}</p>}
        </div>
      ) : (
        <>
          <p className="text-sm text-ink mt-2 leading-relaxed">
            {comment.content}
          </p>
          {canEdit && (
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-ink-muted hover:text-trace transition-colors"
              >
                Düzenle
              </button>
              <button
                onClick={handleDelete}
                className="text-xs text-ink-muted hover:text-incompatible transition-colors"
              >
                Sil
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
