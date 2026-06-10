import { Heart, MessageCircle, MoreVertical, Loader2, X, Send, Plus, MapPin, Pencil, Trash2, Image as ImageIcon, CornerDownRight, Check, ArrowLeft } from "lucide-react";
import { useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Cropper from "react-easy-crop";
import { v4 as uuidv4 } from "uuid";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StrengthBolts } from "@/components/Ratings";
import { CreatePostModal } from "@/components/CreatePostModal";
import { EditPostModal } from "@/components/EditPostModal";
import { getCroppedImg } from "@/utils/cropUtils";

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
  
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  
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
                onEdit={() => setEditingPost(post)}
                onRefresh={refreshFeed}
              />
            ))}
          </div>
        )}
      </div>

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

      <EditPostModal
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        post={editingPost}
        onPostSuccess={refreshFeed}
      />
    </div>
  );
};

function SocialPostCard({ 
  post, 
  currentUser, 
  index, 
  onOpenComments,
  onEdit,
  onRefresh
}: { 
  post: SocialPost; 
  currentUser: any; 
  index: number;
  onOpenComments: () => void;
  onEdit: () => void;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const hasLiked = post.social_likes.some((like) => like.user_id === currentUser?.id);
  const [optimisticLike, setOptimisticLike] = useState(hasLiked);
  const [likeCount, setLikeCount] = useState(post.social_likes.length);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showJournalEditConfirm, setShowJournalEditConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAuthor = currentUser?.id === post.user_id;

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

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const { error } = await supabase.from("social_posts").delete().eq("id", post.id);
      if (error) throw error;
      toast.success("Post deleted");
      setShowDeleteConfirm(false);
      onRefresh();
    } catch (err) {
      toast.error("Failed to delete post");
      setIsDeleting(false);
    }
  };

  const handleEditClick = () => {
    setShowMenu(false);
    if (post.cigar_id) {
      setShowJournalEditConfirm(true);
    } else {
      onEdit();
    }
  };

  const cigarDateStr = post.cigars?.timestamp || post.cigars?.created_at;
  const formattedCigarDate = cigarDateStr ? new Date(cigarDateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  }) : "";

  return (
    <>
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
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{timeAgo(post.created_at)}</span>
            
            {isAuthor && (
              <div className="relative">
                <button 
                  onClick={() => setShowMenu(!showMenu)} 
                  className="p-1 text-muted-foreground transition-colors hover:text-foreground active:scale-95"
                >
                  <MoreVertical size={16} />
                </button>
                
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-border bg-card shadow-lg p-1.5 z-20 animate-scale-in origin-top-right">
                      <button 
                        onClick={handleEditClick} 
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors text-foreground"
                      >
                        <Pencil size={14} /> Edit Post
                      </button>
                      <button 
                        onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }} 
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-md transition-colors mt-0.5"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
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
              className="group w-full cursor-pointer overflow-hidden rounded-2xl border border-border bg-background/50 text-left transition-all duration-200 active:scale-[0.985] hover:border-accent/40"
            >
              <div className="flex h-[130px]">
                <div className="relative h-full w-[110px] shrink-0 overflow-hidden bg-[hsl(var(--field))]">
                  {post.cigars.photos && post.cigars.photos.length > 0 ? (
                    <img
                      src={post.cigars.photos[0]}
                      alt={post.cigars.cigar_name || "Cigar"}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="ember-glow flex h-12 w-12 items-center justify-center rounded-full">
                        <span className="text-2xl">🚬</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-between p-3.5">
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-[15px] font-semibold text-foreground">
                        {post.cigars.cigar_name || post.cigars.cigarName || post.cigars.name || "Untitled Cigar"}
                      </h3>
                      <span className="shrink-0 text-[11px] font-medium text-muted-foreground mt-0.5">
                        {formattedCigarDate}
                      </span>
                    </div>

                    <div className="mt-0.5 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {post.cigars.brand && (
                          <p className="truncate text-[13px] text-accent/90">{post.cigars.brand}</p>
                        )}
                        {post.cigars.vitola && (
                          <p className="truncate text-xs text-muted-foreground mt-0.5">
                            {post.cigars.vitola}
                          </p>
                        )}
                      </div>

                      {post.cigars.rating > 0 && (
                        <div className="flex shrink-0 items-baseline gap-0.5 rounded-full bg-accent/10 px-2 py-0.5 mt-0.5 border border-accent/20">
                          <span className="text-sm font-bold text-accent">
                            {Number(post.cigars.rating).toFixed(1)}
                          </span>
                          <span className="text-[10px] font-medium text-accent/70">
                            /10
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-2 mt-auto pt-2">
                    <div className="flex flex-col gap-1.5">
                      <StrengthBolts strength={post.cigars.strength} size={12} />
                      {post.cigars.location && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin size={11} className="shrink-0" />
                          <span className="max-w-[90px] truncate">{post.cigars.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" onClick={() => !isDeleting && setShowDeleteConfirm(false)}>
          <div className="animate-scale-in w-full max-w-[320px] rounded-3xl border border-border bg-card p-6 shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10"><Trash2 className="text-red-500" size={28} /></div>
            <h3 className="mb-2 text-xl font-bold text-foreground">Delete Post?</h3>
            <p className="mb-6 text-sm text-muted-foreground">This action cannot be undone. This post will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className="flex-1 rounded-xl bg-muted py-3.5 text-[15px] font-bold text-foreground">Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex-1 rounded-xl bg-red-500 py-3.5 text-[15px] font-bold text-white flex justify-center items-center gap-2 shadow-md">{isDeleting ? <Loader2 size={18} className="animate-spin" /> : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {showJournalEditConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" onClick={() => setShowJournalEditConfirm(false)}>
          <div className="animate-scale-in w-full max-w-[340px] rounded-3xl border border-border bg-card p-6 shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10"><span className="text-2xl">🚬</span></div>
            <h3 className="mb-2 text-xl font-bold text-foreground">Edit this journal?</h3>
            <p className="mb-6 text-sm text-muted-foreground">This post is linked to your Cigar Journal. Let's modify the master log sheet!</p>
            <div className="flex gap-3">
              <button onClick={() => setShowJournalEditConfirm(false)} className="w-1/3 rounded-xl bg-muted py-3.5 text-[15px] font-bold text-foreground">Cancel</button>
              <button onClick={() => { setShowJournalEditConfirm(false); navigate(`/edit/${post.cigar_id}`); }} className="w-2/3 rounded-xl bg-accent py-3.5 text-[15px] font-bold text-accent-foreground shadow-md">Edit Journal</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// --- INSTAGRAM THREADED COMMENT ROW ---
function CommentRow({ comment, currentUser, onReplyClick }: { comment: any; currentUser: any; onReplyClick: (c: any) => void }) {
  const queryClient = useQueryClient();
  const hasLiked = comment.social_comment_likes?.some((like: any) => like.user_id === currentUser?.id);
  const [optimisticLike, setOptimisticLike] = useState(hasLiked);
  const [likeCount, setLikeCount] = useState(comment.social_comment_likes?.length || 0);

  const handleToggleLike = async () => {
    if (!currentUser) return;
    const isLiking = !optimisticLike;
    setOptimisticLike(isLiking);
    setLikeCount((prev: number) => (isLiking ? prev + 1 : prev - 1));
    try {
      if (isLiking) {
        await supabase.from("social_comment_likes").insert({ comment_id: comment.id, user_id: currentUser.id });
      } else {
        await supabase.from("social_comment_likes").delete().match({ comment_id: comment.id, user_id: currentUser.id });
      }
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    } catch (error) {
      setOptimisticLike(!isLiking);
      setLikeCount((prev: number) => (isLiking ? prev - 1 : prev + 1));
    }
  };

  return (
    <div className="flex gap-3 group items-start py-1">
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
        {comment.profiles?.avatar_url ? (
          <img src={comment.profiles.avatar_url} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-muted-foreground">
            {(comment.profiles?.name || "A")[0].toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-foreground">{comment.profiles?.name || "Anonymous"}</span>
          <span className="text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-[13px] text-foreground mt-0.5 leading-relaxed break-words">
          {/* Highlight tagged users organically if they replied to a sub-reply */}
          {comment.replying_to && <span className="text-accent mr-1 font-medium">@{comment.replying_to}</span>}
          {comment.body}
        </p>
        
        {comment.image_url && (
          <div className="mt-2 relative max-w-[180px] aspect-square rounded-xl overflow-hidden border border-border bg-black">
            <img src={comment.image_url} alt="Comment attachment" className="h-full w-full object-contain" />
          </div>
        )}

        <div className="mt-1 flex items-center gap-3">
          <button onClick={() => onReplyClick(comment)} className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors">
            Reply
          </button>
        </div>
      </div>
      <div className="flex flex-col items-center pt-1 pl-2">
        <button onClick={handleToggleLike} className="transition-transform active:scale-75 p-1">
          <Heart size={13} className={`transition-colors ${optimisticLike ? "fill-accent text-accent" : "text-muted-foreground hover:text-foreground"}`} />
        </button>
        {likeCount > 0 && <span className="text-[10px] font-medium text-muted-foreground -mt-0.5">{likeCount}</span>}
      </div>
    </div>
  );
}

// --- PREMIUM NESTED COMMENT MODAL COMPONENT ---
function CommentModal({ postId, isOpen, onClose }: { postId: string | null; isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [replyTarget, setReplyTarget] = useState<any>(null);

  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [croppedImageUrlPreview, setCroppedImageUrlPreview] = useState<string | null>(null);
  
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);

  const { data: rawComments, isLoading } = useQuery({
    queryKey: ["comments", postId],
    enabled: isOpen && !!postId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_comments")
        .select(`
          *,
          profiles:user_id (name, avatar_url),
          social_comment_likes (user_id)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const commentTree = useMemo(() => {
    const safeComments: any[] = Array.isArray(rawComments) ? rawComments : [];
    const roots = safeComments.filter(c => !c.parent_id);
    const repliesMap: { [key: string]: any[] } = {};

    safeComments.forEach((curr) => {
      if (curr.parent_id) {
        if (!repliesMap[curr.parent_id]) {
          repliesMap[curr.parent_id] = [];
        }
        repliesMap[curr.parent_id].push(curr);
      }
    });

    return roots.map(root => ({
      ...root,
      replies: repliesMap[root.id] || []
    }));
  }, [rawComments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setRawImageSrc(reader.result as string);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      };
      reader.readAsDataURL(file);
    }
  };

  const confirmCommentImageCrop = async () => {
    if (!rawImageSrc || !croppedAreaPixels) return;
    try {
      setIsCropping(true);
      const blob = await getCroppedImg(rawImageSrc, croppedAreaPixels);
      setCroppedImageBlob(blob!);
      setCroppedImageUrlPreview(URL.createObjectURL(blob!));
      setRawImageSrc(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCropping(false);
    }
  };

  const clearSelectedImage = () => {
    setCroppedImageBlob(null);
    setCroppedImageUrlPreview(null);
    setRawImageSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !postId) return;
    if (!newComment.trim() && !croppedImageBlob) return;

    setIsSubmitting(true);
    try {
      let publicImageUrl = null;

      if (croppedImageBlob) {
        const filename = `${user.id}-comment-${uuidv4()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("posts")
          .upload(filename, croppedImageBlob, { contentType: "image/jpeg" });
        
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("posts").getPublicUrl(filename);
        publicImageUrl = data.publicUrl;
      }

      // Determine the correct root thread ID. If replying to a sub-comment, use its parent's ID.
      const threadRootId = replyTarget 
        ? (replyTarget.parent_id ? replyTarget.parent_id : replyTarget.id) 
        : null;

      const { error } = await supabase
        .from("social_comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          body: newComment.trim(),
          image_url: publicImageUrl,
          parent_id: threadRootId
        } as any);

      if (error) throw error;
      
      setNewComment(""); 
      clearSelectedImage();
      setReplyTarget(null);
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
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-background/80 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="animate-fade-up flex h-[75vh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-border bg-card shadow-2xl sm:h-[600px] sm:max-w-md sm:rounded-3xl sm:border" onClick={(e) => e.stopPropagation()}>
        
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 shrink-0">
          <h3 className="text-base font-bold text-foreground">Comments</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-card">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
          ) : commentTree.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground opacity-70">
              <MessageCircle size={32} className="mb-2" />
              <p className="text-sm">No comments yet. Share your thoughts!</p>
            </div>
          ) : (
            commentTree.map((rootComment: any) => (
              <div key={rootComment.id} className="space-y-2">
                <CommentRow comment={rootComment} currentUser={user} onReplyClick={(c) => setReplyTarget(c)} />
                
                {rootComment.replies.map((reply: any) => (
                  <div key={reply.id} className="pl-6 flex gap-1 items-start border-l border-border/40 ml-4">
                    <CornerDownRight size={14} className="text-muted-foreground/50 mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <CommentRow comment={reply} currentUser={user} onReplyClick={(c) => setReplyTarget(c)} />
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border/50 bg-background/90 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shrink-0 space-y-2">
          {replyTarget && (
            <div className="flex items-center justify-between bg-muted/60 px-3 py-1.5 rounded-lg text-xs font-medium animate-scale-in">
              <span className="text-muted-foreground">Replying to <span className="text-foreground font-semibold">@{replyTarget.profiles?.name || "user"}</span></span>
              <button onClick={() => setReplyTarget(null)} className="text-muted-foreground hover:text-foreground"><X size={14}/></button>
            </div>
          )}

          {croppedImageUrlPreview && (
            <div className="relative inline-block w-16 h-16 rounded-xl overflow-hidden border border-border bg-black animate-scale-in">
              <img src={croppedImageUrlPreview} alt="attachment" className="w-full h-full object-cover" />
              <button type="button" onClick={clearSelectedImage} className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5"><X size={10}/></button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-full border transition-colors shrink-0 ${croppedImageUrlPreview ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}
            >
              <ImageIcon size={16} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

            <div className="relative flex-1 flex items-center">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyTarget ? "Write a reply..." : "Add a comment..."}
                className="h-10 w-full rounded-full border border-border bg-card pl-4 pr-12 text-[13px] text-foreground outline-none transition-colors focus:border-accent/50"
              />
              <button
                type="submit"
                disabled={isSubmitting || (!newComment.trim() && !croppedImageBlob)}
                className="absolute right-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} className="-ml-0.5" />}
              </button>
            </div>
          </form>
        </div>
      </div>

      {rawImageSrc && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h3 className="font-bold text-sm">Crop Comment Photo</h3>
              <button onClick={clearSelectedImage} className="p-1 rounded-full hover:bg-muted"><X size={16}/></button>
            </div>
            <div className="relative w-full h-64 bg-black">
              <Cropper
                image={rawImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={(_, px) => setCroppedAreaPixels(px)}
                onZoomChange={setZoom}
              />
            </div>
            <div className="p-4 border-t border-border bg-card flex gap-2">
              <button type="button" onClick={clearSelectedImage} className="w-1/3 py-2.5 rounded-xl bg-muted text-foreground font-bold text-xs flex items-center justify-center gap-1"><ArrowLeft size={14}/> Cancel</button>
              <button type="button" onClick={confirmCommentImageCrop} disabled={isCropping} className="w-2/3 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold text-xs flex items-center justify-center gap-1 shadow-sm">
                {isCropping ? <Loader2 size={14} className="animate-spin" /> : <Check size={14}/>} Confirm Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Social;