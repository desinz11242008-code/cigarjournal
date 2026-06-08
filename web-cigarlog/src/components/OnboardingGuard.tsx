import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function checkProfile() {
      // If they aren't logged in, or are already on the settings page, do nothing
      if (!user || location.pathname === "/settings") return;

      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      // If their name is empty or missing, redirect them to the settings page to onboard
      if (!data?.name || data.name.trim() === "") {
        navigate("/settings", { 
          state: { message: "Welcome! Please set a username and profile picture to continue." } 
        });
      }
    }

    checkProfile();
  }, [user, location.pathname, navigate]);

  return <>{children}</>;
}