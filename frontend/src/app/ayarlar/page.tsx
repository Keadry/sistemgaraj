'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateMyPreferences } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';
import {
  getMyAccount,
  updateMyProfile,
  updateMyUsername,
  updateMyEmail,
  updateMyPassword,
  deleteMyAccount,
  type AccountInfo,
} from '@/lib/api';

type Tab =
  | 'hesap'
  | 'parola'
  | 'tercihler'
  | 'gizlilik'
  | 'engellenenler'
  | 'isaretler'
  | 'reaksiyonlar';

const TABS: { key: Tab; label: string }[] = [
  { key: 'hesap', label: 'Hesap Detayları' },
  { key: 'parola', label: 'Parola & Güvenlik' },
  { key: 'tercihler', label: 'Tercihler' },
  { key: 'gizlilik', label: 'Gizlilik' },
  { key: 'engellenenler', label: 'Engellenenler' },
  { key: 'isaretler', label: 'Sayfa İşaretleri' },
  { key: 'reaksiyonlar', label: 'Reaksiyonlar' },
];

export default function AyarlarPage() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('hesap');

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/giris');
    }
  }, [isAuthLoading, user, router]);

  if (isAuthLoading || !user || !token) return null;

  return (
    <main className="min-h-screen pb-20">
      <Navbar />

      <div className="px-6 md:px-12 py-10 max-w-5xl mx-auto grid md:grid-cols-[220px_1fr] gap-8">
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-left px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace ${
                tab === t.key
                  ? 'bg-trace/10 text-trace'
                  : 'text-ink-muted hover:bg-surface hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div>
          {tab === 'hesap' && <HesapTab token={token} />}
          {tab === 'parola' && <ParolaTab token={token} />}
          {tab === 'tercihler' && <TercihlerTab token={token} />}
          {tab !== 'hesap' && tab !== 'parola' && tab !== 'tercihler' && (
            <YakindaTab />
          )}
        </div>
      </div>
    </main>
  );
}

function YakindaTab() {
  return (
    <div className="rounded-2xl border border-dashed border-hairline p-10 text-center">
      <p className="text-ink-muted text-sm">Bu bölüm yakında eklenecek.</p>
    </div>
  );
}

