import { Loader2, X, Send, Image as ImageIcon, Check, ArrowLeft } from "lucide-react";
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

  const [stage, setStage] = useState<"upload" | "caption">("upload");
  const [caption, setCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        if (fileInputRef.current) fileInputRef.current.value = "";
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const confirmImage = async () => {
    const croppedBlob = await getCroppedImg(imageSrc!, croppedAreaPixels);
    const croppedUrl = URL.createObjectURL(croppedBlob!);
    setCroppedImage(croppedUrl);
    setStage("caption");
  };

  const handleClose = () => {
    setImageSrc(null);
    setCroppedImage(null);
    setCaption("");
    setZoom(1);
    setStage("upload");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!croppedImage || !caption.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      const filename = `${user?.id}-${uuidv4()}.jpg`;
      
      await supabase.storage.from("posts").upload(filename, blob, { contentType: "image/jpeg" });
      const { data } = supabase.storage.from("posts").getPublicUrl(filename);

      await supabase.from("social_posts").insert({
        user_id: user?.id,
        image_url: data.publicUrl,
        caption: caption.trim(),
      });

      toast.success("Shared successfully!");
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
          <h3 className="font-bold text-lg">{stage === "upload" ? "Select & Crop" : "New Post"}</h3>
          <button onClick={handleClose}><X size={18}/></button>
        </div>

        {/* Content Area */}
        <div className="p-4 flex flex-col gap-4">
          {stage === "upload" ? (
            /* STAGE 1: Upload & Crop */
            <div className="relative aspect-square w-full max-h-[320px] mx-auto rounded-xl border-2 border-dashed border-border overflow-hidden bg-muted/50">
              {!imageSrc ? (
                <button onClick={() => fileInputRef.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-2">
                  <ImageIcon className="text-muted-foreground" />
                  <span className="text-xs font-medium">Upload Image</span>
                </button>
              ) : (
                <div className="relative w-full h-full">
                  <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
                  <button onClick={() => setImageSrc(null)} className="absolute top-2 right-2 bg-black/50 text-white px-3 py-1.5 rounded-full text-xs font-medium">Change Image</button>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
          ) : (
            /* STAGE 2: Caption & Confirm */
            <div className="flex flex-col items-center gap-4">
              {/* Confirmed Square Image Preview on Top */}
              <div className="aspect-square w-48 shrink-0 overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
                <img src={croppedImage!} alt="Ready to post" className="h-full w-full object-cover" />
              </div>
              
              {/* Caption Textarea Below */}
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="w-full h-32 p-4 rounded-xl bg-background border border-border resize-none text-sm outline-none focus:border-accent"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-border">
          {stage === "upload" ? (
            <button 
              onClick={confirmImage}
              disabled={!imageSrc}
              className="w-full py-4 rounded-xl bg-accent text-accent-foreground font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Check size={18}/> Confirm Selection
            </button>
          ) : (
            <div className="flex gap-3">
                <button onClick={() => setStage("upload")} className="w-1/3 py-4 rounded-xl bg-muted font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                    <ArrowLeft size={18}/> Back
                </button>
                <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || !caption.trim()}
                    className="w-2/3 py-4 rounded-xl bg-accent text-accent-foreground font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={18}/>}
                    {isSubmitting ? "Posting..." : "Share to Social"}
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}