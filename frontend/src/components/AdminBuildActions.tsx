'use client';

import { useAuth } from '@/lib/auth-context';
import FeaturedToggle from './FeaturedToggle';

export default function AdminBuildActions({
  buildId,
  initialIsFeatured,
}: {
  buildId: string;
  initialIsFeatured: boolean;
}) {
  const { user, token } = useAuth();

  if (user?.role !== 'ADMIN' || !token) {
    return null;
  }

  return (
    <div className="mt-6">
      <FeaturedToggle
        buildId={buildId}
        initialIsFeatured={initialIsFeatured}
        token={token}
      />
    </div>
  );
}
