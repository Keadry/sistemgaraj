import { API_URL } from './client';
import type { Build } from './builds';

export type UserProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  steamUrl: string | null;
  discordUrl: string | null;
  websiteUrl: string | null;
  createdAt: string;
  isOnline: boolean | null;
  lastActiveAt: string | null;
  birthDate: string | null;
};

export async function getUserProfile(
  username: string,
  token?: string | null,
): Promise<{ user: UserProfile; builds: Build[]; isOwner: boolean }> {
  const res = await fetch(`${API_URL}/api/users/${username}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Kullanıcı bulunamadı.');
  }

  return res.json();
}

export type WallComment = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; username: string; avatarUrl: string | null };
  replies: WallComment[];
};

export async function getUserProfileWithWall(
  username: string,
  token?: string | null,
): Promise<{
  user: UserProfile;
  builds: Build[];
  isOwner: boolean;
  wallComments: WallComment[];
}> {
  const res = await fetch(`${API_URL}/api/users/${username}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Kullanıcı bulunamadı.');
  }

  return res.json();
}

export async function postWallComment(
  username: string,
  content: string,
  token: string,
  parentId?: string,
): Promise<WallComment> {
  const res = await fetch(`${API_URL}/api/users/${username}/wall`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content, parentId }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Yorum eklenemedi.');
  return data.comment;
}

export async function deleteWallComment(commentId: string, token: string) {
  const res = await fetch(`${API_URL}/api/users/wall/${commentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Silinemedi.');
}

export async function uploadAvatar(file: File, token: string): Promise<string> {
  const formData = new FormData();
  formData.append('avatar', file);

  const res = await fetch(`${API_URL}/api/users/me/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Yüklenemedi.');
  return data.avatarUrl;
}

export async function uploadCover(file: File, token: string): Promise<string> {
  const formData = new FormData();
  formData.append('cover', file);

  const res = await fetch(`${API_URL}/api/users/me/cover`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Yüklenemedi.');
  return data.coverUrl;
}
