import { Loader2, X, Send, Image as ImageIcon, Check, ArrowLeft } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import Cropper from "react-easy-crop";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { supabase } from "@/integrations/supabase/client";
import { getCroppedImg } from "@/utils/cropUtils";

export function EditPostModal({
  isOpen,
  onClose,
  post,
  onPostSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  post: any;
  onPostSuccess: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<"upload" | "caption">("caption");
  const [caption, setCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Initialize data when the modal opens with a specific post
  useEffect(() => {
    if (isOpen && post) {
      setCaption(post.caption || "");
      setCroppedImage(post.image_url);
      setStage("caption");
      setImageSrc(null); // Reset new image picker
    }
  }, [isOpen, post]);

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
    setStage("caption");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;

    try {
      setIsSubmitting(true);
      
      let finalImageUrl = post.image_url;

      // If the user picked and cropped a NEW image
      if (imageSrc && croppedImage && croppedImage !== post.image_url) {
        const response = await fetch(croppedImage);
        const blob = await response.blob();
        const filename = `${post.user_id}-${uuidv4()}.jpg`;
        
        await supabase.storage.from("posts").upload(filename, blob, { contentType: "image/jpeg" });
        const { data } = supabase.storage.from("posts").getPublicUrl(filename);
        finalImageUrl = data.publicUrl;
      }

      const { error } = await supabase.from("social_posts").update({
        caption: caption.trim(),
        image_url: finalImageUrl,
      }).eq("id", post.id);

      if (error) throw error;

      toast.success("Post updated!");
      handleClose();
      onPostSuccess();
    } catch (err) {
      toast.error("Failed to update post");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !post) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" onClick={handleClose}>
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-lg">{stage === "upload" ? "Select New Image" : "Edit Post"}</h3>
          <button onClick={handleClose}><X size={18}/></button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {stage === "upload" ? (
            <div className="relative aspect-square w-full max-h-[320px] mx-auto rounded-xl border-2 border-dashed border-border overflow-hidden bg-muted/50">
              {!imageSrc ? (
                <button onClick={() => fileInputRef.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-2">
                  <ImageIcon className="text-muted-foreground" />
                  <span className="text-xs font-medium">Upload New Image</span>
                </button>
              ) : (
                <div className="relative w-full h-full">
                  <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
                  <button onClick={() => setImageSrc(null)} className="absolute top-2 right-2 bg-black/50 text-white px-3 py-1.5 rounded-full text-xs font-medium">Change</button>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative aspect-square w-48 shrink-0 overflow-hidden rounded-xl border border-border bg-muted shadow-sm group">
                {croppedImage && <img src={croppedImage} alt="Post" className="h-full w-full object-cover" />}
                <button 
                  onClick={() => setStage("upload")}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 text-white font-medium text-sm"
                >
                  Change Image
                </button>
              </div>
              
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="w-full h-32 p-4 rounded-xl bg-background border border-border resize-none text-sm outline-none focus:border-accent"
              />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border">
          {stage === "upload" ? (
            <div className="flex gap-3">
              <button onClick={() => { setStage("caption"); setImageSrc(null); }} className="w-1/3 py-4 rounded-xl bg-muted font-bold text-sm flex items-center justify-center gap-2">
                  <ArrowLeft size={18}/> Cancel
              </button>
              <button 
                onClick={confirmImage}
                disabled={!imageSrc}
                className="w-2/3 py-4 rounded-xl bg-accent text-accent-foreground font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Check size={18}/> Confirm Image
              </button>
            </div>
          ) : (
            <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !caption.trim()}
                className="w-full py-4 rounded-xl bg-accent text-accent-foreground font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Check size={18}/>}
                {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}