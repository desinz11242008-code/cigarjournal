import { createContext, useState } from "react";
import { Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client"; // Swapped to native Supabase client

import TabBar from "@/components/TabBar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const SignInContext = createContext<(() => void) | null>(null);

const TabLayout = () => {
  const [showSignIn, setShowSignIn] = useState(false);
  const [customSigningIn, setCustomSigningIn] = useState(false); // Clean local loading state

  const handleGoogleSignIn = async () => {
    try {
      setCustomSigningIn(true);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // This tells Google to send the user straight back to your localhost:4173 page
          redirectTo: window.location.origin, 
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Google authentication error:", error);
      setCustomSigningIn(false);
    }
  };

  return (
    <SignInContext.Provider value={() => setShowSignIn(true)}>
      {/* iOS App Wrapper Shell */}
      <div className="relative flex min-h-screen w-full flex-col bg-[#1A1A1D] text-white overflow-x-hidden">
        
        {/* Scrollable View Area with safe dynamic padding calculation */}
        <main className="flex-1 w-full pb-[calc(4.5rem+env(safe-area-inset-bottom,16px))]">
          <Outlet />
        </main>

        {/* Sign-in Dialog */}
        <Dialog open={showSignIn} onOpenChange={setShowSignIn}>
          <DialogContent className="max-w-sm border-border bg-popover">
            <DialogHeader>
              <DialogTitle className="text-center text-lg text-foreground">
                Sign in to Cigar Journal
              </DialogTitle>
              <DialogDescription className="text-center">
                Save your journal and sync across devices.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 space-y-3">
              <button
                onClick={handleGoogleSignIn}
                disabled={customSigningIn}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-all hover:border-accent/40 active:scale-[0.98] disabled:opacity-60"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {customSigningIn ? "Signing in…" : "Continue with Google"}
              </button>
              <p className="text-center text-[11px] text-muted-foreground">
                Your data stays private. We only read your name and profile photo.
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Global Fixed Navigation */}
        <TabBar />
      </div>
    </SignInContext.Provider>
  );
};

export default TabLayout;