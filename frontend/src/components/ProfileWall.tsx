'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';
import {
  postWallComment,
  deleteWallComment,
  type WallComment,
} from '@/lib/api';

import { imageUrl } from '@/lib/image-url';

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
    <div className="w-9 h-9 rounded-full bg-trace/10 border border-hairline flex items-center justify-center shrink-0 overflow-hidden">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl(avatarUrl)}
          alt={username}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-[family-name:var(--font-display)] text-sm font-semibold text-trace">
          {username.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  profileUsername,
  profileUserId,
  onReplyAdded,
  onDeleted,
}: {
  comment: WallComment;
  profileUsername: string;
  profileUserId: string;
  onReplyAdded: (parentId: string, reply: WallComment) => void;
  onDeleted: (id: string) => void;
}) {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const confirmDialog = useConfirm();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canDelete =
    user &&
    (user.id === comment.author.id ||
      user.id === profileUserId ||
      user.role === 'MODERATOR' ||
      user.role === 'ADMIN');

  async function handleReply() {
    if (!token || !replyText.trim()) return;
    setIsSubmitting(true);
    try {
      const reply = await postWallComment(
        profileUsername,
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
      await deleteWallComment(comment.id, token);
      onDeleted(comment.id);
      showToast('Yorum silindi.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    }
  }

  return (
    <div>
      <div className="flex gap-3">
        <Avatar
          username={comment.author.username}
          avatarUrl={comment.author.avatarUrl}
        />
        <div className="flex-1 min-w-0">
          <div className="bg-surface rounded-xl px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <a
                href={`/kullanici/${comment.author.username}`}
                className="text-sm font-medium hover:text-trace transition-colors"
              >
                @{comment.author.username}
              </a>
              <span className="text-[11px] text-ink-muted shrink-0">
                {formatDate(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm text-ink mt-1 leading-relaxed break-words">
              {comment.content}
            </p>
          </div>

          <div className="flex items-center gap-3 mt-1.5 ml-1">
            {user && (
              <button
                onClick={() => setIsReplying((v) => !v)}
                className="text-xs text-ink-muted hover:text-trace transition-colors"
              >
                Yanıtla
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="text-xs text-ink-muted hover:text-incompatible transition-colors"
              >
                Sil
              </button>
            )}
          </div>

          {isReplying && (
            <div className="mt-2 flex gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Yanıt yaz..."
                className="flex-1 rounded-lg border border-hairline px-3 py-1.5 text-sm outline-none focus:border-trace transition-colors"
              />
              <button
                onClick={handleReply}
                disabled={isSubmitting || !replyText.trim()}
                className="text-xs rounded-lg bg-ink text-paper px-3 py-1.5 disabled:opacity-50"
              >
                Gönder
              </button>
            </div>
          )}

          {comment.replies.length > 0 && (
            <div className="mt-3 space-y-3 pl-2 border-l-2 border-hairline">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex gap-3 pl-3">
                  <Avatar
                    username={reply.author.username}
                    avatarUrl={reply.author.avatarUrl}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="bg-surface rounded-xl px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <a
                          href={`/kullanici/${reply.author.username}`}
                          className="text-sm font-medium hover:text-trace transition-colors"
                        >
                          @{reply.author.username}
                        </a>
                        <span className="text-[11px] text-ink-muted shrink-0">
                          {formatDate(reply.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-ink mt-1 leading-relaxed break-words">
                        {reply.content}
                      </p>
                    </div>
                    {(user?.id === reply.author.id ||
                      user?.id === profileUserId ||
                      user?.role === 'MODERATOR' ||
                      user?.role === 'ADMIN') && (
                      <button
                        onClick={async () => {
                          if (!token) return;
                          const ok = await confirmDialog({
                            title: 'Yanıtı sil',
                            confirmLabel: 'Sil',
                            danger: true,
                          });
                          if (!ok) return;
                          try {
                            await deleteWallComment(reply.id, token);
                            onDeleted(reply.id);
                            showToast('Yanıt silindi.', 'success');
                          } catch (err) {
                            showToast(
                              err instanceof Error
                                ? err.message
                                : 'Bir hata oluştu.',
                              'error',
                            );
                          }
                        }}
                        className="text-xs text-ink-muted hover:text-incompatible transition-colors mt-1 ml-1"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfileWall({
  username,
  profileUserId,
  initialComments,
}: {
  username: string;
  profileUserId: string;
  initialComments: WallComment[];
}) {
  const { user, token } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handlePost() {
    if (!token || !newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const comment = await postWallComment(username, newComment, token);
      setComments((prev) => [{ ...comment, replies: [] }, ...prev]);
      setNewComment('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReplyAdded(parentId: string, reply: WallComment) {
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId ? { ...c, replies: [...c.replies, reply] } : c,
      ),
    );
  }

  function handleDeleted(id: string) {
    setComments((prev) =>
      prev
        .filter((c) => c.id !== id)
        .map((c) => ({
          ...c,
          replies: c.replies.filter((r) => r.id !== id),
        })),
    );
  }

  return (
    <section className="mt-10">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold mb-4">
        Profil Duvarı
      </h2>

      {user ? (
        <div className="flex gap-2 mb-6">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Bir soru sor ya da yorum bırak..."
            className="flex-1 rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors"
          />
          <button
            onClick={handlePost}
            disabled={isSubmitting || !newComment.trim()}
            className="rounded-xl bg-ink text-paper text-sm font-medium px-5 py-2.5 hover:bg-trace transition-colors disabled:opacity-50"
          >
            Gönder
          </button>
        </div>
      ) : (
        <p className="text-sm text-ink-muted mb-6">
          Yorum yapmak için{' '}
          <a href="/giris" className="text-trace hover:underline">
            giriş yap
          </a>
          .
        </p>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Henüz kimse yorum bırakmamış. İlk yorumu sen yaz!
        </p>
      ) : (
        <div className="space-y-5">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              profileUsername={username}
              profileUserId={profileUserId}
              onReplyAdded={handleReplyAdded}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </section>
  );
}
