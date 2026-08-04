import { API_URL } from './client';
import type { BuildUser } from './builds';

export type CommentLikeType = { id: string; userId: string };

export type Comment = {
  id: string;
  content: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  createdAt: string;
  user: BuildUser & { avatarUrl: string | null };
  likes: CommentLikeType[];
  replies: Comment[];
};

export async function addComment(
  buildId: string,
  content: string,
  token: string,
  parentId?: string,
): Promise<{ comment: Comment; message: string }> {
  const res = await fetch(`${API_URL}/api/builds/${buildId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content, parentId }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Yorum eklenemedi.');
  }

  return { comment: data.comment, message: data.message };
}

export async function editComment(
  buildId: string,
  commentId: string,
  content: string,
  token: string,
): Promise<{ comment: Comment; message: string }> {
  const res = await fetch(
    `${API_URL}/api/builds/${buildId}/comments/${commentId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    },
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Yorum güncellenemedi.');
  return { comment: data.comment, message: data.message };
}

export async function deleteOwnComment(
  buildId: string,
  commentId: string,
  token: string,
) {
  const res = await fetch(
    `${API_URL}/api/builds/${buildId}/comments/${commentId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error('Yorum silinemedi.');
}

export async function likeComment(
  buildId: string,
  commentId: string,
  token: string,
) {
  const res = await fetch(
    `${API_URL}/api/builds/${buildId}/comments/${commentId}/like`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Beğenilemedi.');
  }
}

export async function unlikeComment(
  buildId: string,
  commentId: string,
  token: string,
) {
  const res = await fetch(
    `${API_URL}/api/builds/${buildId}/comments/${commentId}/like`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error('İşlem başarısız.');
}
