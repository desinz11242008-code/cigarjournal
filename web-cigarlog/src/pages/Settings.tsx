import { Camera, LogOut, Mail, User as UserIcon, Save, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          setUsername(data.name || "");
          setAvatarUrl(data.avatar_url || null);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}-${Math.random()}.${fileExt}`;

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL for the image
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success("Profile picture updated!");
    } catch (error: any) {
      toast.error(error.message || "Error uploading image");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (username.trim().length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          name: username.trim(),
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
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
                {uploading ? <Loader2 size={14} className="animate-spin text-accent-foreground" /> : <Camera size={14} className="text-accent-foreground" />}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
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
              disabled={saving}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-semibold text-accent-foreground transition-all active:scale-[0.98] disabled:opacity-50"
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