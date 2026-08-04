export const buildIncludes = {
  user: { select: { id: true, username: true } },
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
