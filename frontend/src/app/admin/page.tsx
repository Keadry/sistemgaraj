'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth-context';
import UsersTab from './UsersTab';
import BuildsTab from './BuildsTab';
import CommentsTab from './CommentsTab';
import NewBuildsTab from './NewBuildsTab';
import EditRequestsTab from './EditRequestsTab';

type Tab = 'users' | 'builds' | 'comments' | 'newBuilds' | 'editRequests';

export default function AdminPage() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('users');

  const isModerator = user?.role === 'MODERATOR' || user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!isAuthLoading && !isModerator) {
      router.push('/');
    }
  }, [isAuthLoading, isModerator, router]);

  if (isAuthLoading || !isModerator || !token) {
    return null;
  }

  return (
    <main className="min-h-screen bg-paper pb-20">
      <Navbar />

      <div className="px-6 md:px-12 py-10">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Yönetim Paneli
        </h1>

        <div className="flex gap-2 mt-6 border-b border-hairline">
          {[
            { key: 'users' as Tab, label: 'Kullanıcılar' },
            { key: 'builds' as Tab, label: 'Sistemler' },
            { key: 'comments' as Tab, label: 'Yorumlar' },
            { key: 'newBuilds' as Tab, label: 'Yeni Sistem Onayları' },
            { key: 'editRequests' as Tab, label: 'Düzenleme İstekleri' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace ${
                tab === t.key
                  ? 'border-trace text-trace'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === 'users' && (
            <UsersTab
              token={token}
              isAdmin={isAdmin}
              currentUserId={user!.id}
            />
          )}
          {tab === 'builds' && <BuildsTab token={token} />}
          {tab === 'comments' && <CommentsTab token={token} />}
          {tab === 'newBuilds' && <NewBuildsTab token={token} />}
          {tab === 'editRequests' && <EditRequestsTab token={token} />}
        </div>
      </div>
    </main>
  );
}
