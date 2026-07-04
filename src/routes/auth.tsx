import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">(initialMode ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split("@")[0] },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        toast.success("Welcome to StoryNest.");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background text-foreground md:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-surface p-10 md:flex">
        <Link to="/" className="flex items-center gap-3">
          <div className="size-6 rotate-45 rounded-sm bg-accent" />
          <span className="text-lg font-medium tracking-tight">StoryNest</span>
        </Link>
        <div className="max-w-md">
          <p className="font-serif text-3xl leading-snug text-balance">
            "The rain didn't fall so much as it occupied the space between the earth
            and the heavy sky."
          </p>
          <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
            — from a novel in progress
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          A quiet workspace for your next novel.
        </div>
      </aside>

      <main className="flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm"
        >
          <h1 className="font-serif text-3xl">
            {mode === "signup" ? "Begin your story" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Create an account to open your writing workspace."
              : "Sign in to continue where you left off."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                  placeholder="Elias Thorne"
                />
              </div>
            )}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                placeholder="At least 6 characters"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-accent py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "login" : "signup")}
              className="text-accent underline underline-offset-4"
            >
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
