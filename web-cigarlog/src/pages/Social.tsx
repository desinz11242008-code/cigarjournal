import { Heart, MessageCircle, MoreVertical, Send, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StrengthBolts } from "@/components/Ratings";

// Define the shape of our nested database response
type SocialPost = {
  id: string;
  user_id: string;
  cigar_id: string | null;
  image_url: string | null;
  caption: string | null;
  created_at: string;
  profiles: { name: string | null; avatar_url: string | null } | null;
  cigars: any | null; // The linked journal entry
  social_likes: { user_id: string }[];
  social_comments: { count: number }[];
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
  return `${Math.floor(days / 30)}mo`;
}

const Social = () => {
  const { user } = useAuth();
  
  const { data: posts, isLoading, isError } = useQuery({
    queryKey: ["social-feed"],
    queryFn: async () => {
      // Fetch posts and deeply join profiles, linked cigars, likes, and comment counts
      const { data, error } = await supabase
        .from("social_posts")
        .select(`
          *,
          profiles:user_id (name, avatar_url),
          cigars:cigar_id (*),
          social_likes (user_id),
          social_comments (count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SocialPost[];
    },
  });

  return (
    <div className="relative min-h-full bg-background pb-24">
      <div className="ember-glow pointer-events-none fixed inset-x-0 top-0 h-64 z-0" />

      <div className="relative z-10 mx-auto w-full max-w-lg px-0 sm:px-4">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/50 bg-background/80 px-4 pb-3 pt-[calc(1.5rem+env(safe-area-inset-top,16px))] backdrop-blur-md sticky top-0 z-20">
          <h1 className="text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: "serif" }}>
            Community
          </h1>
          <button className="rounded-full p-2 text-foreground transition-colors hover:bg-muted active:scale-95">
            <Send size={20} />
          </button>
        </header>

        {/* Feed */}
        {isLoading ? (
          <div className="mt-20 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-muted-foreground">Failed to load feed.</div>
        ) : !posts || posts.length === 0 ? (
          <div className="mt-20 flex flex-col items-center p-8 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-border text-4xl">
              📸
            </div>
            <h2 className="text-xl font-bold text-foreground">Welcome to Social</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              When people share their cigar journals, they will appear here. Go to your Journal to share the first one!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pt-4 sm:gap-8">
            {posts.map((post) => (
              <SocialPostCard key={post.id} post={post} currentUser={user} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function SocialPostCard({ post, currentUser }: { post: SocialPost; currentUser: any }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Check if current user has liked this post
  const hasLiked = post.social_likes.some((like) => like.user_id === currentUser?.id);
  const [optimisticLike, setOptimisticLike] = useState(hasLiked);
  const [likeCount, setLikeCount] = useState(post.social_likes.length);

  const handleToggleLike = async () => {
    if (!currentUser) {
      toast.error("Sign in to like posts");
      return;
    }

    // Optimistic UI update instantly makes it feel fast
    const isLiking = !optimisticLike;
    setOptimisticLike(isLiking);
    setLikeCount((prev) => (isLiking ? prev + 1 : prev - 1));

    try {
      if (isLiking) {
        await supabase.from("social_likes").insert({ post_id: post.id, user_id: currentUser.id });
      } else {
        await supabase.from("social_likes").delete().match({ post_id: post.id, user_id: currentUser.id });
      }
      // Silently refresh the feed in the background
      queryClient.invalidateQueries({ queryKey: ["social-feed"] });
    } catch (error) {
      // Revert if it fails
      setOptimisticLike(!isLiking);
      setLikeCount((prev) => (isLiking ? prev - 1 : prev + 1));
      toast.error("Failed to update like");
    }
  };

  const handleCommentClick = () => {
    toast("Comments coming soon!");
  };

  return (
    <article className="border-b border-border/40 bg-card pb-5 sm:rounded-2xl sm:border">
      {/* Post Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 overflow-hidden rounded-full border border-border bg-muted">
            {post.profiles?.avatar_url ? (
              <img src={post.profiles.avatar_url} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-bold">
                {(post.profiles?.name || "A")[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-[13px] font-semibold leading-tight text-foreground">
              {post.profiles?.name || "Anonymous"}
            </p>
            {post.cigars?.location && (
              <p className="text-[11px] text-muted-foreground">{post.cigars.location}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{timeAgo(post.created_at)}</span>
          <button className="p-1 text-muted-foreground hover:text-foreground">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Main Image (If uploaded specifically for this post) */}
      {post.image_url && (
        <div className="relative aspect-square w-full bg-black/5">
          <img src={post.image_url} alt="Post" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      )}

      {/* Linked Journal Card */}
      {post.cigars && (
        <div className={`px-4 ${post.image_url ? "mt-4" : ""}`}>
          <div 
            onClick={() => navigate(`/entry/${post.cigars.id}`)}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background/50 p-3 transition-colors hover:bg-accent/5 active:scale-[0.98]"
          >
            {/* Tiny Cigar Thumbnail */}
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
              {post.cigars.photos && post.cigars.photos.length > 0 ? (
                <img src={post.cigars.photos[0]} alt="Cigar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl">🚬</div>
              )}
            </div>
            {/* Cigar Specs */}
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-bold text-foreground">{post.cigars.cigarName}</h4>
              <p className="truncate text-xs text-muted-foreground">{post.cigars.brand}</p>
              <div className="mt-1">
                <StrengthBolts strength={post.cigars.strength} size={10} />
              </div>
            </div>
            {/* Rating */}
            {post.cigars.rating > 0 && (
              <div className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1">
                <span className="text-sm font-bold text-accent">{post.cigars.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-4">
          <button onClick={handleToggleLike} className="transition-transform active:scale-75">
            <Heart 
              size={24} 
              className={`transition-colors ${optimisticLike ? "fill-red-500 text-red-500" : "text-foreground"}`} 
            />
          </button>
          <button onClick={handleCommentClick} className="transition-transform active:scale-75 text-foreground">
            <MessageCircle size={24} />
          </button>
          <button className="transition-transform active:scale-75 text-foreground">
            <Send size={24} />
          </button>
        </div>
        
        {/* Likes Count */}
        {likeCount > 0 && (
          <p className="mt-2 text-[13px] font-semibold text-foreground">
            {likeCount} {likeCount === 1 ? "like" : "likes"}
          </p>
        )}

        {/* Caption */}
        {post.caption && (
          <div className="mt-1.5 text-[13px] text-foreground">
            <span className="mr-1.5 font-semibold">{post.profiles?.name || "Anonymous"}</span>
            <span className="whitespace-pre-wrap">{post.caption}</span>
          </div>
        )}

        {/* View Comments Link */}
        {post.social_comments && post.social_comments.length > 0 && post.social_comments[0]?.count > 0 && (
          <button onClick={handleCommentClick} className="mt-1.5 text-[13px] text-muted-foreground">
            View all {post.social_comments[0].count} comments
          </button>
        )}
      </div>
    </article>
  );
}

export default Social;