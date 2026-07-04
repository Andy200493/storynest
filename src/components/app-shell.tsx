import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Home, Search, Plus, LogOut, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) {
        setEmail(u.email ?? "");
        setDisplayName(
          (u.user_metadata?.display_name as string) ?? u.email?.split("@")[0] ?? "Writer",
        );
      }
    });
  }, []);

  const { data: novels = [] } = useQuery({
    queryKey: ["novels", "sidebar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("novels")
        .select("id, title, is_favorite, updated_at")
        .order("updated_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function createNovel() {
    const { data, error } = await supabase
      .from("novels")
      .insert({
        user_id: (await supabase.auth.getUser()).data.user!.id,
        title: "Untitled Novel",
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["novels"] });
    navigate({ to: "/novel/$novelId", params: { novelId: data.id } });
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground selection:bg-accent/30 selection:text-accent">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border">
        <div className="flex items-center gap-3 p-6">
          <div className="size-6 shrink-0 rotate-45 rounded-sm bg-accent" />
          <span className="text-lg font-medium tracking-tight">StoryNest</span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Workspace
          </div>
          <Link
            to="/dashboard"
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
              pathname === "/dashboard"
                ? "bg-surface text-foreground ring-1 ring-white/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Home className="size-4" />
            Dashboard
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Search className="size-4" />
            Quick Search
            <span className="ml-auto rounded bg-border px-1.5 py-0.5 text-[10px]">⌘K</span>
          </button>
          <button
            type="button"
            onClick={createNovel}
            className="mt-4 flex w-full items-center gap-2 rounded-md bg-accent/10 py-2 pr-3 pl-2 text-sm text-accent ring-1 ring-accent/20 transition-colors hover:bg-accent/15"
          >
            <Plus className="size-4" />
            New Novel
          </button>

          <div className="mt-8">
            <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Library
            </div>
            {novels.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground/70">
                Your novels appear here.
              </p>
            )}
            {novels.map((n) => {
              const active = pathname === `/novel/${n.id}`;
              return (
                <Link
                  key={n.id}
                  to="/novel/$novelId"
                  params={{ novelId: n.id }}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-surface text-foreground ring-1 ring-white/5"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BookOpen className="size-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{n.title}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-xs font-medium ring-1 ring-white/10">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
