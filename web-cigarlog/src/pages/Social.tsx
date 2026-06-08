import { Heart, MessageCircle, MoreVertical, Loader2, X, Send, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StrengthBolts } from "@/components/Ratings";
import { CreatePostModal } from "@/components/CreatePostModal";

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
  const queryClient = useQueryClient();
  
  // States for our two modals
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  
  const refreshFeed = () => {
    queryClient.invalidateQueries({ queryKey: ["social-feed"] });
  };

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
      <div className="ember-glow pointer-events-none absolute inset-x-0 top-0 h-64" />

      <div className="relative mx-auto w-full max-w-lg px-4">
        
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
              <Plus size={32} className="text-accent" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Welcome to Social</h2>
            <p className="mt-1 max-w-[260px] text-sm text-muted-foreground">
              Track the community smoke. Light one up and share your first moment!
            </p>
            <button
                type="button"
                onClick={() => setIsPostModalOpen(true)}
                className="mt-6 rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground transition-transform active:scale-95"
            >
                Share Cigar Moment
            </button>
          </div>
        ) : (
          <div className="space-y-4 pb-28">
            {posts.map((post, i) => (
              <SocialPostCard 
                key={post.id} 
                post={post} 
                currentUser={user} 
                index={i} 
                onOpenComments={() => setCommentPostId(post.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      {user && (
        <button
          type="button"
          onClick={() => setIsPostModalOpen(true)}
          className="fixed right-5 bottom-[calc(4.75rem+env(safe-area-inset-bottom,24px))] md:bottom-[72px] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_6px_24px_-4px_hsl(28_64%_56%/0.7)] transition-transform active:scale-95"
          aria-label="Cigar Moment Share"
        >
          <Plus size={24} strokeWidth={2.8} />
        </button>
      )}

      {/* Modals */}
      <CommentModal 
        postId={commentPostId} 
        isOpen={!!commentPostId} 
        onClose={() => setCommentPostId(null)} 
      />

      <CreatePostModal 
        isOpen={isPostModalOpen} 
        onClose={() => setIsPostModalOpen(false)}
        onPostSuccess={refreshFeed}
      />
    </div>
  );
};

function SocialPostCard({ 
  post, 
  currentUser, 
  index, 
  onOpenComments 
}: { 
  post: SocialPost; 
  currentUser: any; 
  index: number;
  onOpenComments: () => void;
}) {
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

  return (
    <article 
      className="animate-fade-up rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-accent/30"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
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

      {post.image_url && (
        <div className="relative aspect-square w-full bg-black/20">
          <img src={post.image_url} alt="Post" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      )}

      {post.cigars && (
        <div className={`px-4 ${post.image_url ? "mt-4" : ""}`}>
          <div 
            onClick={() => navigate(`/entry/${post.cigars.id}`)}
            className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background/50 p-3 transition-colors hover:border-accent/40 hover:bg-accent/5 active:scale-[0.98]"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[hsl(var(--field))]">
              {post.cigars.photos && post.cigars.photos.length > 0 ? (
                <img src={post.cigars.photos[0]} alt="Cigar" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-xl">🚬</span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-bold text-foreground">{post.cigars.cigarName}</h4>
              <p className="truncate text-xs text-muted-foreground mt-0.5">{post.cigars.brand}</p>
              <div className="mt-1.5">
                <StrengthBolts strength={post.cigars.strength} size={10} />
              </div>
            </div>
            {post.cigars.rating > 0 && (
              <div className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 border border-accent/20">
                <span className="text-sm font-bold text-accent">{post.cigars.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-4 pt-3">
        <div className="flex items-center gap-4">
          <button onClick={handleToggleLike} className="transition-transform active:scale-75">
            <Heart 
              size={22} 
              className={`transition-colors ${optimisticLike ? "fill-accent text-accent" : "text-muted-foreground hover:text-foreground"}`} 
            />
          </button>
          <button onClick={onOpenComments} className="transition-transform active:scale-75 text-muted-foreground hover:text-foreground">
            <MessageCircle size={22} />
          </button>
        </div>
        
        {likeCount > 0 && (
          <p className="mt-2.5 text-[13px] font-semibold text-foreground">
            {likeCount} {likeCount === 1 ? "like" : "likes"}
          </p>
        )}

        {post.caption && (
          <div className={`text-[13px] text-foreground ${likeCount > 0 ? "mt-1" : "mt-2.5"}`}>
            <span className="mr-1.5 font-semibold">{post.profiles?.name || "Anonymous"}</span>
            <span className="whitespace-pre-wrap text-muted-foreground">{post.caption}</span>
          </div>
        )}

        {post.social_comments && post.social_comments.length > 0 && post.social_comments[0]?.count > 0 && (
          <button onClick={onOpenComments} className="mt-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            View all {post.social_comments[0].count} comments
          </button>
        )}
      </div>
    </article>
  );
}

// --- COMMENT MODAL COMPONENT ---
function CommentModal({ postId, isOpen, onClose }: { postId: string | null; isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: comments, isLoading } = useQuery({
    queryKey: ["comments", postId],
    enabled: isOpen && !!postId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_comments")
        .select(`
          *,
          profiles:user_id (name, avatar_url)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Sign in to comment");
      return;
    }
    if (!newComment.trim() || !postId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("social_comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          body: newComment.trim(),
        });

      if (error) throw error;
      
      setNewComment(""); 
      
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["social-feed"] });
      
    } catch (error: any) {
      toast.error(error.message || "Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col justify-end bg-background/80 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="animate-fade-up flex h-[75vh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-border bg-card shadow-2xl sm:h-[600px] sm:max-w-md sm:rounded-3xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 shrink-0">
          <h3 className="text-base font-bold text-foreground">Comments</h3>
          <button 
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : !comments || comments.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground opacity-70">
              <MessageCircle size={32} className="mb-2" />
              <p className="text-sm">No comments yet.</p>
              <p className="text-xs">Be the first to share your thoughts!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                  {comment.profiles?.avatar_url ? (
                    <img src={comment.profiles.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-muted-foreground">
                      {(comment.profiles?.name || "A")[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold text-foreground">
                      {comment.profiles?.name || "Anonymous"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {timeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-[13px] text-foreground mt-0.5 leading-relaxed">
                    {comment.body}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border/50 bg-background/50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shrink-0">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="h-10 w-full rounded-full border border-border bg-card pl-4 pr-12 text-[13px] text-foreground outline-none transition-colors focus:border-accent/50"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="absolute right-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-50 transition-transform active:scale-95"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} className="-ml-0.5" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Social;