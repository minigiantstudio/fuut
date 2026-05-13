import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin, getAdminToken } from "./adminClient";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If a valid token already exists, skip the form.
  useEffect(() => {
    if (getAdminToken()) navigate("/admin", { replace: true });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await adminLogin(email.trim(), password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[400px] flex flex-col items-center justify-center px-6 py-12">
        <div className="space-y-6 w-full">
          <div className="space-y-2 text-center">
            <p className="text-2xl">🔧</p>
            <h1 className="text-foreground text-sm uppercase tracking-widest">Admin Login</h1>
            <p className="text-muted-foreground text-[7px] uppercase tracking-wider">
              Restricted access · score override panel
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[6px] text-muted-foreground uppercase tracking-widest">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@fuut.local"
                autoComplete="username"
                required
                className="w-full h-12 pixel-inset bg-card px-4 text-[8px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[6px] text-muted-foreground uppercase tracking-widest">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full h-12 pixel-inset bg-card px-4 text-[8px] text-foreground focus:outline-none"
              />
            </div>

            {error && (
              <p className="text-[7px] text-pixel-red text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full h-12 pixel-border bg-foreground text-primary-foreground text-[8px] uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full h-10 text-[7px] text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            ← Back to App
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
