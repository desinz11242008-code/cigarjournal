import { Heart, MessageCircle, MoreVertical, Send, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StrengthBolts } from "@/components/Ratings";

type SocialPost = {
  id: string;
  user_id: string;
  cigar_id: string | null;
  image_url: string | null;
  caption: string | null;
  created_at: string;
  profiles: { name: string | null; avatar_url: string | null } | null;
  cigars: any | null;
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
    <div className="relative min-h-full">
      {/* Background Ember Glow matching other tabs */}
      <div className="ember-glow pointer-events-none absolute inset-x-0 top-0 h-64" />

      {/* Main Container matching other tabs */}
      <div className="relative mx-auto w-full max-w-lg px-4">
        
        {/* Header matching Journal/Forum */}
        <header className="flex items-end justify-between pb-4 pt-[calc(2rem+env(safe-area-inset-top,16px))]">
          <div>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
              Social
            </h1>
            <p className="text-sm text-muted-foreground transition-all duration-200">
              Community feed and shared journals
            </p>
          </div>
        </header>

        {/* Feed */}
        {isLoading ? (
          <div className="mt-8 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-4 h-64" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-muted-foreground">Failed to load feed.</div>
        ) : !posts || posts.length === 0 ? (
          <div className="animate-scale-in mt-16 flex flex-col items-center text-center">
            <div className="ember-glow mb-5 flex h-24 w-24 items-center justify-center rounded-full">
              <span className="text-4xl">📸</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Welcome to Social</h2>
            <p className="mt-1 max-w-[260px] text-sm text-muted-foreground">
              When people share their cigar journals, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pb-28">
            {posts.map((post, i) => (
              <SocialPostCard key={post.id} post={post} currentUser={user} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function SocialPostCard({ post, currentUser, index }: { post: SocialPost; currentUser: any; index: number }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const hasLiked = post.social_likes.some((like) => like.user_id === currentUser?.id);
  const [optimisticLike, setOptimisticLike] = useState(hasLiked);
  const [likeCount, setLikeCount] = useState(post.social_likes.length);

  const handleToggleLike = async () => {
    if (!currentUser) {
      toast.error("Sign in to like posts");
      return;
    }

    const isLiking = !optimisticLike;
    setOptimisticLike(isLiking);
    setLikeCount((prev) => (isLiking ? prev + 1 : prev - 1));

    try {
      if (isLiking) {
        await supabase.from("social_likes").insert({ post_id: post.id, user_id: currentUser.id });
      } else {
        await supabase.from("social_likes").delete().match({ post_id: post.id, user_id: currentUser.id });
      }
      queryClient.invalidateQueries({ queryKey: ["social-feed"] });
    } catch (error) {
      setOptimisticLike(!isLiking);
      setLikeCount((prev) => (isLiking ? prev - 1 : prev + 1));
      toast.error("Failed to update like");
    }
  };

  const handleCommentClick = () => {
    toast("Comments coming soon!");
  };

  return (
    <article 
      className="animate-fade-up rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-accent/30"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      {/* Post Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 overflow-hidden rounded-full border border-border bg-muted">
            {post.profiles?.avatar_url ? (
              <img src={post.profiles.avatar_url} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                {(post.profiles?.name || "A")[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-[14px] font-semibold leading-tight text-foreground">
              {post.profiles?.name || "Anonymous"}
            </p>
            {post.cigars?.location && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{post.cigars.location}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{timeAgo(post.created_at)}</span>
          <button className="p-1 text-muted-foreground transition-colors hover:text-foreground active:scale-95">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Main Image (Edge to edge inside the card) */}
      {post.image_url && (
        <div className="relative aspect-square w-full bg-black/20">
          <img src={post.image_url} alt="Post" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      )}

      {/* Linked Journal Card */}
      {post.cigars && (
        <div className={`px-4 ${post.image_url ? "mt-4" : ""}`}>
          <div 
            onClick={() => navigate(`/entry/${post.cigars.id}`)}
            className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background/50 p-3 transition-colors hover:border-accent/40 hover:bg-accent/5 active:scale-[0.98]"
          >
            {/* Tiny Cigar Thumbnail */}
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[hsl(var(--field))]">
              {post.cigars.photos && post.cigars.photos.length > 0 ? (
                <img src={post.cigars.photos[0]} alt="Cigar" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-xl">🚬</span>
                </div>
              )}
            </div>
            {/* Cigar Specs */}
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-bold text-foreground">{post.cigars.cigarName}</h4>
              <p className="truncate text-xs text-muted-foreground mt-0.5">{post.cigars.brand}</p>
              <div className="mt-1.5">
                <StrengthBolts strength={post.cigars.strength} size={10} />
              </div>
            </div>
            {/* Rating */}
            {post.cigars.rating > 0 && (
              <div className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 border border-accent/20">
                <span className="text-sm font-bold text-accent">{post.cigars.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Bar & Caption */}
      <div className="p-4 pt-3">
        <div className="flex items-center gap-4">
          <button onClick={handleToggleLike} className="transition-transform active:scale-75">
            <Heart 
              size={22} 
              className={`transition-colors ${optimisticLike ? "fill-accent text-accent" : "text-muted-foreground hover:text-foreground"}`} 
            />
          </button>
          <button onClick={handleCommentClick} className="transition-transform active:scale-75 text-muted-foreground hover:text-foreground">
            <MessageCircle size={22} />
          </button>
          <button className="transition-transform active:scale-75 text-muted-foreground hover:text-foreground">
            <Send size={22} />
          </button>
        </div>
        
        {/* Likes Count */}
        {likeCount > 0 && (
          <p className="mt-2.5 text-[13px] font-semibold text-foreground">
            {likeCount} {likeCount === 1 ? "like" : "likes"}
          </p>
        )}

        {/* Caption */}
        {post.caption && (
          <div className={`text-[13px] text-foreground ${likeCount > 0 ? "mt-1" : "mt-2.5"}`}>
            <span className="mr-1.5 font-semibold">{post.profiles?.name || "Anonymous"}</span>
            <span className="whitespace-pre-wrap text-muted-foreground">{post.caption}</span>
          </div>
        )}

        {/* View Comments Link */}
        {post.social_comments && post.social_comments.length > 0 && post.social_comments[0]?.count > 0 && (
          <button onClick={handleCommentClick} className="mt-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            View all {post.social_comments[0].count} comments
          </button>
        )}
      </div>
    </article>
  );
}

export default Social;