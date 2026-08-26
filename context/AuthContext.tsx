'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole } from '@/types';
import { getSettings } from '@/lib/storage';

interface AuthContextType {
  role: UserRole;
  login: (pin: string) => 'owner' | 'worker' | 'wrong';
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  login: () => 'wrong',
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('lamaefarm_role') as UserRole;
    if (saved) setRole(saved);
  }, []);

  function login(pin: string): 'owner' | 'worker' | 'wrong' {
    const settings = getSettings();
    if (pin === settings.ownerPin) {
      setRole('owner');
      sessionStorage.setItem('lamaefarm_role', 'owner');
      return 'owner';
    }
    if (pin === settings.workerPin) {
      setRole('worker');
      sessionStorage.setItem('lamaefarm_role', 'worker');
      return 'worker';
    }
    return 'wrong';
  }

  function logout() {
    setRole(null);
    sessionStorage.removeItem('lamaefarm_role');
  }

  return (
    <AuthContext.Provider value={{ role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
