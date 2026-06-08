import { useState } from "react";
import { Loader2, Send, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CigarEntry } from "@/types/cigar";

export function ShareModal({
  isOpen,
  onClose,
  entry,
}: {
  isOpen: boolean;
  onClose: () => void;
  entry: CigarEntry;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  if (!isOpen) return null;

  const handlePublish = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("You must be signed in to share posts.");
      return;
    }

    try {
      setIsPublishing(true);

      // Insert the new post into the social_posts table
      const { error } = await supabase.from("social_posts").insert({
        user_id: user.id,
        cigar_id: entry.id,
        caption: caption.trim() || null,
        // If the journal entry has photos, use the first one as the main social image
        image_url: entry.photos && entry.photos.length > 0 ? entry.photos[0] : null,
      });

      if (error) throw error;

      toast.success("Successfully posted to the Social feed!");
      
      // Tell React Query to refresh the social feed in the background so it's ready when they look
      queryClient.invalidateQueries({ queryKey: ["social-feed"] });
      
      onClose(); // Close the modal
    } catch (error: any) {
      toast.error(error.message || "Failed to publish post");
      console.error(error);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="animate-scale-in w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <h3 className="text-lg font-bold text-foreground">Share to Social</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Mini Preview of what they are sharing */}
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
              {entry.photos && entry.photos.length > 0 ? (
                <img
                  src={entry.photos[0]}
                  alt="Cigar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg">🚬</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-bold text-foreground">{entry.cigarName}</h4>
              <p className="truncate text-xs text-muted-foreground">{entry.brand}</p>
            </div>
            {entry.rating > 0 && (
              <div className="shrink-0 text-sm font-bold text-accent">
                {entry.rating.toFixed(1)}/10
              </div>
            )}
          </div>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption... (How was the draw? What did you pair it with?)"
            className="h-32 w-full resize-none rounded-xl border border-border bg-background p-4 text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-accent/50"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-5 py-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle size={12} />
            Public to community
          </p>
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 font-semibold text-accent-foreground shadow-lg transition-transform active:scale-95 disabled:opacity-50"
          >
            {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {isPublishing ? "Publishing..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}