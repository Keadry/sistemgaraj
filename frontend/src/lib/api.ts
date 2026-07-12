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
  component: Component;
};

export type BuildUser = {
  id: string;
  name: string | null;
};

export type Like = {
  id: string;
  userId: string;
};

export type Comment = {
  id: string;
  content: string;
  createdAt: string;
  user: BuildUser;
};

export type Build = {
  id: string;
  name: string;
  description: string | null;
  totalPrice: number;
  isPublic: boolean;
  createdAt: string;
  user: BuildUser;
  components: BuildComponent[];
  likes: Like[];
  comments: Comment[];
};

export async function getFeed(): Promise<Build[]> {
  const res = await fetch(`${API_URL}/api/builds`, {
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
): Promise<Comment> {
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

  return data.comment;
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
