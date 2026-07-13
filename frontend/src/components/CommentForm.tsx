'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { addComment, type Comment } from '@/lib/api';

export default function CommentForm({
  buildId,
  onCommentAdded,
}: {
  buildId: string;
  onCommentAdded: (comment: Comment) => void;
}) {
  const { user, token } = useAuth();
  const router = useRouter();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user || !token) {
      router.push('/giris');
      return;
    }

    if (!content.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setInfo(null);

    try {
      const { comment, message } = await addComment(buildId, content, token);

      if (comment.status === 'APPROVED') {
        onCommentAdded(comment);
      } else {
        setInfo(message);
      }

      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          user ? 'Bir yorum yaz...' : 'Yorum yapmak için giriş yapmalısın'
        }
        rows={3}
        className="w-full rounded-xl border border-hairline px-4 py-3 text-sm outline-none focus:border-trace transition-colors resize-none"
      />
      {error && <p className="text-sm text-incompatible mt-2">{error}</p>}
      {info && <p className="text-sm text-trace mt-2">{info}</p>}
      <button
        type="submit"
        disabled={isSubmitting || !content.trim()}
        className="mt-3 rounded-full bg-ink text-paper text-sm font-medium px-5 py-2.5 hover:bg-trace transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
      >
        {isSubmitting ? 'Gönderiliyor...' : 'Yorum Yap'}
      </button>
    </form>
  );
}
