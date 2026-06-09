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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-0 sm:p-4 backdrop-blur-sm" onClick={handleClose}>
      <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl border-0 sm:border border-border bg-card shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h3 className="font-bold text-lg">{stage === "upload" ? "Select New Image" : "Edit Post"}</h3>
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-muted transition-colors"><X size={20}/></button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {stage === "upload" ? (
            /* STAGE 1: Upload & Crop */
            <div className={`relative aspect-square w-full overflow-hidden ${!imageSrc ? 'm-5 w-[calc(100%-2.5rem)] rounded-2xl border-2 border-dashed border-border bg-muted/50' : 'bg-black'}`}>
              {!imageSrc ? (
                <button onClick={() => fileInputRef.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background shadow-sm border border-border">
                    <ImageIcon className="text-muted-foreground" size={28} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Click to upload new image</span>
                </button>
              ) : (
                <div className="relative w-full h-full">
                  <Cropper 
                    image={imageSrc} 
                    crop={crop} 
                    zoom={zoom} 
                    aspect={1} 
                    onCropChange={setCrop} 
                    onCropComplete={onCropComplete} 
                    onZoomChange={setZoom} 
                  />
                  <button onClick={() => setImageSrc(null)} className="absolute top-4 right-4 z-10 bg-black/60 text-white px-4 py-2 rounded-full text-xs font-bold backdrop-blur-md border border-white/20 shadow-lg transition-transform active:scale-95">
                    Change
                  </button>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
          ) : (
            /* STAGE 2: Caption & Image Preview */
            <div className="p-5 flex flex-col items-center gap-5">
              {/* Confirmed Square Image Preview on Top - Now Larger */}
              <div className="relative aspect-square w-56 sm:w-64 shrink-0 overflow-hidden rounded-xl border border-border bg-black shadow-md group">
                {croppedImage && <img src={croppedImage} alt="Post" className="h-full w-full object-cover" />}
                <button 
                  onClick={() => setStage("upload")}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 text-white font-medium text-sm backdrop-blur-sm"
                >
                  Change Image
                </button>
              </div>
              
              {/* Caption Textarea Below */}
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="w-full h-32 sm:h-40 p-4 rounded-xl bg-background border border-border resize-none text-[15px] outline-none transition-colors focus:border-accent shadow-sm"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-border shrink-0 bg-card">
          {stage === "upload" ? (
            <div className="flex gap-3">
              <button onClick={() => { setStage("caption"); setImageSrc(null); }} className="w-1/3 py-4 rounded-xl bg-muted text-foreground font-bold text-[15px] flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
                  <ArrowLeft strokeWidth={2.5} size={18}/> Cancel
              </button>
              <button 
                onClick={confirmImage}
                disabled={!imageSrc}
                className="w-2/3 py-4 rounded-xl bg-accent text-accent-foreground font-bold text-[15px] flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 shadow-md"
              >
                <Check strokeWidth={2.5} size={18}/> Confirm Image
              </button>
            </div>
          ) : (
            <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !caption.trim()}
                className="w-full py-4 rounded-xl bg-accent text-accent-foreground font-bold text-[15px] flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 shadow-md"
            >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Check strokeWidth={2.5} size={18}/>}
                {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}