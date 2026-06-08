import {
  ArrowBigUp,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Plus,
  RefreshCw,
  Wine,
  Star,
  Trash2,
  AlertTriangle,
  Globe,
} from "lucide-react";
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { SignInContext } from "@/components/TabLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type ForumPost = Tables<"forum_posts">;
type Profile = Tables<"profiles">;

type PostWithProfile = ForumPost & { profiles: Profile | null };

type TabMode = "all" | "discussion" | "suggestion" | "qa" | "review" | "pairing";

const CATEGORY_LABELS: Record<TabMode, string> = {
  all: "All Posts",
  discussion: "Discussion",
  suggestion: "Cigar Suggestion",
  qa: "Q&A",
  review: "Review",
  pairing: "Pairing",
};

const CATEGORY_DESCRIPTIONS: Record<TabMode, string> = {
  all: "Browse all posts across the community",
  discussion: "General cigar chat and community news",
  suggestion: "Share and browse cigar recommendations",
  qa: "Ask and answer cigar questions",
  review: "Read and post detailed cigar reviews",
  pairing: "Discover ideal drink and food pairings",
};

const CATEGORY_DB_FILTER: Record<TabMode, string> = {
  all: "all",
  discussion: "discussion",
  suggestion: "recommendation",
  qa: "question",
  review: "review",
  pairing: "pairing",
};

