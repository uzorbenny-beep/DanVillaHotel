import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

interface AuthContextType {
  user: User | MockUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAsMock: (name: string, email: string) => void;
  logout: () => Promise<void>;
  isMockUser: boolean;
}

export interface MockUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | MockUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMockUser, setIsMockUser] = useState(false);

  useEffect(() => {
    // Sync actual Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);
        setIsMockUser(false);
      } else {
        // Only clear if we were not already using a local sandbox mock profile
        setUser(prev => (prev && 'uid' in prev && prev.uid.startsWith('mock_') ? prev : null));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google authenticated login aborted:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginAsMock = (name: string, email: string) => {
    const mockProfile: MockUser = {
      uid: `mock_${Math.random().toString(36).substr(2, 9)}`,
      email,
      displayName: name,
      photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      emailVerified: true
    };
    setUser(mockProfile);
    setIsMockUser(true);
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setIsMockUser(false);
    } catch (error) {
      console.error("Logout procedure crashed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginAsMock, logout, isMockUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be called inside an AuthProvider scope.');
  }
  return context;
};
