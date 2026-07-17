'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUserDetail, type UserDetail } from '@/lib/api';

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

export default function UserDetailPanel({
  userId,
  token,
  onClose,
}: {
  userId: string;
  token: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUserDetail(userId, token)
      .then(setDetail)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [userId, token]);

  return (
    <div
      className="fixed inset-0 bg-ink/40 flex items-center justify-center p-6 z-50"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-2xl border border-hairline max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Kullanıcı Detayı
          </h3>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink text-sm"
          >
            Kapat ✕
          </button>
        </div>

        {isLoading && <p className="text-ink-muted mt-6">Yükleniyor...</p>}
        {error && <p className="text-incompatible mt-6">{error}</p>}

        {detail && (
          <div className="mt-4">
            <p className="font-medium">@{detail.username}</p>{' '}
            <p className="text-sm text-ink-muted">{detail.email}</p>
            <p className="text-xs text-ink-muted mt-1">
              Kayıt: {formatDate(detail.createdAt)} · Rol: {detail.role}
            </p>
            {/* BEĞENİLER */}
            <div className="mt-6">
              <h4 className="font-medium text-sm mb-2">
                Beğeniler ({detail.likes.length})
              </h4>
              {detail.likes.length === 0 ? (
                <p className="text-xs text-ink-muted">Henüz beğeni yok.</p>
              ) : (
                <ul className="space-y-1.5">
                  {detail.likes.map((like) => (
                    <li key={like.id} className="text-sm">
                      <Link
                        href={`/sistemler/${like.build.id}`}
                        target="_blank"
                        className="text-trace hover:underline"
                      >
                        {like.build.name}
                      </Link>
                      <span className="text-ink-muted text-xs ml-2">
                        {formatDate(like.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* YORUMLAR */}
            <div className="mt-6">
              <h4 className="font-medium text-sm mb-2">
                Yorumlar ({detail.comments.length})
              </h4>
              {detail.comments.length === 0 ? (
                <p className="text-xs text-ink-muted">Henüz yorum yok.</p>
              ) : (
                <div className="space-y-2">
                  {detail.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`rounded-lg p-3 text-sm ${
                        comment.status === 'PENDING'
                          ? 'bg-trace/5 border border-trace'
                          : comment.status === 'REJECTED'
                            ? 'bg-incompatible/5 border border-incompatible'
                            : 'bg-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs text-ink-muted flex-wrap mb-1">
                        <Link
                          href={`/sistemler/${comment.build.id}`}
                          target="_blank"
                          className="text-trace hover:underline"
                        >
                          {comment.build.name}
                        </Link>
                        <span>·</span>
                        <span>{formatDate(comment.createdAt)}</span>
                        {comment.status !== 'APPROVED' && (
                          <span className="font-medium">
                            {comment.status === 'PENDING'
                              ? 'Onay Bekliyor'
                              : 'Reddedildi'}
                          </span>
                        )}
                      </div>
                      <p>{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
