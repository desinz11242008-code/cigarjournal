import {
  ArrowBigUp,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { SignInContext } from "@/components/TabLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type ForumPost = Tables<"forum_posts">;
type Profile = Tables<"profiles">;
type ForumVote = Tables<"forum_votes">;

type PostWithProfile = ForumPost & { profiles: Profile | null };

type TabMode = "qa" | "suggestion";

const CATEGORY_LABELS: Record<string, string> = {
  question: "Q&A",
  recommendation: "Cigar Suggestion", // Updated display label
};

const CATEGORY_COLORS: Record<string, string> = {
  question: "bg-green-500/10 text-green-400 border-green-500/20",
  recommendation: "bg-amber-500/10 text-amber-400 border-amber-500/20",
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
  const queryClient = useQueryClient();
  const openSignIn = useContext(SignInContext);
  const [tabMode, setTabMode] = useState<TabMode>("qa");

  const categoryFilter = tabMode === "qa" ? "question" : "recommendation";

  const { data: posts, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["forum-posts", tabMode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_posts")
        .select("*, profiles:user_id(id, name, avatar_url)")
        .eq("category", categoryFilter)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as unknown as PostWithProfile[]) ?? [];
    },
  });

  const sortedPosts = useMemo(() => {
    if (!posts) return [];
    return [...posts];
  }, [posts]);

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
        {/* Header - Configured to anchor safely away from the iPhone Notch / Dynamic Island */}
        <header className="flex items-end justify-between pb-3 pt-[calc(2rem+env(safe-area-inset-top,16px))]">
          <div>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
              Forum
            </h1>
            <p className="text-sm text-muted-foreground">
              {tabMode === "qa" ? "Ask and answer cigar questions" : "Share and browse cigar recommendations"}
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

        {/* Tab Switcher */}
        <div className="mb-4 flex gap-1 rounded-xl bg-card p-1">
          {(
            [
              { key: "qa" as const, icon: HelpCircle, label: "Q&A" },
              { key: "suggestion" as const, icon: Lightbulb, label: "Cigar Suggestion" }, // Updated tab display label
            ]
          ).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTabMode(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all ${
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
        ) : sortedPosts.length === 0 ? (
          <EmptyForum onCreatePost={handleCreatePost} isSignedIn={!!user} />
        ) : (
          <div className="space-y-3 pb-28">
            {sortedPosts.map((post, i) => (
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

      {/* FAB — Matched perfectly to Journal tab positioning on both mobile and desktop PC */}
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
  const score = post.upvotes - post.downvotes;
  const bodyPreview =
    post.body.length > 150 ? post.body.slice(0, 150) + "…" : post.body;

  return (
    <article
      onClick={onClick}
      className="animate-fade-up cursor-pointer rounded-2xl border border-border bg-card p-4 transition-all hover:border-accent/30 active:scale-[0.99]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Category + Time */}
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${CATEGORY_COLORS[post.category] ?? "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}
        >
          {CATEGORY_LABELS[post.category] ?? post.category}
        </span>
        <span className="text-xs text-muted-foreground">
          {timeAgo(post.created_at)}
        </span>
      </div>

      {/* Title */}
      <h3 className="mb-1.5 text-[16px] font-semibold leading-snug text-foreground">
        {post.title}
      </h3>

      {/* Body preview */}
      {post.body && (
        <p className="mb-3 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
          {bodyPreview}
        </p>
      )}

      {/* Footer: author, votes, comments */}
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
              {(post.profiles?.name ?? "?")[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-xs text-muted-foreground">
            {post.profiles?.name ?? "Anonymous"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
  );
}

function EmptyForum({
  onCreatePost,
  isSignedIn,
}: {
  onCreatePost: () => void;
  isSignedIn: boolean;
}) {
  return (
    <div className="animate-scale-in mt-16 flex flex-col items-center text-center">
      <div className="ember-glow mb-5 flex h-24 w-24 items-center justify-center rounded-full">
        <MessageSquare size={32} className="text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">No posts yet</h2>
      <p className="mt-1 max-w-[260px] text-sm text-muted-foreground">
        {isSignedIn
          ? "Be the first to ask a question or share a cigar suggestion."
          : "Sign in to ask questions or share cigar suggestions."}
      </p>
      <button
        onClick={onCreatePost}
        className="mt-6 rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground transition-transform active:scale-95"
      >
        {isSignedIn ? "Create a post" : "Sign in to post"}
      </button>
    </div>
  );
}

export default Forum;