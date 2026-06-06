import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

/** Upsert the user's profile into Supabase after sign-in */
async function syncProfile(user: User) {
  try {
    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.picture,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Failed to sync profile", err);
  }
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
  signIn: (provider: "google" | "apple") => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  exchangeCode: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    // 1. Check for an existing session on page mount
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const mappedUser: User = {
            id: session.user.id,
            email: session.user.email ?? "",
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
            picture: session.user.user_metadata?.avatar_url,
          };
          setUser(mappedUser);
          void syncProfile(mappedUser);
        }
      } catch (err) {
        console.error("Error initializing auth:", err);
      } finally {
        setIsLoading(false);
      }
    };

    void initializeAuth();

    // 2. Listen natively for any login/logout events across your app
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const mappedUser: User = {
          id: session.user.id,
          email: session.user.email ?? "",
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
          picture: session.user.user_metadata?.avatar_url,
        };
        setUser(mappedUser);
        void syncProfile(mappedUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
      setIsSigningIn(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Standard native Supabase Sign In
  async function signIn(provider: "google" | "apple") {
    setIsSigningIn(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin, // Returns user straight back to localhost:4173
        },
      });

      if (error) throw error;
    } catch (err) {
      console.error("Native sign in failed:", err);
      setError(err instanceof Error ? err.message : "Sign in failed");
      setIsSigningIn(false);
    }
  }

  // Standard native Supabase Sign Out
  async function signOut() {
    try {
      await supabase.auth.signOut();
      queryClient.clear(); // Wipes out all cached server data from the browser memory instantly
      setUser(null);
    } catch (err) {
      console.error("Native sign out failed:", err);
    }
  }

  // Keep a dummy handler here so components expecting this method don't crash.
  // Supabase automatically handles code exchange internally via redirect url.
  async function exchangeCode(code: string) {
    return Promise.resolve();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSigningIn,
        error,
        signIn,
        signOut,
        clearError,
        exchangeCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}