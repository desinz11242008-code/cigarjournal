import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/** Detect whether this page is running inside a popup window. */
function isPopup(): boolean {
  try {
    return window.opener !== null && window.opener !== window;
  } catch {
    return false;
  }
}

export default function AuthCallback() {
  const { exchangeCode } = useAuth();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    // If we're inside the auth popup, send the result back to the main window.
    // The popup's localStorage doesn't have the PKCE verifier, so we can't
    // exchange the code here — the main window must do it.
    if (isPopup()) {
      window.opener!.postMessage(
        { type: "rork_auth_callback", code, error },
        window.location.origin,
      );
      window.close();
      return;
    }

    // Top-level redirect flow — exchange the code directly.
    if (!code) {
      navigate("/", { replace: true });
      return;
    }
    void exchangeCode(code)
      .catch((err) => console.error("Code exchange failed:", err))
      .finally(() => navigate("/", { replace: true }));
  }, [exchangeCode, navigate]);

  return (
    <div className="flex h-full items-center justify-center bg-background">
      <p className="text-muted-foreground">
        {isPopup() ? "Completing sign in…" : "Signing in…"}
      </p>
    </div>
  );
}
