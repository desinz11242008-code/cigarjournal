import { Loader2, X, Crop, ZoomIn, Send, Image as ImageIcon } from "lucide-react";
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

  const [caption, setCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        // CRITICAL FIX: Reset file input so you can pick the same file again if needed
        if (fileInputRef.current) fileInputRef.current.value = "";
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleClose = () => {
    setImageSrc(null);
    setCaption("");
    setZoom(1);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageSrc || !caption.trim()) return;

    try {
      setIsSubmitting(true);
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const filename = `${user?.id}-${uuidv4()}.jpg`;
      
      await supabase.storage.from("posts").upload(filename, croppedImageBlob!, { contentType: "image/jpeg" });
      const { data } = supabase.storage.from("posts").getPublicUrl(filename);

      await supabase.from("social_posts").insert({
        user_id: user?.id,
        image_url: data.publicUrl,
        caption: caption.trim(),
      });

      toast.success("Shared!");
      handleClose();
      onPostSuccess();
    } catch (err) {
      toast.error("Failed to post");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" onClick={handleClose}>
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold">Create Post</h3>
          <button onClick={handleClose}><X size={18}/></button>
        </div>

        {/* Content - Compact Layout */}
        <div className="p-4 flex flex-col gap-4">
          <div className="relative aspect-square w-full h-64 rounded-xl border-2 border-dashed border-border overflow-hidden bg-muted/50">
            {!imageSrc ? (
              <button onClick={() => fileInputRef.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-2">
                <ImageIcon className="text-muted-foreground" />
                <span className="text-xs font-medium">Upload Image</span>
              </button>
            ) : (
              <div className="relative w-full h-full">
                <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
                <button onClick={() => setImageSrc(null)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full text-xs">Change</button>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          </div>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            className="w-full h-24 p-3 rounded-xl bg-background border border-border resize-none text-sm outline-none focus:border-accent"
          />
        </div>

        {/* Action */}
        <div className="p-4 border-t border-border">
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !imageSrc}
            className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={16}/>}
            {isSubmitting ? "Posting..." : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}