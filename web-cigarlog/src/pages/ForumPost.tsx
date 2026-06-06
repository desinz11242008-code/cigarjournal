import {
  ArrowLeft,
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  Send,
  Reply,
  Trash2,
} from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { SignInContext } from "@/components/TabLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type ForumPost = Tables<"forum_posts">;
type ForumComment = Tables<"forum_comments">;
type Profile = Tables<"profiles">;
type ForumVote = Tables<"forum_votes">;

type PostWithProfile = ForumPost & { profiles: Profile | null };
type CommentWithProfile = ForumComment & { profiles: Profile | null };

const CATEGORY_COLORS: Record<string, string> = {
  discussion: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  recommendation: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  question: "bg-green-500/10 text-green-400 border-green-500/20",
  review: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  pairing: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const CATEGORIES = [
  { value: "discussion", label: "Discussion" },
  { value: "recommendation", label: "Cigar Suggestion" },
  { value: "question", label: "Question" },
  { value: "review", label: "Review" },
  { value: "pairing", label: "Pairing" },
] as const;

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
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

const ForumPostPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const openSignIn = useContext(SignInContext);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");

  const { data: post, isLoading } = useQuery({
    queryKey: ["forum-post", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_posts")
        .select("*, profiles:user_id(id, name, avatar_url)")
        .eq("id", id!)
        .single();

      if (error) throw error;
      return data as unknown as PostWithProfile;
    },
    enabled: !!id,
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["forum-comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_comments")
        .select("*, profiles:user_id(id, name, avatar_url)")
        .eq("post_id", id!)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data as unknown as CommentWithProfile[]) ?? [];
    },
    enabled: !!id,
  });

  const { data: userVotes } = useQuery({
    queryKey: ["forum-votes", id, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("forum_votes")
        .select("*")
        .eq("target_type", "post")
        .eq("target_id", id!)
        .eq("user_id", user.id);

      if (error) throw error;

      const commentVotes = await supabase
        .from("forum_votes")
        .select("*")
        .eq("target_type", "comment")
        .in(
          "target_id",
          comments?.map((c) => c.id) ?? [],
        )
        .eq("user_id", user.id);

      return [
        ...(data ?? []),
        ...(commentVotes.data ?? []),
      ];
    },
    enabled: !!id && !!user && !commentsLoading,
  });

  const voteMutation = useMutation({
    mutationFn: async ({
      targetType,
      targetId,
      vote,
      existingVote,
    }: {
      targetType: "post" | "comment";
      targetId: string;
      vote: 1 | -1;
      existingVote: ForumVote | undefined;
    }) => {
      if (!user) throw new Error("Must be signed in");

      if (existingVote) {
        if (existingVote.vote === vote) {
          // Remove vote
          await supabase
            .from("forum_votes")
            .delete()
            .eq("id", existingVote.id);

          const table = targetType === "post" ? "forum_posts" : "forum_comments";
          await supabase.rpc("adjust_votes", {
            target_table: table,
            target_id: targetId,
            upvote_delta: existingVote.vote === 1 ? -1 : 0,
            downvote_delta: existingVote.vote === -1 ? 1 : 0,
          } as never);
        } else {
          // Flip vote
          await supabase
            .from("forum_votes")
            .update({ vote })
            .eq("id", existingVote.id);

          const table = targetType === "post" ? "forum_posts" : "forum_comments";
          if (existingVote.vote === -1 && vote === 1) {
            await supabase.rpc("adjust_votes", {
              target_table: table,
              target_id: targetId,
              upvote_delta: 1,
              downvote_delta: -1,
            } as never);
          } else {
            await supabase.rpc("adjust_votes", {
              target_table: table,
              target_id: targetId,
              upvote_delta: -1,
              downvote_delta: 1,
            } as never);
          }
        }
      } else {
        // New vote
        await supabase.from("forum_votes").insert({
          user_id: user.id,
          target_type: targetType,
          target_id: targetId,
          vote,
        });

        const table = targetType === "post" ? "forum_posts" : "forum_comments";
        if (vote === 1) {
          await supabase.rpc("adjust_votes", {
            target_table: table,
            target_id: targetId,
            upvote_delta: 1,
            downvote_delta: 0,
          } as never);
        } else {
          await supabase.rpc("adjust_votes", {
            target_table: table,
            target_id: targetId,
            upvote_delta: 0,
            downvote_delta: 1,
          } as never);
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["forum-post", id] });
      void queryClient.invalidateQueries({ queryKey: ["forum-comments", id] });
      void queryClient.invalidateQueries({
        queryKey: ["forum-votes", id],
      });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error("Must be signed in");
      const { error } = await supabase.from("forum_comments").insert({
        post_id: id,
        user_id: user.id,
        parent_id: replyToId,
        body: commentBody.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setCommentBody("");
      setReplyToId(null);
      void queryClient.invalidateQueries({ queryKey: ["forum-comments", id] });
      void queryClient.invalidateQueries({ queryKey: ["forum-post", id] });
      toast.success("Comment added");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("forum_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["forum-comments", id] });
      void queryClient.invalidateQueries({ queryKey: ["forum-post", id] });
      toast.success("Comment deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const getUserVote = (targetType: string, targetId: string) =>
    userVotes?.find(
      (v) => v.target_type === targetType && v.target_id === targetId,
    );

  // Build threaded comment tree
  const threadedComments = useMemo(() => {
    // FIXED: Now safely fallback to matching empty object structure instead of array
    if (!comments) return { topLevel: [], replies: () => [] };
    const topLevel = comments.filter((c) => !c.parent_id);
    const replies = (parentId: string): CommentWithProfile[] =>
      comments.filter((c) => c.parent_id === parentId);
    return { topLevel, replies };
  }, [comments]);

  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-background">
        <div className="safe-top relative mx-auto max-w-lg px-4 pt-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-3/4 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="relative min-h-screen bg-background">
        <div className="safe-top relative mx-auto max-w-lg px-4 pt-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <p className="text-muted-foreground">Post not found.</p>
        </div>
      </div>
    );
  }

  const postVote = getUserVote("post", post.id);
  const postScore = post.upvotes - post.downvotes;

  return (
    <div className="relative min-h-screen bg-background">
      <div className="ember-glow pointer-events-none absolute inset-x-0 top-0 h-64" />

      <div className="safe-top relative mx-auto max-w-lg px-4 pb-10 pt-8">
        {/* Back */}
        <button
          onClick={() => navigate("/forum")}
          className="mb-5 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:text-foreground active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Post */}
        <article className="mb-8">
          {/* Category + Time */}
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${CATEGORY_COLORS[post.category] ?? CATEGORY_COLORS.discussion}`}
            >
              {CATEGORIES.find((c) => c.value === post.category)?.label ??
                post.category}
            </span>
            <span className="text-xs text-muted-foreground">
              {timeAgo(post.created_at)}
            </span>
          </div>

          <h1 className="mb-3 text-[22px] font-bold leading-tight text-foreground">
            {post.title}
          </h1>

          {post.body && (
            <p className="mb-4 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/85">
              {post.body}
            </p>
          )}

          {/* Author + Voting */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2.5">
              {post.profiles?.avatar_url ? (
                <img
                  src={post.profiles.avatar_url}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {(post.profiles?.name ?? "?")[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {post.profiles?.name ?? "Anonymous"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {timeAgo(post.created_at)}
                </p>
              </div>
            </div>

            {/* Vote buttons */}
            <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
              <button
                onClick={() => {
                  if (!user) {
                    openSignIn?.();
                    return;
                  }
                  voteMutation.mutate({
                    targetType: "post",
                    targetId: post.id,
                    vote: 1,
                    existingVote: postVote,
                  });
                }}
                disabled={voteMutation.isPending}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all active:scale-95 ${
                  postVote?.vote === 1
                    ? "text-accent"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowBigUp size={18} />
                {postScore}
              </button>
              <div className="h-4 w-px bg-border" />
              <button
                onClick={() => {
                  if (!user) {
                    openSignIn?.();
                    return;
                  }
                  voteMutation.mutate({
                    targetType: "post",
                    targetId: post.id,
                    vote: -1,
                    existingVote: postVote,
                  });
                }}
                disabled={voteMutation.isPending}
                className={`rounded-md px-2.5 py-1.5 text-sm transition-all active:scale-95 ${
                  postVote?.vote === -1
                    ? "text-rose-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowBigDown size={18} />
              </button>
            </div>
          </div>
        </article>

        {/* Comments Section */}
        <div className="mb-6 flex items-center gap-2">
          <MessageSquare size={18} className="text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">
            Comments{' '}
            <span className="text-muted-foreground">
              ({comments?.length ?? 0})
            </span>
          </h2>
        </div>

        {commentsLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl border border-border bg-card"
              />
            ))}
          </div>
        ) : threadedComments.topLevel.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <MessageSquare
              size={28}
              className="mx-auto mb-3 text-muted-foreground/50"
            />
            <p className="text-sm text-muted-foreground">
              No comments yet. Be the first to share your thoughts.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {threadedComments.topLevel.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                replies={threadedComments.replies(comment.id)}
                allReplies={threadedComments.replies}
                getUserVote={getUserVote}
                onVote={(targetType, targetId, vote, existingVote) =>
                  voteMutation.mutate({
                    targetType,
                    targetId,
                    vote,
                    existingVote,
                  })
                }
                onReply={(commentId) => {
                  if (!user) {
                    openSignIn?.();
                    return;
                  }
                  setReplyToId(commentId);
                  const el = document.getElementById("comment-form");
                  el?.scrollIntoView({ behavior: "smooth" });
                  el?.querySelector("textarea")?.focus();
                }}
                onDelete={(commentId) => deleteComment.mutate(commentId)}
                isVoting={voteMutation.isPending}
                currentUserId={user?.id}
                depth={0}
              />
            ))}
          </div>
        )}

        {/* Comment Form */}
        <div id="comment-form" className="mt-6">
          {!user ? (
            <button
              onClick={() => openSignIn?.()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3.5 text-sm font-medium text-muted-foreground transition-all hover:border-accent/40 hover:text-foreground active:scale-[0.99]"
            >
              <MessageSquare size={16} />
              Sign in to comment
            </button>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-4">
              {replyToId && (
                <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Reply size={12} />
                  Replying to a comment
                  <button
                    onClick={() => setReplyToId(null)}
                    className="ml-auto text-accent hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
                className="mb-3 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-accent/50"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {commentBody.length}/2000
                </span>
                <button
                  onClick={() => addComment.mutate()}
                  disabled={!commentBody.trim() || addComment.isPending}
                  className="flex items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-all active:scale-[0.98] disabled:opacity-40"
                >
                  {addComment.isPending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
                  ) : (
                    <Send size={14} />
                  )}
                  Comment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function CommentThread({
  comment,
  replies,
  allReplies,
  getUserVote,
  onVote,
  onReply,
  onDelete,
  isVoting,
  currentUserId,
  depth,
}: {
  comment: CommentWithProfile;
  replies: CommentWithProfile[];
  allReplies: (parentId: string) => CommentWithProfile[];
  getUserVote: (targetType: string, targetId: string) => ForumVote | undefined;
  onVote: (
    targetType: "post" | "comment",
    targetId: string,
    vote: 1 | -1,
    existingVote: ForumVote | undefined,
  ) => void;
  onReply: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  isVoting: boolean;
  currentUserId: string | undefined;
  depth: number;
}) {
  const vote = getUserVote("comment", comment.id);
  const score = comment.upvotes - comment.downvotes;
  const isOwner = currentUserId === comment.user_id;

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-border pl-4" : ""}>
      <div className="group rounded-xl py-3">
        <div className="mb-1.5 flex items-center gap-2">
          {comment.profiles?.avatar_url ? (
            <img
              src={comment.profiles.avatar_url}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
              referrerPolicy="no-referrer"
                />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
              {(comment.profiles?.name ?? "?")[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium text-foreground">
            {comment.profiles?.name ?? "Anonymous"}
          </span>
          <span className="text-xs text-muted-foreground">
            {timeAgo(comment.created_at)}
          </span>
        </div>

        <p className="mb-2 whitespace-pre-wrap text-[14px] leading-relaxed text-foreground/85">
          {comment.body}
        </p>

        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              onVote("comment", comment.id, 1, vote)
            }
            disabled={isVoting}
            className={`rounded-md p-1.5 transition-all active:scale-95 ${
              vote?.vote === 1
                ? "text-accent"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowBigUp size={16} />
          </button>
          <span className="min-w-[1.5rem] text-center text-xs font-medium text-foreground">
            {score}
          </span>
          <button
            onClick={() =>
              onVote("comment", comment.id, -1, vote)
            }
            disabled={isVoting}
            className={`rounded-md p-1.5 transition-all active:scale-95 ${
              vote?.vote === -1
                ? "text-rose-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowBigDown size={16} />
          </button>

          <button
            onClick={() => onReply(comment.id)}
            className="ml-2 flex items-center gap-1 rounded-md p-1.5 text-xs text-muted-foreground transition-all hover:text-foreground active:scale-95"
          >
            <Reply size={13} />
            Reply
          </button>

          {isOwner && (
            <button
              onClick={() => onDelete(comment.id)}
              className="ml-auto rounded-md p-1.5 text-muted-foreground transition-all hover:text-rose-400 active:scale-95 opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {replies.map((reply) => (
        <CommentThread
          key={reply.id}
          comment={reply}
          replies={allReplies(reply.id)}
          allReplies={allReplies}
          getUserVote={getUserVote}
          onVote={onVote}
          onReply={onReply}
          onDelete={onDelete}
          isVoting={isVoting}
          currentUserId={currentUserId}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default ForumPostPage;