'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sayfa ilk yüklendiğinde, tarayıcıda kayıtlı token var mı diye bak
  useEffect(() => {
    const savedToken = localStorage.getItem('sistemgaraj_token');
    const savedUser = localStorage.getItem('sistemgaraj_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }

    setIsLoading(false);
  }, []);

  function saveSession(newToken: string, newUser: AuthUser) {
    localStorage.setItem('sistemgaraj_token', newToken);
    localStorage.setItem('sistemgaraj_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  async function login(email: string, password: string) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Giriş başarısız.');
    }

    saveSession(data.token, data.user);
  }

  async function register(email: string, password: string, name: string) {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Kayıt başarısız.');
    }

    // Kayıt sonrası otomatik giriş yap
    await login(email, password);
  }

  function logout() {
    localStorage.removeItem('sistemgaraj_token');
    localStorage.removeItem('sistemgaraj_user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalı.');
  }
  return context;
}
