import { API_URL } from './client';
import type { Build, BuildComponent, BuildImageType } from './builds';

export type AdminUser = {
  id: string;
  email: string;
  username: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  isBanned: boolean;
  banReason: string | null;
  mutedUntil: string | null;
  createdAt: string;
};

export async function getUsers(
  token: string,
  options?: { limit?: number; offset?: number; search?: string },
): Promise<AdminUser[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.search) params.set('search', options.search);
  const query = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`${API_URL}/api/admin/users${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Kullanıcılar yüklenemedi.');
  }

  const data = await res.json();
  return data.users;
}

export async function deleteComment(commentId: string, token: string) {
  const res = await fetch(`${API_URL}/api/admin/comments/${commentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Yorum silinemedi.');
  }
}

export async function muteUser(
  userId: string,
  hours: number,
  reason: string,
  token: string,
) {
  const res = await fetch(`${API_URL}/api/admin/users/${userId}/mute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ hours, reason }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Susturma başarısız.');
  }
}

export async function unmuteUser(userId: string, token: string) {
  const res = await fetch(`${API_URL}/api/admin/users/${userId}/unmute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'İşlem başarısız.');
  }
}

export async function banUser(userId: string, reason: string, token: string) {
  const res = await fetch(`${API_URL}/api/admin/users/${userId}/ban`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Banlama başarısız.');
  }
}

export async function unbanUser(userId: string, token: string) {
  const res = await fetch(`${API_URL}/api/admin/users/${userId}/unban`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'İşlem başarısız.');
  }
}

export async function changeUserRole(
  userId: string,
  role: string,
  token: string,
) {
  const res = await fetch(`${API_URL}/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Rol değiştirilemedi.');
  }
}

export async function toggleFeatured(buildId: string, token: string) {
  const res = await fetch(`${API_URL}/api/admin/builds/${buildId}/feature`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'İşlem başarısız.');
  }

  const data = await res.json();
  return data.build;
}

export type AdminComment = {
  id: string;
  content: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  createdAt: string;
  user: { id: string; username: string | null; email: string };
  build: { id: string; name: string };
};

export async function getAllComments(
  token: string,
  options?: { limit?: number; offset?: number; search?: string },
): Promise<AdminComment[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.search) params.set('search', options.search);
  const query = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`${API_URL}/api/admin/comments${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Yorumlar yüklenemedi.');
  }

  const data = await res.json();
  return data.comments;
}

export async function getAllBuildsAdmin(
  token: string,
  options?: { limit?: number; offset?: number; search?: string },
): Promise<Build[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.search) params.set('search', options.search);
  const query = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`${API_URL}/api/builds${query}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Sistemler yüklenemedi.');
  }

  const data = await res.json();
  return data.builds;
}

export async function approveComment(commentId: string, token: string) {
  const res = await fetch(
    `${API_URL}/api/admin/comments/${commentId}/approve`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Onaylanamadı.');
  }
}

export async function rejectComment(commentId: string, token: string) {
  const res = await fetch(`${API_URL}/api/admin/comments/${commentId}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Reddedilemedi.');
  }
}

export type UserDetail = AdminUser & {
  comments: {
    id: string;
    content: string;
    status: 'APPROVED' | 'PENDING' | 'REJECTED';
    createdAt: string;
    build: { id: string; name: string };
  }[];
  likes: {
    id: string;
    createdAt: string;
    build: { id: string; name: string };
  }[];
};

export async function getUserDetail(
  userId: string,
  token: string,
): Promise<UserDetail> {
  const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Kullanıcı detayı yüklenemedi.');
  }

  const data = await res.json();
  return data.user;
}

export type AdminImage = {
  id: string;
  url: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  createdAt: string;
  build: { id: string; name: string; userId: string };
};

export async function getAllImages(token: string): Promise<AdminImage[]> {
  const res = await fetch(`${API_URL}/api/admin/images`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error('Görseller yüklenemedi.');
  const data = await res.json();
  return data.images;
}

export async function approveImage(imageId: string, token: string) {
  const res = await fetch(`${API_URL}/api/admin/images/${imageId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Onaylanamadı.');
}

export async function rejectImage(imageId: string, token: string) {
  const res = await fetch(`${API_URL}/api/admin/images/${imageId}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Reddedilemedi.');
}

export type AdminNote = {
  id: string;
  note: string | null;
  noteStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  build: { id: string; name: string };
  component: { name: string; brand: string };
};

export async function getAllNotes(token: string): Promise<AdminNote[]> {
  const res = await fetch(`${API_URL}/api/admin/notes`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Notlar yüklenemedi.');
  const data = await res.json();
  return data.notes;
}

export async function approveNote(noteId: string, token: string) {
  const res = await fetch(`${API_URL}/api/admin/notes/${noteId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Onaylanamadı.');
}

export async function rejectNote(noteId: string, token: string) {
  const res = await fetch(`${API_URL}/api/admin/notes/${noteId}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Reddedilemedi.');
}

export type NewBuildForReview = {
  id: string;
  name: string;
  totalPrice: number;
  reviewStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  user: { id: string; username: string };
  components: BuildComponent[];
  images: BuildImageType[];
};

export async function getNewBuildsForReview(
  token: string,
): Promise<NewBuildForReview[]> {
  const res = await fetch(`${API_URL}/api/admin/new-builds`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Sistemler yüklenemedi.');
  const data = await res.json();
  return data.builds;
}

export async function approveNewBuild(buildId: string, token: string) {
  const res = await fetch(
    `${API_URL}/api/admin/new-builds/${buildId}/approve`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error('Onaylanamadı.');
}

export async function rejectNewBuild(buildId: string, token: string) {
  const res = await fetch(`${API_URL}/api/admin/new-builds/${buildId}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Reddedilemedi.');
}

export type AdminEditRequest = {
  id: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  name: string | null;
  description: string | null;
  cpuId: string | null;
  motherboardId: string | null;
  ramId: string | null;
  gpuId: string | null;
  psuId: string | null;
  caseId: string | null;
  createdAt: string;
  images: { id: string; url: string }[];
  notes: { id: string; componentType: string; note: string }[];
  build: {
    id: string;
    name: string;
    user: { id: string; username: string };
    components: BuildComponent[];
  };
};

export async function getEditRequestsForReview(
  token: string,
): Promise<AdminEditRequest[]> {
  const res = await fetch(`${API_URL}/api/admin/edit-requests`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('İstekler yüklenemedi.');
  const data = await res.json();
  return data.requests;
}

export async function approveEditRequest(requestId: string, token: string) {
  const res = await fetch(
    `${API_URL}/api/admin/edit-requests/${requestId}/approve`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error('Onaylanamadı.');
}

export async function rejectEditRequest(requestId: string, token: string) {
  const res = await fetch(
    `${API_URL}/api/admin/edit-requests/${requestId}/reject`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error('Reddedilemedi.');
}

export async function changeUsername(
  userId: string,
  username: string,
  token: string,
) {
  const res = await fetch(`${API_URL}/api/admin/users/${userId}/username`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Kullanıcı adı değiştirilemedi.');
}

export async function sendAnnouncement(
  message: string,
  token: string,
): Promise<{ count: number; message: string }> {
  const res = await fetch(`${API_URL}/api/admin/announcements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Duyuru gönderilemedi.');
  return data;
}
