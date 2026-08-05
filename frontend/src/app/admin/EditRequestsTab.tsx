'use client';

import { useEffect, useState } from 'react';
import { SkeletonLine } from '@/components/Skeleton';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';
import {
  getEditRequestsForReview,
  approveEditRequest,
  rejectEditRequest,
  type AdminEditRequest,
} from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function EditRequestsTab({ token }: { token: string }) {
  const [requests, setRequests] = useState<AdminEditRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const { showToast } = useToast();
  const confirmDialog = useConfirm();

  useEffect(() => {
    getEditRequestsForReview(token)
      .then(setRequests)
      .finally(() => setIsLoading(false));
  }, [token]);

  async function handleApprove(id: string) {
    setActionId(id);
    try {
      await approveEditRequest(id, token);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      showToast('Düzenleme onaylandı.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Hata oluştu.', 'error');
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id: string) {
    const ok = await confirmDialog({
      title: 'Düzenlemeyi reddet',
      confirmLabel: 'Reddet',
      danger: true,
    });
    if (!ok) return;

    setActionId(id);
    try {
      await rejectEditRequest(id, token);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      showToast('Düzenleme isteği reddedildi.', 'success');
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
  if (requests.length === 0)
    return (
      <p className="text-ink-muted text-sm">Onay bekleyen düzenleme yok.</p>
    );

  return (
    <div className="space-y-4">
      {requests.map((req) => (
        <div key={req.id} className="rounded-xl border border-hairline p-4">
          <div className="flex items-center justify-between">
            <div>
              <a
                href={`/sistemler/${req.build.id}`}
                target="_blank"
                className="font-medium text-sm text-trace hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace rounded"
              >
                {req.build.name}
              </a>
              <p className="text-xs text-ink-muted">
                @{req.build.user.username}
              </p>
              {req.name && req.name !== req.build.name && (
                <p className="text-sm text-trace mt-1">
                  Yeni isim: <span className="font-medium">{req.name}</span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                disabled={actionId === req.id}
                onClick={() => handleApprove(req.id)}
                className="text-xs rounded-full border border-compatible text-compatible px-3 py-1.5 hover:bg-compatible/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-compatible"
              >
                Onayla
              </button>
              <button
                disabled={actionId === req.id}
                onClick={() => handleReject(req.id)}
                className="text-xs rounded-full border border-incompatible text-incompatible px-3 py-1.5 hover:bg-incompatible/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-incompatible"
              >
                Reddet
              </button>
            </div>
          </div>

          {req.description && (
            <p className="text-xs text-ink-muted mt-2">
              Açıklama: {req.description}
            </p>
          )}

          {req.notes.length > 0 && (
            <div className="mt-2 space-y-1">
              {req.notes.map((n) => (
                <p key={n.id} className="text-xs text-ink-muted">
                  <span className="font-medium">{n.componentType}:</span>{' '}
                  {n.note}
                </p>
              ))}
            </div>
          )}

          {req.images.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {req.images.map((img) => (
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
