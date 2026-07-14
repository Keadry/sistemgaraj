const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type Component = {
  id: string;
  name: string;
  brand: string;
  type: string;
  price: number;
  socket: string | null;
  ramType: string | null;
  wattage: number | null;
  formFactor: string | null;
};

export type BuildComponent = {
  id: string;
  quantity: number;
  note: string | null;
  noteStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  component: Component;
};

export type BuildUser = {
  id: string;
  username: string;
};

export type Like = {
  id: string;
  userId: string;
};

export type Comment = {
  id: string;
  content: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  createdAt: string;
  user: BuildUser;
};

export type BuildImageType = {
  id: string;
  url: string;
  isMain: boolean;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  order: number;
};

export type Build = {
  id: string;
  name: string;
  description: string | null;
  totalPrice: number;
  isPublic: boolean;
  isFeatured: boolean;
  createdAt: string;
  user: BuildUser;
  components: BuildComponent[];
  likes: Like[];
  comments: Comment[];
  images: BuildImageType[];
};

export async function getFeed(options?: {
  featured?: boolean;
}): Promise<Build[]> {
  const query = options?.featured ? '?featured=true' : '';
  const res = await fetch(`${API_URL}/api/builds${query}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Sistemler yüklenemedi.');
  }

  const data = await res.json();
  return data.builds;
}

export async function getBuild(id: string): Promise<Build> {
  const res = await fetch(`${API_URL}/api/builds/${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Sistem bulunamadı.');
  }

  const data = await res.json();
  return data.build;
}
export async function likeBuild(buildId: string, token: string) {
  const res = await fetch(`${API_URL}/api/builds/${buildId}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Beğenme başarısız.');
  }
}

export async function unlikeBuild(buildId: string, token: string) {
  const res = await fetch(`${API_URL}/api/builds/${buildId}/like`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Beğeni geri alınamadı.');
  }
}

export async function addComment(
  buildId: string,
  content: string,
  token: string,
): Promise<{ comment: Comment; message: string }> {
  const res = await fetch(`${API_URL}/api/builds/${buildId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Yorum eklenemedi.');
  }

  return { comment: data.comment, message: data.message };
}

export async function getComponents(): Promise<Component[]> {
  const res = await fetch(`${API_URL}/api/components`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Parçalar yüklenemedi.');
  }

  const data = await res.json();
  return data.components;
}

export type CompatibilityIssue = {
  level: 'error' | 'warning';
  message: string;
};

export async function createBuild(
  params: {
    name: string;
    cpuId: string;
    motherboardId: string;
    ramId: string;
    gpuId: string;
    psuId: string;
    caseId: string;
    isPublic: boolean;
  },
  token: string,
): Promise<{ build?: Build; issues?: CompatibilityIssue[]; error?: string }> {
  const res = await fetch(`${API_URL}/api/builds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  const data = await res.json();

  if (!res.ok) {
    return { error: data.error, issues: data.issues };
  }

  return { build: data.build };
}

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  isBanned: boolean;
  banReason: string | null;
  mutedUntil: string | null;
  createdAt: string;
};

export async function getUsers(token: string): Promise<AdminUser[]> {
  const res = await fetch(`${API_URL}/api/admin/users`, {
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
  user: { id: string; name: string | null; email: string };
  build: { id: string; name: string };
};

export async function getAllComments(token: string): Promise<AdminComment[]> {
  const res = await fetch(`${API_URL}/api/admin/comments`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Yorumlar yüklenemedi.');
  }

  const data = await res.json();
  return data.comments;
}

export async function getAllBuildsAdmin(token: string): Promise<Build[]> {
  // Feed rotası zaten tüm herkese açık sistemleri (isFeatured dahil) döndürüyor
  const res = await fetch(`${API_URL}/api/builds`, {
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

export async function getMyBuilds(token: string): Promise<Build[]> {
  const res = await fetch(`${API_URL}/api/builds/me/all`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Sistemlerin yüklenemedi.');
  }

  const data = await res.json();
  return data.builds;
}

export async function uploadBuildImages(
  buildId: string,
  files: File[],
  token: string,
): Promise<BuildImageType[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));

  const res = await fetch(`${API_URL}/api/builds/${buildId}/images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Görsel yüklenemedi.');
  }

  return data.images;
}

export async function setMainImage(
  buildId: string,
  imageId: string,
  token: string,
) {
  const res = await fetch(
    `${API_URL}/api/builds/${buildId}/images/${imageId}/main`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'İşlem başarısız.');
  }
}

export async function deleteImage(
  buildId: string,
  imageId: string,
  token: string,
) {
  const res = await fetch(
    `${API_URL}/api/builds/${buildId}/images/${imageId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Görsel silinemedi.');
  }
}

export async function updateComponentNote(
  buildId: string,
  buildComponentId: string,
  note: string,
  token: string,
): Promise<{ buildComponent: BuildComponent; message: string }> {
  const res = await fetch(
    `${API_URL}/api/builds/${buildId}/components/${buildComponentId}/note`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ note }),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Not güncellenemedi.');
  }

  return { buildComponent: data.buildComponent, message: data.message };
}

export type UserProfile = {
  id: string;
  username: string;
  createdAt: string;
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
