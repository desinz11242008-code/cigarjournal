import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CigarProvider } from "@/store/useCigars";

import TabLayout from "./components/TabLayout";
import AddEditEntry from "./pages/AddEditEntry";
import AuthCallback from "./pages/AuthCallback";
import EntryDetail from "./pages/EntryDetail";
import Forum from "./pages/Forum";
import CreatePost from "./pages/CreatePost";
import ForumPostPage from "./pages/ForumPost";
import Journal from "./pages/Journal";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Social from "./pages/Social";
import Auth from "@/pages/Auth"; // FIXED: Changed relative path to absolute alias mapping

const queryClient = new QueryClient();

// A security wrapper that intercepts users and redirects them to login if they aren't signed in
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for real-time auth changes (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1A1A1D] text-white font-sans">
        Opening the humidor...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CigarProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Publicly accessible authentication routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Protected routes - wrapped securely inside ProtectedRoute */}
            <Route path="/" element={<Navigate to="/journal" replace />} />
            
            <Route element={<ProtectedRoute><TabLayout /></ProtectedRoute>}>
              <Route path="/journal" element={<Journal />} />
              <Route path="/social" element={<Social />} />
              <Route path="/forum" element={<Forum />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            
            <Route path="/add" element={<ProtectedRoute><AddEditEntry /></ProtectedRoute>} />
            <Route path="/edit/:id" element={<ProtectedRoute><AddEditEntry /></ProtectedRoute>} />
            <Route path="/entry/:id" element={<ProtectedRoute><EntryDetail /></ProtectedRoute>} />
            <Route path="/forum/new" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
            <Route path="/forum/:id" element={<ProtectedRoute><ForumPostPage /></ProtectedRoute>} />
            
            {/* Fallback 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </CigarProvider>
  </QueryClientProvider>
);

export default App;