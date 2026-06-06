import {
  ArrowLeft,
  Send,
} from "lucide-react";
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

import { SignInContext } from "@/components/TabLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "discussion", label: "Discussion" },
  { value: "recommendation", label: "Cigar Suggestion" }, // Maps directly to "recommendation" DB category filter
  { value: "question", label: "Q&A" },                   // Maps directly to "question" DB category filter
  { value: "review", label: "Review" },
  { value: "pairing", label: "Pairing" },
] as const;

const CreatePost = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const openSignIn = useContext(SignInContext);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("discussion");

  if (!user) {
    return (
      <div className="relative min-h-screen bg-background">
        <div className="ember-glow pointer-events-none absolute inset-x-0 top-0 h-64" />
        <div className="safe-top relative mx-auto max-w-lg px-4 pt-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="animate-scale-in mt-16 flex flex-col items-center text-center">
            <div className="ember-glow mb-5 flex h-24 w-24 items-center justify-center rounded-full">
              <Send size={32} className="text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Sign in required</h2>
            <p className="mt-1 max-w-[260px] text-sm text-muted-foreground">
              You need to sign in to create a forum post.
            </p>
            <button
              onClick={() => openSignIn?.()}
              className="mt-6 rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground transition-transform active:scale-95"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  const createPost = useMutation({
    mutationFn: async () => {
      // Reverted to "forum_posts" with type assertion to resolve the TS 'never' block
      const { error } = await supabase.from("forum_posts" as any).insert({
        title: title.trim(),
        body: body.trim(),
        category,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post created!");
      navigate("/forum");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create post");
    },
  });

  const canSubmit = title.trim().length >= 3;

  return (
    <div className="relative min-h-screen bg-background">
      <div className="ember-glow pointer-events-none absolute inset-x-0 top-0 h-64" />

      <div className="safe-top relative mx-auto max-w-lg px-4 pb-24 pt-8">
        {/* Nav */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:text-foreground active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-foreground">Create Post</h1>
        </div>

        {/* Category */}
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Category
        </label>
        <div className="mb-4 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all active:scale-95 ${
                category === cat.value
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Title */}
        <label
          htmlFor="post-title"
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          Title
        </label>
        <input
          id="post-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Best cigar for a beginner?"
          maxLength={200}
          className="mb-4 h-12 w-full rounded-xl border border-border bg-card px-4 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-accent/50"
        />

        {/* Body */}
        <label
          htmlFor="post-body"
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          Body <span className="text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="post-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share more details about your question or recommendation..."
          rows={6}
          className="mb-6 w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-accent/50"
        />

        {/* Submit */}
        <button
          onClick={() => createPost.mutate()}
          disabled={!canSubmit || createPost.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 font-semibold text-accent-foreground transition-all active:scale-[0.98] disabled:opacity-40"
        >
          {createPost.isPending ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
          ) : (
            <Send size={18} />
          )}
          {createPost.isPending ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
};

export default CreatePost;