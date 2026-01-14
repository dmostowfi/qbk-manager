import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { meApi, setAuthToken } from '../shared/api/services';
import { AppRole, UserProfile } from '../shared/types';

interface AuthContextType {
  role: AppRole | null;
  userId: string | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ role: null, userId: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { getToken, isSignedIn } = useClerkAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isSignedIn) {
        setRole(null);
        setUserId(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        // Get the Clerk token and set it for API requests
        const token = await getToken();
        setAuthToken(token);

        const userProfile = await meApi.getProfile();
        setRole(userProfile.role);
        setUserId(userProfile.id);
        setProfile(userProfile);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        setRole(null);
        setUserId(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isSignedIn, getToken]);

  return (
    <AuthContext.Provider value={{ role, userId, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAppAuth() {
  return useContext(AuthContext);
}