// ==============================
// HESAP DETAYLARI
// ==============================
function HesapTab({ token }: { token: string }) {
  const { showToast } = useToast();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [bio, setBio] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [steamUrl, setSteamUrl] = useState('');
  const [discordUrl, setDiscordUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    getMyAccount(token)
      .then((data) => {
        setAccount(data);
        setUsername(data.username);
        setEmail(data.email);
        setBio(data.bio ?? '');
        setTwitterUrl(data.twitterUrl ?? '');
        setGithubUrl(data.githubUrl ?? '');
        setSteamUrl(data.steamUrl ?? '');
        setDiscordUrl(data.discordUrl ?? '');
        setWebsiteUrl(data.websiteUrl ?? '');
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  async function handleUsernameSave() {
    setIsSavingUsername(true);
    try {
      const updated = await updateMyUsername(username, token);
      setUsername(updated);
      showToast('Kullanıcı adı güncellendi.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setIsSavingUsername(false);
    }
  }

  async function handleEmailSave() {
    if (!emailPassword) {
      showToast('E-postayı değiştirmek için mevcut şifreni gir.', 'error');
      return;
    }
    setIsSavingEmail(true);
    try {
      await updateMyEmail(email, emailPassword, token);
      setEmailPassword('');
      showToast('E-posta güncellendi.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setIsSavingEmail(false);
    }
  }

  async function handleProfileSave() {
    setIsSavingProfile(true);
    try {
      await updateMyProfile(
        { bio, twitterUrl, githubUrl, steamUrl, discordUrl, websiteUrl },
        token,
      );
      showToast('Profil güncellendi.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  if (isLoading || !account) {
    return <p className="text-ink-muted">Yükleniyor...</p>;
  }

  return (
    <div className="space-y-8">
      {/* KULLANICI ADI */}
      <section className="rounded-2xl border border-hairline p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-3">
          Kullanıcı Adı
        </h2>
        <div className="flex gap-2 max-w-md">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="flex-1 rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors bg-paper"
          />
          <button
            onClick={handleUsernameSave}
            disabled={isSavingUsername || !username.trim()}
            className="rounded-xl bg-ink text-paper text-sm font-medium px-5 hover:bg-trace transition-colors disabled:opacity-50"
          >
            Kaydet
          </button>
        </div>
      </section>

      {/* E-POSTA */}
      <section className="rounded-2xl border border-hairline p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-3">
          E-posta
        </h2>
        <div className="space-y-2 max-w-md">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors bg-paper"
          />
          <input
            type="password"
            value={emailPassword}
            onChange={(e) => setEmailPassword(e.target.value)}
            placeholder="Değiştirmek için mevcut şifreni gir"
            className="w-full rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors bg-paper"
          />
          <button
            onClick={handleEmailSave}
            disabled={isSavingEmail}
            className="rounded-xl bg-ink text-paper text-sm font-medium px-5 py-2.5 hover:bg-trace transition-colors disabled:opacity-50"
          >
            E-postayı Güncelle
          </button>
        </div>
      </section>

      {/* HAKKIMDA + SOSYAL LİNKLER */}
      <section className="rounded-2xl border border-hairline p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-3">
          Hakkımda
        </h2>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 300))}
          rows={3}
          placeholder="Kendinden kısaca bahset..."
          className="w-full max-w-lg rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors resize-none bg-paper"
        />
        <p className="text-xs text-ink-muted mt-1">{bio.length}/300</p>

        <h3 className="text-sm font-semibold mt-6 mb-3">Bağlantı Linkleri</h3>
        <div className="grid sm:grid-cols-2 gap-3 max-w-lg">
          <input
            value={twitterUrl}
            onChange={(e) => setTwitterUrl(e.target.value)}
            placeholder="X (Twitter) profil linki"
            className="rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors bg-paper"
          />
          <input
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="GitHub profil linki"
            className="rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors bg-paper"
          />
          <input
            value={steamUrl}
            onChange={(e) => setSteamUrl(e.target.value)}
            placeholder="Steam profil linki"
            className="rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors bg-paper"
          />
          <input
            value={discordUrl}
            onChange={(e) => setDiscordUrl(e.target.value)}
            placeholder="Discord kullanıcı adı"
            className="rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors bg-paper"
          />
          <input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="Kişisel website"
            className="rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors bg-paper sm:col-span-2"
          />
        </div>

        <button
          onClick={handleProfileSave}
          disabled={isSavingProfile}
          className="mt-4 rounded-xl bg-ink text-paper text-sm font-medium px-5 py-2.5 hover:bg-trace transition-colors disabled:opacity-50"
        >
          Profili Kaydet
        </button>
      </section>
    </div>
  );
}

// ==============================
// PAROLA & GÜVENLİK
// ==============================
function ParolaTab({ token }: { token: string }) {
  const { showToast } = useToast();
  const confirmDialog = useConfirm();
  const router = useRouter();
  const { logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  function getPasswordStrength(pw: string): {
    label: string;
    color: string;
    width: string;
  } {
    if (pw.length === 0) return { label: '', color: '', width: '0%' };
    if (pw.length < 6)
      return { label: 'Zayıf', color: 'bg-incompatible', width: '25%' };
    if (pw.length < 10)
      return { label: 'Orta', color: 'bg-trace', width: '60%' };
    return { label: 'Güçlü', color: 'bg-compatible', width: '100%' };
  }

  const strength = getPasswordStrength(newPassword);

  async function handlePasswordChange() {
    if (!currentPassword || !newPassword) {
      showToast('Mevcut ve yeni şifreni gir.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await updateMyPassword(currentPassword, newPassword, token);
      setCurrentPassword('');
      setNewPassword('');
      showToast('Şifren güncellendi.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deletePassword) {
      showToast('Hesabını silmek için şifreni gir.', 'error');
      return;
    }

    const ok = await confirmDialog({
      title: 'Hesabını sil',
      description:
        'Bu işlem geri alınamaz. Tüm sistemlerin, yorumların ve verilerin kalıcı olarak silinecek.',
      confirmLabel: 'Hesabımı Sil',
      danger: true,
    });
    if (!ok) return;

    setIsDeleting(true);
    try {
      await deleteMyAccount(deletePassword, token);
      showToast('Hesabın silindi.', 'success');
      logout();
      router.push('/');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-hairline p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-3">
          Şifre Değiştir
        </h2>
        <div className="space-y-3 max-w-md">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Mevcut şifre"
            className="w-full rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors bg-paper"
          />
          <div>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Yeni şifre"
              className="w-full rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors bg-paper"
            />
            {newPassword && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                  <div
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: strength.width }}
                  />
                </div>
                <p className="text-xs text-ink-muted mt-1">{strength.label}</p>
              </div>
            )}
          </div>
          <button
            onClick={handlePasswordChange}
            disabled={isSaving}
            className="rounded-xl bg-ink text-paper text-sm font-medium px-5 py-2.5 hover:bg-trace transition-colors disabled:opacity-50"
          >
            Şifreyi Güncelle
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-incompatible/30 bg-incompatible/5 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-2 text-incompatible">
          Hesabımı Sil
        </h2>
        <p className="text-sm text-ink-muted mb-4">
          Bu işlem geri alınamaz. Tüm sistemlerin, yorumların ve verilerin
          kalıcı olarak silinir.
        </p>
        <div className="flex gap-2 max-w-md">
          <input
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="Şifreni gir"
            className="flex-1 rounded-xl border border-incompatible/40 px-4 py-2.5 text-sm outline-none focus:border-incompatible transition-colors bg-paper"
          />
          <button
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="rounded-xl bg-incompatible text-paper text-sm font-medium px-5 hover:bg-incompatible/90 transition-colors disabled:opacity-50"
          >
            Hesabımı Sil
          </button>
        </div>
      </section>
    </div>
  );
}

// ==============================
// TERCİHLER
// ==============================
function TercihlerTab({ token }: { token: string }) {
  const { showToast } = useToast();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getMyAccount(token)
      .then(setAccount)
      .finally(() => setIsLoading(false));
  }, [token]);

  async function handleChange(
    field: keyof Pick<
      AccountInfo,
      | 'language'
      | 'emailNewsletterOptIn'
      | 'emailNotifyOnActivity'
      | 'notifyOnBuildComment'
      | 'notifyOnBuildLike'
    >,
    value: string | boolean,
  ) {
    if (!account) return;
    setIsSaving(true);
    const previous = account[field];
    setAccount({ ...account, [field]: value });
    try {
      await updateMyPreferences({ [field]: value }, token);
      showToast('Tercih güncellendi.', 'success');
    } catch (err) {
      setAccount({ ...account, [field]: previous });
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !account) {
    return <p className="text-ink-muted">Yükleniyor...</p>;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-hairline p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-1">
          Dil
        </h2>
        <p className="text-xs text-ink-muted mb-3">
          Şu an sadece Türkçe destekleniyor. Bu tercih ileride çoklu dil desteği
          geldiğinde kullanılacak.
        </p>
        <select
          value={account.language}
          disabled
          className="rounded-xl border border-hairline px-4 py-2.5 text-sm bg-surface text-ink-muted cursor-not-allowed"
        >
          <option value="tr">Türkçe</option>
        </select>
      </section>

      <section className="rounded-2xl border border-hairline p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-4">
          E-posta Bildirimleri
        </h2>

        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={account.emailNewsletterOptIn}
              disabled={isSaving}
              onChange={(e) =>
                handleChange('emailNewsletterOptIn', e.target.checked)
              }
              className="w-4 h-4 mt-0.5 accent-trace cursor-pointer"
            />
            <div>
              <p className="text-sm font-medium">Haberler ve güncellemeler</p>
              <p className="text-xs text-ink-muted">
                SistemGaraj&apos;daki yeni özellikler ve duyurular hakkında
                e-posta al.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={account.emailNotifyOnActivity}
              disabled={isSaving}
              onChange={(e) =>
                handleChange('emailNotifyOnActivity', e.target.checked)
              }
              className="w-4 h-4 mt-0.5 accent-trace cursor-pointer"
            />
            <div>
              <p className="text-sm font-medium">Etkinlik bildirimleri</p>
              <p className="text-xs text-ink-muted">
                Hesabınla ilgili önemli etkinlikler için e-posta al.
              </p>
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-hairline p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-4">
          Uygulama İçi Bildirimler
        </h2>

        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={account.notifyOnBuildComment}
              disabled={isSaving}
              onChange={(e) =>
                handleChange('notifyOnBuildComment', e.target.checked)
              }
              className="w-4 h-4 mt-0.5 accent-trace cursor-pointer"
            />
            <div>
              <p className="text-sm font-medium">Yorum bildirimleri</p>
              <p className="text-xs text-ink-muted">
                Sistemine yorum yapıldığında bildirim al.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={account.notifyOnBuildLike}
              disabled={isSaving}
              onChange={(e) =>
                handleChange('notifyOnBuildLike', e.target.checked)
              }
              className="w-4 h-4 mt-0.5 accent-trace cursor-pointer"
            />
            <div>
              <p className="text-sm font-medium">Beğeni bildirimleri</p>
              <p className="text-xs text-ink-muted">
                Sistemin beğenildiğinde bildirim al.
              </p>
            </div>
          </label>
        </div>
      </section>
    </div>
  );
}
