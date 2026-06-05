import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Account created successfully! You can now log in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/journal"); // Redirect to journal upon successful login
      }
    } catch (error: any) {
      setErrorMsg(error.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1A1A1D] px-4 text-white font-sans">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-[#242428] p-8 shadow-xl border border-zinc-800">
        
        {/* Dynamic Header Section */}
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-amber-500">
            Cigar Journal
          </h2>
          <div className="text-xl font-semibold text-zinc-200 tracking-wide">
            {isSignUp ? "Sign Up" : "Sign In"}
          </div>
          <p className="pt-1 text-xs text-zinc-400">
            {isSignUp ? "Create an account to start your logs" : "Sign in to access your humidor"}
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleAuth}>
          {errorMsg && (
            <div className="rounded bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              required
              className="mt-1 w-full rounded-lg bg-[#1A1A1D] border border-zinc-700 p-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="smoker@lounge.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              className="mt-1 w-full rounded-lg bg-[#1A1A1D] border border-zinc-700 p-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-600 p-3 font-semibold text-white hover:bg-amber-500 transition-colors disabled:opacity-50"
          >
            {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <div className="text-center text-sm">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-amber-500 hover:underline bg-transparent border-none cursor-pointer"
          >
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}