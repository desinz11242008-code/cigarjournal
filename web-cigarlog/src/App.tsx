import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CigarProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/journal" replace />} />
            <Route element={<TabLayout />}>
              <Route path="/journal" element={<Journal />} />
              <Route path="/social" element={<Social />} />
              <Route path="/forum" element={<Forum />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="/add" element={<AddEditEntry />} />
            <Route path="/edit/:id" element={<AddEditEntry />} />
            <Route path="/entry/:id" element={<EntryDetail />} />
            <Route path="/forum/new" element={<CreatePost />} />
            <Route path="/forum/:id" element={<ForumPostPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </CigarProvider>
  </QueryClientProvider>
);

export default App;
