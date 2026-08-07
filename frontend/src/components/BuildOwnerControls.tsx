'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  uploadBuildImages,
  setMainImage,
  deleteImage,
  updateComponentNote,
  type BuildComponent,
  type BuildImageType,
} from '@/lib/api';

import { imageUrl } from '@/lib/image-url';

export function ImageManager({
  buildId,
  ownerId,
  images,
}: {
  buildId: string;
  ownerId: string;
  images: BuildImageType[];
}) {
  const { user, token } = useAuth();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!user || user.id !== ownerId || !token) return null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0 || !token) return;

    setIsUploading(true);
    try {
      await uploadBuildImages(buildId, files, token);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }

  async function handleSetMain(imageId: string) {
    if (!token) return;
    setBusyId(imageId);
    try {
      await setMainImage(buildId, imageId, token);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(imageId: string) {
    if (!token) return;
    if (!confirm('Bu görseli silmek istediğine emin misin?')) return;
    setBusyId(imageId);
    try {
      await deleteImage(buildId, imageId, token);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-4">
      <label className="inline-flex items-center gap-2 rounded-lg border border-hairline px-4 py-2 text-sm font-medium cursor-pointer hover:border-trace transition-colors">
        {isUploading ? 'Yükleniyor...' : 'Görsel Ekle (en fazla 5)'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          disabled={isUploading}
          onChange={handleFileChange}
        />
      </label>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative w-24 h-20 rounded-lg overflow-hidden border border-hairline"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl(img.url)}
                alt=""
                className="w-full h-full object-cover"
              />
              {img.status === 'PENDING' && (
                <span className="absolute top-1 left-1 text-[10px] bg-trace text-paper rounded px-1.5 py-0.5">
                  Onayda
                </span>
              )}
              {img.status === 'REJECTED' && (
                <span className="absolute top-1 left-1 text-[10px] bg-incompatible text-paper rounded px-1.5 py-0.5">
                  Reddedildi
                </span>
              )}
              {img.isMain && (
                <span className="absolute top-1 right-1 text-[10px] bg-scrim text-on-scrim rounded px-1.5 py-0.5">
                  Ana
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex bg-scrim/60">
                {!img.isMain && (
                  <button
                    disabled={busyId === img.id}
                    onClick={() => handleSetMain(img.id)}
                    className="flex-1 text-[10px] text-on-scrim py-1 hover:bg-scrim/80 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-on-scrim"
                  >
                    Ana Yap
                  </button>
                )}
                <button
                  disabled={busyId === img.id}
                  onClick={() => handleDelete(img.id)}
                  className="flex-1 text-[10px] text-on-scrim py-1 hover:bg-incompatible/80 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-incompatible"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ComponentNoteEditor({
  buildId,
  ownerId,
  buildComponent,
}: {
  buildId: string;
  ownerId: string;
  buildComponent: BuildComponent;
}) {
  const { user, token } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState(buildComponent.note ?? '');
  const [savedNote, setSavedNote] = useState(buildComponent.note);
  const [savedStatus, setSavedStatus] = useState(buildComponent.noteStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const isOwner = user && user.id === ownerId && token;

  async function handleSave() {
    if (!token) return;
    setIsSaving(true);
    setInfo(null);
    try {
      const { buildComponent: updated, message } = await updateComponentNote(
        buildId,
        buildComponent.id,
        note,
        token,
      );
      setSavedNote(updated.note);
      setSavedStatus(updated.noteStatus);
      setInfo(updated.noteStatus === 'PENDING' ? message : null);
      setIsEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  }

  // Herkese: sadece onaylanmış not gösterilir. Sahibine: durumu ne olursa olsun kendi notu gösterilir.
  const visibleNote = isOwner
    ? savedNote
    : savedStatus === 'APPROVED'
      ? savedNote
      : null;

  return (
    <div className="mt-1.5">
      {visibleNote && !isEditing && (
        <p className="text-xs text-ink-muted bg-surface rounded-lg px-3 py-2 leading-relaxed">
          💬 {visibleNote}
          {isOwner && savedStatus === 'PENDING' && (
            <span className="text-trace ml-2">(onay bekliyor)</span>
          )}
          {isOwner && savedStatus === 'REJECTED' && (
            <span className="text-incompatible ml-2">(reddedildi)</span>
          )}
        </p>
      )}

      {info && <p className="text-xs text-trace mt-1">{info}</p>}

      {isOwner && !isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs text-trace hover:underline mt-1"
        >
          {savedNote ? 'Notu düzenle' : 'Not ekle'}
        </button>
      )}

      {isOwner && isEditing && (
        <div className="mt-1.5">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Bu parça hakkında bir not ekle..."
            className="w-full rounded-lg border border-hairline px-3 py-2 text-xs outline-none focus:border-trace transition-colors resize-none"
          />
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs rounded-lg bg-ink text-paper px-3 py-1 disabled:opacity-50"
            >
              {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button
              onClick={() => {
                setNote(savedNote ?? '');
                setIsEditing(false);
              }}
              className="text-xs rounded-lg border border-hairline px-3 py-1"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
