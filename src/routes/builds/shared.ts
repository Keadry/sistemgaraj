export const buildIncludes = {
  /* avatarUrl her yerde seçiliyor ki `BuildUser` tipi her yanıtta doğru olsun.
     Yalnızca detay uç noktasına eklemek, tipin var dediği alanın listelerde
     tanımsız gelmesi demekti. */
  user: { select: { id: true, username: true, avatarUrl: true } },
  components: { include: { component: true } },
  likes: true,
  comments: { where: { status: 'APPROVED' as const } },
  images: {
    where: { status: 'APPROVED' as const },
    orderBy: { order: 'asc' as const },
  },
};

export function getArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean) as string[];
  return [String(value)];
}
