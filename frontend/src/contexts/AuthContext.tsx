import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { meApi } from '../services/api';
import { AppRole } from '../types';

interface AuthContextType {
  role: AppRole | null;
  userId: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ role: null, userId: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await meApi.getProfile();
        setRole(profile.role);
        setUserId(profile.id);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  return (
    <AuthContext.Provider value={{ role, userId, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
