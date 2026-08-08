import { API_URL } from './client';

export type NotificationType =
  | 'BUILD_COMMENT'
  | 'COMMENT_REPLY'
  | 'BUILD_LIKE'
  | 'COMMENT_LIKE'
  | 'BUILD_APPROVED'
  | 'BUILD_REJECTED'
  | 'EDIT_APPROVED'
  | 'EDIT_REJECTED'
  | 'ANNOUNCEMENT';

export type Notification = {
  id: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  /** Yalnızca duyurularda dolu; diğerlerinin metni türden üretiliyor. */
  message: string | null;
  actor: { id: string; username: string; avatarUrl: string | null } | null;
  build: { id: string; name: string } | null;
  commentId: string | null;
};

export async function getNotifications(
  token: string,
  offset = 0,
): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const res = await fetch(
    `${API_URL}/api/notifications?offset=${offset}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    },
  );

  if (!res.ok) throw new Error('Bildirimler alınamadı.');
  return res.json();
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/notifications/read-all`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('İşaretlenemedi.');
}

export async function markNotificationRead(
  id: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('İşaretlenemedi.');
}
