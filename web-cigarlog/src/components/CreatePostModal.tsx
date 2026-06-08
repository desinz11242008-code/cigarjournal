import { Loader2, Plus, X, Crop, ZoomIn, Send } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getCroppedImg } from "@/utils/cropUtils";

export function CreatePostModal({
  isOpen,
  onClose,
  onPostSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPostSuccess: () => void;
}) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Post State
  const [caption, setCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image Cropper State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // 1. Handle File Selection and FileReader
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file.");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 2. Clear state and close the modal
  const handleClose = () => {
    setImageSrc(null);
    setCaption("");
    setZoom(1);
    onClose();
  };

  // 3. Main Post Submit Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be signed in to create a post.");
      return;
    }
    if (!imageSrc || !croppedAreaPixels) {
      toast.error("Please select and crop an image.");
      return;
    }
    if (!caption.trim()) {
      toast.error("A caption is required.");
      return;
    }

    try {
      setIsSubmitting(true);

      // A. Crop the final image
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedImageBlob) throw new Error("Failed to process cropped image.");

      // B. Generate a unique filename and upload to Supabase 'posts' bucket
      const filename = `${user.id}-${uuidv4()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("posts")
        .upload(filename, croppedImageBlob, { contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      // C. Get the public URL for the newly uploaded file
      const { data: publicUrlData } = supabase.storage
        .from("posts")
        .getPublicUrl(filename);
      const publicImageUrl = publicUrlData.publicUrl;

      // D. Insert a new row into the social_posts database table
      const { error: dbError } = await supabase.from("social_posts").insert({
        user_id: user.id,
        image_url: publicImageUrl,
        caption: caption.trim(),
      });

      if (dbError) throw dbError;

      // E. Clean up and provide feedback
      toast.success("Cigar moment shared!");
      handleClose();
      onPostSuccess(); // Call this to refresh the main social feed query
    } catch (error: any) {
      toast.error(error.message || "Failed to create post");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-background/80 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4"
      onClick={handleClose}
    >
      <form
        onSubmit={handleSubmit}
        className="animate-fade-up flex h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-border bg-card shadow-2xl sm:h-[650px] sm:max-w-xl sm:rounded-3xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4 shrink-0">
          <h3 className="text-lg font-bold text-foreground">Create New Post</h3>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Image Picker / Cropper Container */}
          <div className="relative aspect-square w-full rounded-2xl border-2 border-dashed border-border bg-card shadow-inner overflow-hidden">
            {!imageSrc ? (
              <div
                className="flex h-full flex-col items-center justify-center cursor-pointer text-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="ember-glow mb-4 flex h-20 w-20 items-center justify-center rounded-full">
                  <Crop size={32} className="text-muted-foreground" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Click to upload your cigar moment</h4>
                <p className="mt-1 max-w-[260px] text-xs text-muted-foreground">
                  Perfectly square 1:1 format. Light one up!
                </p>
              </div>
            ) : (
              // Cropper is active
              <>
                <div className="absolute inset-0 z-0">
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
                </div>
                {/* Zoom Control Overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex w-40 items-center gap-3 rounded-full bg-background/80 px-4 py-2 backdrop-blur-sm shadow-md">
                    <ZoomIn size={14} className="text-muted-foreground shrink-0" />
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer accent-accent"
                    />
                </div>
                {/* Change Image Button */}
                <button
                    type="button"
                    onClick={() => {
                        setImageSrc(null);
                        setZoom(1);
                    }}
                    className="absolute top-4 right-4 z-10 rounded-full bg-accent/20 px-4 py-2 text-xs font-bold text-accent transition-colors hover:bg-accent/30 backdrop-blur-sm"
                >
                    Change
                </button>
              </>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Caption Input */}
          <div className="space-y-1.5">
            <label htmlFor="caption" className="text-sm font-medium text-foreground">
              Caption
            </label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What are you smoking? Tell the community..."
              className="h-28 w-full resize-none rounded-xl border border-border bg-background p-4 text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-accent/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 bg-muted/20 px-5 py-4 shrink-0 mt-auto pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <button
            type="submit"
            disabled={isSubmitting || !imageSrc || !caption.trim()}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-accent py-3.5 font-semibold text-accent-foreground shadow-[0_6px_24px_-4px_hsl(28_64%_56%/0.6)] transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {isSubmitting ? "Sharing moment..." : "Share Cigar Moment"}
          </button>
        </div>
      </form>
    </div>
  );
}