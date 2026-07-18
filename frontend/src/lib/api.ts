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
  reviewStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
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

export async function getBuild(
  id: string,
  token?: string | null,
): Promise<{ build: Build; isOwner: boolean }> {
  const res = await fetch(`${API_URL}/api/builds/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Sistem bulunamadı.');
  }

  return res.json();
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
    storageIds: string[];
    isPublic: boolean;
    images?: File[];
  },
  token: string,
): Promise<{
  build?: Build;
  issues?: CompatibilityIssue[];
  error?: string;
  message?: string;
}> {
  const formData = new FormData();
  formData.append('name', params.name);
  formData.append('cpuId', params.cpuId);
  formData.append('motherboardId', params.motherboardId);
  formData.append('ramId', params.ramId);
  formData.append('gpuId', params.gpuId);
  formData.append('psuId', params.psuId);
  formData.append('caseId', params.caseId);
  params.storageIds.forEach((id) => formData.append('storageIds', id));
  formData.append('isPublic', String(params.isPublic));

  if (params.images) {
    params.images.forEach((file) => formData.append('images', file));
  }

  const res = await fetch(`${API_URL}/api/builds`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    return { error: data.error, issues: data.issues };
  }

  return { build: data.build, message: data.message };
}

export type AdminUser = {
  id: string;
  email: string;
  username: string | null;
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
  user: { id: string; username: string | null; email: string };
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
  avatarUrl: string | null;
  coverUrl: string | null;
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

export type EditRequestNoteInput = {
  componentType: string;
  note: string;
};

export type EditRequestResult = {
  message: string;
  requiresReview?: boolean;
  editRequest?: {
    id: string;
    status: 'APPROVED' | 'PENDING' | 'REJECTED';
  };
  error?: string;
  issues?: CompatibilityIssue[];
};

export async function submitEditRequest(
  buildId: string,
  params: {
    name?: string;
    description?: string;
    cpuId?: string;
    motherboardId?: string;
    ramId?: string;
    gpuId?: string;
    psuId?: string;
    storageIds?: string[];
    caseId?: string;
    notes?: EditRequestNoteInput[];
    images?: File[];
  },
  token: string,
): Promise<EditRequestResult> {
  const formData = new FormData();

  if (params.name) formData.append('name', params.name);
  if (params.description) formData.append('description', params.description);
  if (params.cpuId) formData.append('cpuId', params.cpuId);
  if (params.motherboardId)
    formData.append('motherboardId', params.motherboardId);
  if (params.ramId) formData.append('ramId', params.ramId);
  if (params.gpuId) formData.append('gpuId', params.gpuId);
  if (params.psuId) formData.append('psuId', params.psuId);
  if (params.storageIds && params.storageIds.length > 0) {
    params.storageIds.forEach((id) => formData.append('storageIds', id));
  }
  if (params.caseId) formData.append('caseId', params.caseId);
  if (params.notes && params.notes.length > 0) {
    formData.append('notes', JSON.stringify(params.notes));
  }
  if (params.images) {
    params.images.forEach((file) => formData.append('images', file));
  }

  const res = await fetch(`${API_URL}/api/builds/${buildId}/edit-request`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    return { error: data.error, issues: data.issues, message: data.error };
  }

  return {
    message: data.message,
    requiresReview: data.requiresReview,
    editRequest: data.editRequest,
  };
}

export type PendingEditRequest = {
  id: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  description: string | null;
  cpuId: string | null;
  motherboardId: string | null;
  ramId: string | null;
  gpuId: string | null;
  psuId: string | null;
  caseId: string | null;
  images: { id: string; url: string; order: number }[];
  notes: { id: string; componentType: string; note: string }[];
};

export async function getPendingEditRequest(
  buildId: string,
  token: string,
): Promise<PendingEditRequest | null> {
  const res = await fetch(`${API_URL}/api/builds/${buildId}/edit-request`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.editRequest;
}

// ==============================
// ADMIN: Yeni Sistem Onayları
// ==============================
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

// ==============================
// ADMIN: Düzenleme İstekleri
// ==============================
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

export async function setExistingImageMain(
  buildId: string,
  imageId: string,
  token: string,
) {
  const res = await fetch(
    `${API_URL}/api/builds/${buildId}/images/${imageId}/main`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error('İşlem başarısız.');
}

export async function deleteExistingImage(
  buildId: string,
  imageId: string,
  token: string,
) {
  const res = await fetch(
    `${API_URL}/api/builds/${buildId}/images/${imageId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error('Görsel silinemedi.');
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

export async function deleteBuild(buildId: string, token: string) {
  const res = await fetch(`${API_URL}/api/builds/${buildId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Sistem silinemedi.');
}
