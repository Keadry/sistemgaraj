'use client';

import { useEffect, useState } from 'react';
import { SkeletonLine } from '@/components/Skeleton';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';
import {
  getNewBuildsForReview,
  approveNewBuild,
  rejectNewBuild,
  type NewBuildForReview,
} from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function NewBuildsTab({ token }: { token: string }) {
  const [builds, setBuilds] = useState<NewBuildForReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const confirmDialog = useConfirm();
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    getNewBuildsForReview(token)
      .then(setBuilds)
      .finally(() => setIsLoading(false));
  }, [token]);

  async function handleApprove(id: string) {
    setActionId(id);
    try {
      await approveNewBuild(id, token);
      setBuilds((prev) => prev.filter((b) => b.id !== id));
      showToast('Sistem onaylandı.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Hata oluştu.', 'error');
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id: string) {
    const ok = await confirmDialog({
      title: 'Sistemi reddet',
      description: 'Görseller silinecek, sistem yayınlanmayacak.',
      confirmLabel: 'Reddet',
      danger: true,
    });
    if (!ok) return;

    setActionId(id);
    try {
      await rejectNewBuild(id, token);
      setBuilds((prev) => prev.filter((b) => b.id !== id));
      showToast('Sistem reddedildi.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Hata oluştu.', 'error');
    } finally {
      setActionId(null);
    }
  }

  if (isLoading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLine key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  if (builds.length === 0)
    return <p className="text-ink-muted text-sm">Onay bekleyen sistem yok.</p>;

  return (
    <div className="space-y-4">
      {builds.map((build) => (
        <div key={build.id} className="rounded-xl border border-hairline p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{build.name}</p>
              <p className="text-xs text-ink-muted">@{build.user.username}</p>
            </div>
            <div className="flex gap-2">
              <button
                disabled={actionId === build.id}
                onClick={() => handleApprove(build.id)}
                className="text-xs rounded-full border border-compatible text-compatible px-3 py-1.5 hover:bg-compatible/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-compatible"
              >
                Onayla
              </button>
              <button
                disabled={actionId === build.id}
                onClick={() => handleReject(build.id)}
                className="text-xs rounded-full border border-incompatible text-incompatible px-3 py-1.5 hover:bg-incompatible/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-incompatible"
              >
                Reddet
              </button>
            </div>
          </div>
          {build.images.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {build.images.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={`${API_URL}${img.url}`}
                  alt=""
                  className="w-24 h-20 object-cover rounded-xl shrink-0"
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
