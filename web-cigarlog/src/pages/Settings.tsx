import { Camera, LogOut, Mail, User as UserIcon, Save, Loader2, X, Check } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Cropper from "react-easy-crop";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// --- Canvas Helper: Snips the image based on the user's crop coordinates ---
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((file) => {
      resolve(file);
    }, "image/jpeg", 0.9);
  });
}
// --------------------------------------------------------------------------

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Active Input States
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Snapshots of the original DB values to track "dirty" un-saved state
  const [initialUsername, setInitialUsername] = useState("");
  const [initialAvatarUrl, setInitialAvatarUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cropper State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);

  // Derived state to check if any edits have been made
  const hasChanges = username.trim() !== initialUsername || avatarUrl !== initialAvatarUrl;

  // Redirect if not logged in
  useEffect(() => {
    if (user === null) {
      navigate("/");
    }
  }, [user, navigate]);

  // Fetch current profile data
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("name, avatar_url")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        if (data) {
          const loadedName = data.name || "";
          const loadedAvatar = data.avatar_url || null;
          
          setUsername(loadedName);
          setAvatarUrl(loadedAvatar);
          
          // Lock in the snapshots
          setInitialUsername(loadedName);
          setInitialAvatarUrl(loadedAvatar);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  // 1. User selects a file -> Load it into the cropper
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setSelectedImage(reader.result?.toString() || null);
      });
      reader.readAsDataURL(file);
    }
    // Reset the input so they can select the same file again if they cancel
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 2. User confirms crop -> Process image and upload to Supabase
  const handleCropAndUpload = async () => {
    if (!selectedImage || !croppedAreaPixels || !user) return;

    try {
      setIsCropping(true);
      
      // Snip the image using our canvas helper
      const croppedBlob = await getCroppedImg(selectedImage, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Failed to crop image.");

      const filePath = `${user.id}-${Math.random()}.jpg`;

      // Upload the cropped blob to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedBlob, { contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      // Get the public URL for the new image
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      setSelectedImage(null); // Close the cropper modal
      toast.success("Profile picture ready to save!");
    } catch (error: any) {
      toast.error(error.message || "Error uploading image");
    } finally {
      setIsCropping(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !hasChanges) return;
    if (username.trim().length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    try {
      setSaving(true);
      const cleanUsername = username.trim();
      
      const { error } = await supabase
        .from("profiles")
        .update({
          name: cleanUsername,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      
      // Update our snapshot so the button disables again
      setInitialUsername(cleanUsername);
      setInitialAvatarUrl(avatarUrl);
      
      toast.success("Profile saved successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background pb-24">
      {/* Cropper Modal Overlay */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md">
          <div className="relative flex-1">
            <Cropper
              image={selectedImage}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div className="flex items-center justify-between border-t border-border bg-card p-6 pb-safe">
            <button
              onClick={() => setSelectedImage(null)}
              disabled={isCropping}
              className="flex items-center gap-2 rounded-full px-6 py-3 font-medium text-muted-foreground transition-colors hover:bg-muted active:scale-95 disabled:opacity-50"
            >
              <X size={18} /> Cancel
            </button>
            <button
              onClick={handleCropAndUpload}
              disabled={isCropping}
              className="flex items-center gap-2 rounded-full bg-accent px-8 py-3 font-semibold text-accent-foreground shadow-lg transition-transform active:scale-95 disabled:opacity-50"
            >
              {isCropping ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {isCropping ? "Processing..." : "Use Image"}
            </button>
          </div>
        </div>
      )}

      <div className="ember-glow pointer-events-none absolute inset-x-0 top-0 h-64" />

      <div className="relative mx-auto w-full max-w-lg px-4 pt-[calc(2rem+env(safe-area-inset-top,16px))]">
        <header className="mb-8">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">Manage your identity and preferences</p>
        </header>

        {/* Profile Card */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 flex flex-col items-center">
            <div className="relative mb-4 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-24 w-24 rounded-full object-cover border-4 border-background shadow-lg transition-transform group-active:scale-95"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted border-4 border-background shadow-lg transition-transform group-active:scale-95">
                  <UserIcon size={40} className="text-muted-foreground" />
                </div>
              )}
              <div className="absolute bottom-0 right-0 rounded-full bg-accent p-2 shadow-md">
                <Camera size={14} className="text-accent-foreground" />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={onFileChange}
              />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{username || "New User"}</h2>
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent mt-2">
              Community Member
            </span>
          </div>

          <div className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Display Name
              </label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm text-foreground outline-none transition-colors focus:border-accent"
                  placeholder="Choose a username..."
                />
              </div>
            </div>

            {/* Email Display (Read Only for OAuth) */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Google Account Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="h-12 w-full rounded-xl border border-border bg-muted/50 pl-10 pr-4 text-sm text-muted-foreground outline-none opacity-70"
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Linked via Google Secure Sign-In.
              </p>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving || !hasChanges}
              className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold transition-all ${
                hasChanges 
                  ? "bg-accent text-accent-foreground active:scale-[0.98] shadow-md shadow-accent/20" 
                  : "bg-muted/80 text-muted-foreground opacity-60 cursor-not-allowed"
              }`}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-2xl border border-border bg-card p-2">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-between rounded-xl p-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 active:scale-[0.99]"
          >
            <span className="flex items-center gap-3">
              <LogOut size={18} />
              Sign out securely
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;