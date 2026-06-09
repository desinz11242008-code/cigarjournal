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
      <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h3 className="font-bold text-lg">{stage === "upload" ? "Select & Crop" : "New Post"}</h3>
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-muted transition-colors"><X size={18}/></button>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto">
          {stage === "upload" ? (
            /* STAGE 1: Standard Cropper Container */
            <div className="p-5 flex flex-col items-center">
              <div className={`relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-black ${!imageSrc ? 'border-dashed bg-muted/30 flex items-center justify-center' : ''}`}>
                {!imageSrc ? (
                  <button onClick={() => fileInputRef.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-3 p-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background shadow-sm border border-border">
                      <ImageIcon className="text-muted-foreground" size={24} />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">Click to upload image</span>
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
                    <button onClick={() => setImageSrc(null)} className="absolute top-3 right-3 z-10 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs font-bold border border-white/10 transition-transform active:scale-95">
                      Change
                    </button>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              </div>
            </div>
          ) : (
            /* STAGE 2: Full Width Square Preview Flow */
            <div className="space-y-0 flex-1">
              {/* Changed aspect ratio to full aspect-square so the entire image is perfectly visible */}
              <div className="relative aspect-square w-full shrink-0 overflow-hidden border-b border-border bg-black group shadow-md">
                <img src={croppedImage!} alt="Ready to post" className="h-full w-full object-cover" />
                <button 
                  onClick={() => setStage("upload")}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]"
                >
                  <ImageIcon size={22} className="shrink-0"/>
                  <span className="text-sm font-semibold">Change Image</span>
                </button>
              </div>

              {/* Caption Textarea below the square banner */}
              <div className="p-5 flex-1 flex flex-col">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="What are you smoking? Add a caption..."
                  className="w-full h-28 p-4 rounded-2xl bg-background border border-border resize-none text-[15px] outline-none transition focus:border-accent shadow-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-border bg-card/50">
          {stage === "upload" ? (
            <button 
              onClick={confirmImage}
              disabled={!imageSrc}
              className="w-full py-3.5 rounded-xl bg-accent text-accent-foreground font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              <Check strokeWidth={2.5} size={16}/> Confirm Selection
            </button>
          ) : (
            <div className="flex gap-3">
                <button onClick={() => setStage("upload")} className="w-1/3 py-3.5 rounded-xl bg-muted text-foreground font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
                    <ArrowLeft strokeWidth={2.5} size={16}/> Back
                </button>
                <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || !caption.trim()}
                    className="w-2/3 py-3.5 rounded-xl bg-accent text-accent-foreground font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 shadow-sm"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send strokeWidth={2.5} size={16}/>}
                    {isSubmitting ? "Posting..." : "Share Post"}
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}