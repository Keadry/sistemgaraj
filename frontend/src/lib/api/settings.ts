import { API_URL } from './client';

export type AccountInfo = {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  steamUrl: string | null;
  discordUrl: string | null;
  websiteUrl: string | null;
  language: string;
  emailNewsletterOptIn: boolean;
  emailNotifyOnActivity: boolean;
  notifyOnBuildComment: boolean;
  notifyOnBuildLike: boolean;
  birthDate: string | null;
  showBirthDate: boolean;
  showOnlineStatus: boolean;
  showLastActive: boolean;
};

export async function getMyAccount(token: string): Promise<AccountInfo> {
  const res = await fetch(`${API_URL}/api/users/me/account`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Hesap bilgileri yüklenemedi.');
  const data = await res.json();
  return data.user;
}

export async function updateMyProfile(
  fields: {
    bio?: string;
    twitterUrl?: string;
    githubUrl?: string;
    steamUrl?: string;
    discordUrl?: string;
    websiteUrl?: string;
  },
  token: string,
) {
  const res = await fetch(`${API_URL}/api/users/me/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(fields),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Güncellenemedi.');
  return data.user;
}

export async function updateMyUsername(username: string, token: string) {
  const res = await fetch(`${API_URL}/api/users/me/username`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Kullanıcı adı değiştirilemedi.');
  return data.username as string;
}

export async function updateMyEmail(
  newEmail: string,
  currentPassword: string,
  token: string,
) {
  const res = await fetch(`${API_URL}/api/users/me/email`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ newEmail, currentPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'E-posta değiştirilemedi.');
}

export async function updateMyPassword(
  currentPassword: string,
  newPassword: string,
  token: string,
) {
  const res = await fetch(`${API_URL}/api/users/me/password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Şifre değiştirilemedi.');
}

export async function deleteMyAccount(currentPassword: string, token: string) {
  const res = await fetch(`${API_URL}/api/users/me`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Hesap silinemedi.');
}

export async function updateMyPreferences(
  fields: {
    language?: string;
    emailNewsletterOptIn?: boolean;
    emailNotifyOnActivity?: boolean;
    notifyOnBuildComment?: boolean;
    notifyOnBuildLike?: boolean;
  },
  token: string,
) {
  const res = await fetch(`${API_URL}/api/users/me/preferences`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(fields),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Tercihler güncellenemedi.');
  return data.preferences;
}

export async function updateMyPrivacy(
  fields: {
    birthDate?: string | null;
    showBirthDate?: boolean;
    showOnlineStatus?: boolean;
    showLastActive?: boolean;
  },
  token: string,
) {
  const res = await fetch(`${API_URL}/api/users/me/privacy`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(fields),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Güncellenemedi.');
  return data.privacy;
}

export type BlockedUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

export async function getBlockedUsers(token: string): Promise<BlockedUser[]> {
  const res = await fetch(`${API_URL}/api/users/me/blocked`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Engellenenler yüklenemedi.');
  const data = await res.json();
  return data.blocked;
}

export async function blockUser(username: string, token: string) {
  const res = await fetch(`${API_URL}/api/users/${username}/block`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Engellenemedi.');
}

export async function unblockUser(username: string, token: string) {
  const res = await fetch(`${API_URL}/api/users/${username}/block`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Engel kaldırılamadı.');
}

export type Reaction = {
  type: 'build_like' | 'comment_like';
  id: string;
  createdAt: string;
  user: { id: string; username: string; avatarUrl: string | null };
  buildId: string;
  buildName: string | null;
  commentContent: string | null;
};

export async function getMyReactions(token: string): Promise<Reaction[]> {
  const res = await fetch(`${API_URL}/api/users/me/reactions`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Reaksiyonlar yüklenemedi.');
  const data = await res.json();
  return data.reactions;
}
