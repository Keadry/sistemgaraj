import { API_URL } from './client';
import type { Comment } from './comments';

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
  ramSlots: number | null;
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
  avatarUrl: string | null;
};

export type Like = {
  id: string;
  userId: string;
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

export type CompatibilityIssue = {
  level: 'error' | 'warning';
  message: string;
};

export async function getFeed(options?: {
  featured?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<Build[]> {
  try {
    if (!API_URL) return [];
    const params = new URLSearchParams();
    if (options?.featured) params.set('featured', 'true');
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.search) params.set('search', options.search);
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${API_URL}/api/builds${query}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.builds ?? [];
  } catch {
    return [];
  }
}

export async function getBuildsCount(): Promise<number> {
  try {
    if (!API_URL) return 0;
    const res = await fetch(`${API_URL}/api/builds/count`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return 0;
    }

    const data = await res.json();
    return data.count ?? 0;
  } catch {
    return 0;
  }
}

export async function getBuild(
  id: string,
  token?: string | null,
): Promise<{ build: Build; isOwner: boolean; isBookmarked: boolean }> {
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

export async function createBuild(
  params: {
    name: string;
    cpuId: string;
    motherboardId: string;
    ramIds: string[];
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
  params.ramIds.forEach((id) => formData.append('ramIds', id));
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
    ramIds?: string[];
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
  if (params.ramIds && params.ramIds.length > 0) {
    params.ramIds.forEach((id) => formData.append('ramIds', id));
  }
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

export async function deleteBuild(buildId: string, token: string) {
  const res = await fetch(`${API_URL}/api/builds/${buildId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Sistem silinemedi.');
}

export async function bookmarkBuild(buildId: string, token: string) {
  const res = await fetch(`${API_URL}/api/builds/${buildId}/bookmark`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'İşaretlenemedi.');
}

export async function unbookmarkBuild(buildId: string, token: string) {
  const res = await fetch(`${API_URL}/api/builds/${buildId}/bookmark`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'İşaret kaldırılamadı.');
}

export async function getMyBookmarks(token: string): Promise<Build[]> {
  const res = await fetch(`${API_URL}/api/builds/me/bookmarks`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('İşaretlenenler yüklenemedi.');
  const data = await res.json();
  return data.builds;
}
