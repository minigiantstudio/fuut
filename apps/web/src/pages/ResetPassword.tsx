import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Supabase fires PASSWORD_RECOVERY after it parses the #access_token hash.
  // We must wait for that event before allowing the password update — the session
  // isn't active until onAuthStateChange confirms it.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check if we already have a valid session (page refreshed after recovery link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    // Success — sign them in and go home
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[430px] flex flex-col items-center justify-center px-6 py-12 space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-2xl">🔑</p>
          <h1 className="text-[12px] text-foreground">Set new password</h1>
          <p className="text-[7px] text-muted-foreground">Choose a new password for your account.</p>
        </div>

        {!ready ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="w-full space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full h-12 pixel-inset bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
              autoFocus
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Confirm password"
              className="w-full h-12 pixel-inset bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
            />
            {error && <p className="text-[6px] text-pixel-red text-center">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading || !password || !confirm}
              className="w-full h-12 pixel-border bg-foreground text-primary-foreground text-[8px] uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              {loading ? "Saving..." : "Save password"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
