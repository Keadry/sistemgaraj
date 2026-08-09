'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { addComment, type Comment, type TaggedComponent } from '@/lib/api';
import { componentTypeLabel } from '@/lib/component-labels';
import MentionTextarea, { type MentionCandidate } from './MentionTextarea';

export default function CommentForm({
  buildId,
  onCommentAdded,
  taggedComponent,
  onClearTag,
  mentionCandidates,
}: {
  buildId: string;
  onCommentAdded: (comment: Comment) => void;
  /** Parça listesinden "sor" ile seçilen parça; yoksa düz yorum. */
  taggedComponent?: TaggedComponent | null;
  onClearTag?: () => void;
  mentionCandidates: MentionCandidate[];
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
      const { comment, message } = await addComment(
        buildId,
        content,
        token,
        undefined,
        taggedComponent?.id,
      );

      if (comment.status === 'APPROVED') {
        onCommentAdded(comment);
      } else {
        setInfo(message);
      }

      setContent('');
      // Etiket gönderimle birlikte düşüyor: bir sonraki yorumun da aynı
      // parça hakkında olduğunu varsaymak, sessizce yanlış etiket eklerdi.
      onClearTag?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      {taggedComponent && (
        <div className="flex items-center gap-2 mb-2 rounded-xl border border-trace/30 bg-trace/5 px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-trace font-[family-name:var(--font-mono)] shrink-0">
            {componentTypeLabel(taggedComponent.type)}
          </span>
          <span className="text-xs text-ink truncate min-w-0 flex-1">
            {taggedComponent.brand} {taggedComponent.name}
          </span>
          <button
            type="button"
            onClick={onClearTag}
            aria-label="Parça etiketini kaldır"
            className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-ink-muted hover:text-incompatible hover:bg-incompatible/10 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-trace"
          >
            ✕
          </button>
        </div>
      )}

      <MentionTextarea
        value={content}
        onChange={setContent}
        candidates={mentionCandidates}
        placeholder={
          user
            ? taggedComponent
              ? 'Bu parça hakkında ne sormak istiyorsun?'
              : 'Bir yorum yaz... (@ ile birini etiketleyebilirsin)'
            : 'Yorum yapmak için giriş yapmalısın'
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
