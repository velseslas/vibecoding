import React, { createContext, useContext } from 'react';
import { ClerkProvider, useUser, useAuth, useClerk } from '@clerk/clerk-react';
import { setAuthTokenGetter } from '../../services/api';

const CLERK_ENABLED = (import.meta as any).env?.VITE_CLERK_ENABLED === 'true';
const CLERK_PUBLISHABLE_KEY = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY || '';

interface AuthContextType {
  isClerkEnabled: boolean;
  isSignedIn: boolean;
  isLoaded: boolean;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userAvatar: string | null;
  signOut: () => void;
  openSignIn: () => void;
}

const DevAuthContext = createContext<AuthContextType>({
  isClerkEnabled: false,
  isSignedIn: true,
  isLoaded: true,
  userId: 'dev-user',
  userName: 'Developer',
  userEmail: 'dev@local',
  userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Developer',
  signOut: () => {},
  openSignIn: () => {},
});

export const useAppAuth = (): AuthContextType => {
  if (CLERK_ENABLED && CLERK_PUBLISHABLE_KEY && CLERK_PUBLISHABLE_KEY.startsWith('pk_')) {
    try {
      const { isSignedIn, isLoaded, userId } = useAuth();
      const { user } = useUser();
      const clerk = useClerk();

      return {
        isClerkEnabled: true,
        isSignedIn: !!isSignedIn,
        isLoaded: !!isLoaded,
        userId: userId || null,
        userName: user?.fullName || user?.firstName || (user?.primaryEmailAddress?.emailAddress ? user.primaryEmailAddress.emailAddress.split('@')[0] : 'Créateur'),
        userEmail: user?.primaryEmailAddress?.emailAddress || null,
        userAvatar: user?.imageUrl || null,
        signOut: () => clerk.signOut(),
        openSignIn: () => clerk.openSignIn(),
      };
    } catch {
      return useContext(DevAuthContext);
    }
  }

  return useContext(DevAuthContext);
};

function ClerkTokenSynchronizer({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();

  React.useEffect(() => {
    if (isSignedIn) {
      setAuthTokenGetter(async () => {
        try {
          return await getToken();
        } catch {
          return null;
        }
      });
    } else {
      setAuthTokenGetter(() => null);
    }
  }, [isSignedIn, getToken]);

  return <>{children}</>;
}

export const ClerkAppWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // If Clerk is enabled and a valid publishable key is present, wrap with ClerkProvider
  if (CLERK_ENABLED && CLERK_PUBLISHABLE_KEY && CLERK_PUBLISHABLE_KEY.startsWith('pk_')) {
    return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <ClerkTokenSynchronizer>
          {children}
        </ClerkTokenSynchronizer>
      </ClerkProvider>
    );
  }

  // Development mode: pass children through with DevAuthContext without ClerkProvider
  return (
    <DevAuthContext.Provider
      value={{
        isClerkEnabled: false,
        isSignedIn: true,
        isLoaded: true,
        userId: 'dev-user',
        userName: 'Developer',
        userEmail: 'dev@local',
        userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Developer',
        signOut: () => {},
        openSignIn: () => {},
      }}
    >
      {children}
    </DevAuthContext.Provider>
  );
};