const CATEGORY_COLORS: Record<string, string> = {
  discussion: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  recommendation: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  suggestion: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  question: "bg-green-500/10 text-green-400 border-green-500/20",
  qa: "bg-green-500/10 text-green-400 border-green-500/20",
  review: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  pairing: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

const Forum = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const openSignIn = useContext(SignInContext);
  
  const [tabMode, setTabMode] = useState<TabMode>("all");

  const categoryFilter = CATEGORY_DB_FILTER[tabMode];

  const { data: combinedData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["forum-posts-combined", tabMode],
    queryFn: async () => {
      let query = supabase
        .from("forum_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (tabMode !== "all") {
        query = query.eq("category", categoryFilter);
      }

      const { data: postsData, error: postsError } = await query;

      if (postsError) throw postsError;
      if (!postsData || postsData.length === 0) return [];

      const userIds = Array.from(new Set(postsData.map((p) => p.user_id))).filter(Boolean);

      if (userIds.length === 0) {
        return postsData.map(post => ({ ...post, profiles: null })) as PostWithProfile[];
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*") 
        .in("id", userIds);

      if (profilesError) {
        console.error("🚨 SUPABASE PROFILES ERROR:", profilesError);
        return postsData.map((post) => ({ ...post, profiles: null })) as PostWithProfile[];
      }

      const profileMap = new Map(profilesData?.map((p) => [p.id, p]) ?? []);
      
      return postsData.map((post) => ({
        ...post,
        profiles: profileMap.get(post.user_id) || null,
      })) as PostWithProfile[];
    },
  });

  const handleCreatePost = () => {
    if (!user) {
      openSignIn?.();
      return;
    }
    navigate("/forum/new");
  };

  return (
    <div className="relative min-h-full">
      <div className="ember-glow pointer-events-none absolute inset-x-0 top-0 h-64" />

      <div className="relative mx-auto w-full max-w-lg px-4">
        {/* Header */}
        <header className="flex items-end justify-between pb-3 pt-[calc(2rem+env(safe-area-inset-top,16px))]">
          <div>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
              Forum
            </h1>
            <p className="text-sm text-muted-foreground transition-all duration-200">
              {CATEGORY_DESCRIPTIONS[tabMode]}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="mb-1 rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground active:scale-95"
            aria-label="Refresh"
          >
            <RefreshCw size={18} className={isFetching ? "animate-spin" : ""} />
          </button>
        </header>

        {/* Tab Switcher - Responsive scrolling on mobile, wrapping on desktop */}
        <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto md:flex-wrap md:overflow-visible rounded-xl bg-card p-1">
          {(
            [
              { key: "all" as const, icon: Globe, label: "All Posts" },
              { key: "discussion" as const, icon: MessageSquare, label: "Discussion" },
              { key: "suggestion" as const, icon: Lightbulb, label: "Cigar Suggestion" },
              { key: "qa" as const, icon: HelpCircle, label: "Q&A" },
              { key: "review" as const, icon: Star, label: "Review" },
              { key: "pairing" as const, icon: Wine, label: "Pairing" },
            ]
          ).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTabMode(key)}
              className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                tabMode === key
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Post List */}
        {isLoading ? (
          <div className="mt-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-border bg-card p-4"
              >
                <div className="mb-3 h-4 w-3/4 rounded bg-muted" />
                <div className="mb-2 h-3 w-full rounded bg-muted" />
                <div className="mb-4 h-3 w-2/3 rounded bg-muted" />
                <div className="flex gap-4">
                  <div className="h-3 w-16 rounded bg-muted" />
                  <div className="h-3 w-12 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : !combinedData || combinedData.length === 0 ? (
          <EmptyForum onCreatePost={handleCreatePost} isSignedIn={!!user} categoryLabel={CATEGORY_LABELS[tabMode]} />
        ) : (
          <div className="space-y-3 pb-28">
            {combinedData.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                index={i}
                onClick={() => navigate(`/forum/${post.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={handleCreatePost}
        className="fixed right-5 bottom-[calc(4.75rem+env(safe-area-inset-bottom,24px))] md:bottom-[72px] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_6px_24px_-4px_hsl(28_64%_56%/0.7)] transition-transform active:scale-95"
        aria-label="Create post"
      >
        <Plus size={24} strokeWidth={2.8} />
      </button>
    </div>
  );
};

function PostCard({
  post,
  index,
  onClick,
}: {
  post: PostWithProfile;
  index: number;
  onClick: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const score = post.upvotes - post.downvotes;
  const bodyPreview =
    post.body && post.body.length > 150 ? post.body.slice(0, 150) + "…" : post.body;

  const displayLabel = CATEGORY_LABELS[post.category as TabMode] || 
                       (post.category === "recommendation" ? "Cigar Suggestion" : 
                        post.category === "question" ? "Q&A" : post.category);

  const isAuthor = user?.id === post.user_id;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setShowConfirmModal(true);
  };

  const executeDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmModal(false);

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from("forum_posts")
        .delete()
        .eq("id", post.id);

      if (error) throw error;
      
      toast.success("Post deleted.");
      queryClient.invalidateQueries({ queryKey: ["forum-posts-combined"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete post");
      console.error(error);
      setIsDeleting(false); 
    }
  };

  return (
    <>
      <article
        onClick={onClick}
        className={`animate-fade-up cursor-pointer rounded-2xl border border-border bg-card p-4 transition-all hover:border-accent/30 active:scale-[0.99] ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span
            className={`rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${CATEGORY_COLORS[post.category] ?? "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}
          >
            {displayLabel}
          </span>
          <span className="text-xs text-muted-foreground">
            {timeAgo(post.created_at)}
          </span>
        </div>

        <h3 className="mb-1.5 text-[16px] font-semibold leading-snug text-foreground">
          {post.title}
        </h3>

        {post.body && (
          <p className="mb-3 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            {bodyPreview}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {post.profiles?.avatar_url ? (
              <img
                src={post.profiles.avatar_url}
                alt=""
                className="h-5 w-5 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                {(post.profiles?.name ?? "A")[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              {post.profiles?.name ?? "Anonymous"}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {isAuthor && (
              <button 
                onClick={handleDeleteClick}
                className="flex items-center justify-center p-1 text-muted-foreground transition-colors hover:text-destructive active:scale-90"
                aria-label="Delete post"
              >
                <Trash2 size={15} />
              </button>
            )}

            <span className="flex items-center gap-1">
              <ArrowBigUp size={14} className={score > 0 ? "text-accent" : ""} />
              {score}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare size={13} />
              {post.comment_count}
            </span>
          </div>
        </div>
      </article>

      {/* Custom Delete Confirmation Modal */}
      {showConfirmModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirmModal(false);
          }}
        >
          <div 
            className="animate-scale-in w-full max-w-xs rounded-3xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()} 
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle size={24} />
            </div>
            <h3 className="mb-2 text-lg font-bold text-foreground">Delete Post?</h3>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              This action cannot be undone. This will permanently remove your post and all its comments.
            </p>
            <div className="flex gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirmModal(false);
                }}
                className="flex-1 rounded-xl bg-muted py-3 font-semibold text-foreground transition-colors hover:bg-muted/80 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 rounded-xl bg-destructive py-3 font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EmptyForum({
  onCreatePost,
  isSignedIn,
  categoryLabel,
}: {
  onCreatePost: () => void;
  isSignedIn: boolean;
  categoryLabel: string;
}) {
  return (
    <div className="animate-scale-in mt-16 flex flex-col items-center text-center">
      <div className="ember-glow mb-5 flex h-24 w-24 items-center justify-center rounded-full">
        <MessageSquare size={32} className="text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">No posts yet</h2>
      <p className="mt-1 max-w-[260px] text-sm text-muted-foreground">
        {isSignedIn
          ? `Be the first to create a post in ${categoryLabel}.`
          : `Sign in to create a post in ${categoryLabel}.`}
      </p>
      <button
        type="button"
        onClick={onCreatePost}
        className="mt-6 rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground transition-transform active:scale-95"
      >
        {isSignedIn ? "Create a post" : "Sign in to post"}
      </button>
    </div>
  );
}

export default Forum;