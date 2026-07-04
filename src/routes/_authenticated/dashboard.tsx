import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { motion } from "framer-motion";
import { Star, Plus, MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Novel = {
  id: string;
  title: string;
  subtitle: string | null;
  genre: string | null;
  status: string;
  cover_color: string;
  is_favorite: boolean;
  updated_at: string;
};

const COLORS: Record<string, string> = {
  teal: "bg-teal-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Dashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "recent" | "favorites">("recent");

  const { data: novels = [], isLoading } = useQuery({
    queryKey: ["novels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("novels")
        .select("id, title, subtitle, genre, status, cover_color, is_favorite, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Novel[];
    },
  });

  const { data: counts = {} } = useQuery({
    queryKey: ["chapter-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chapters").select("novel_id, word_count");
      if (error) throw error;
      const map: Record<string, { chapters: number; words: number }> = {};
      for (const row of data) {
        const rec = map[row.novel_id] ?? { chapters: 0, words: 0 };
        rec.chapters += 1;
        rec.words += row.word_count ?? 0;
        map[row.novel_id] = rec;
      }
      return map;
    },
  });

  const filtered = useMemo(() => {
    if (filter === "favorites") return novels.filter((n) => n.is_favorite);
    return novels;
  }, [novels, filter]);

  async function createNovel() {
    const user = (await supabase.auth.getUser()).data.user!;
    const { data, error } = await supabase
      .from("novels")
      .insert({ user_id: user.id, title: "Untitled Novel" })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["novels"] });
    navigate({ to: "/novel/$novelId", params: { novelId: data.id } });
  }

  async function toggleFavorite(n: Novel) {
    const { error } = await supabase
      .from("novels")
      .update({ is_favorite: !n.is_favorite })
      .eq("id", n.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["novels"] });
  }

  async function deleteNovel(n: Novel) {
    if (!confirm(`Delete "${n.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("novels").delete().eq("id", n.id);
    if (error) return toast.error(error.message);
    toast.success("Novel deleted");
    qc.invalidateQueries({ queryKey: ["novels"] });
  }

  async function renameNovel(n: Novel) {
    const title = prompt("Rename novel", n.title);
    if (!title || title === n.title) return;
    const { error } = await supabase.from("novels").update({ title }).eq("id", n.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["novels"] });
  }

  return (
    <AppShell>
      <header className="z-10 flex h-16 items-center justify-between border-b border-border bg-background/80 px-8 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium">My Novels</h2>
          <div className="h-4 w-px bg-border" />
          <div className="flex gap-2">
            {(["all", "recent", "favorites"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 text-xs capitalize transition-colors ${
                  filter === f
                    ? "border-b border-accent font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={createNovel}
          className="flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" /> New Novel
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-xl bg-surface ring-1 ring-white/5"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onCreate={createNovel} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
          >
            {filtered.map((n) => {
              const stats = counts[n.id] ?? { chapters: 0, words: 0 };
              return (
                <motion.div
                  key={n.id}
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="group flex flex-col overflow-hidden rounded-xl bg-surface ring-1 ring-white/5 transition-colors hover:ring-white/10"
                >
                  <button
                    onClick={() =>
                      navigate({ to: "/novel/$novelId", params: { novelId: n.id } })
                    }
                    className="aspect-[2/1] w-full bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 outline-1 -outline-offset-1 outline-white/5"
                    style={{
                      backgroundImage: `radial-gradient(circle at 20% 20%, color-mix(in oklab, var(--color-accent) 20%, transparent), transparent 60%)`,
                    }}
                  />
                  <div className="p-5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <button
                        onClick={() =>
                          navigate({ to: "/novel/$novelId", params: { novelId: n.id } })
                        }
                        className="text-left font-serif text-xl leading-tight text-balance hover:text-accent"
                      >
                        {n.title}
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleFavorite(n)}
                          className={`rounded p-1 transition-colors ${
                            n.is_favorite
                              ? "text-amber-400"
                              : "text-muted-foreground/50 hover:text-foreground"
                          }`}
                        >
                          <Star
                            className="size-4"
                            fill={n.is_favorite ? "currentColor" : "none"}
                          />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded p-1 text-muted-foreground/60 transition-colors hover:text-foreground">
                              <MoreHorizontal className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => renameNovel(n)}>
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteNovel(n)}
                              className="text-destructive focus:text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="mb-6 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{n.genre ?? "Untitled genre"}</span>
                      <span className="size-1 rounded-full bg-border" />
                      <span>{stats.words.toLocaleString()} words</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground/70">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded bg-background px-2 py-1 ring-1 ring-white/5 ${
                            COLORS[n.cover_color] ? "" : ""
                          }`}
                        >
                          <span
                            className={`mr-1.5 inline-block size-1.5 rounded-full align-middle ${
                              COLORS[n.cover_color] ?? "bg-teal-500"
                            }`}
                          />
                          {n.status}
                        </span>
                        <span>{stats.chapters} Chapters</span>
                      </div>
                      <span>{timeAgo(n.updated_at)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mx-auto mt-20 max-w-md rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center">
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-accent/10 text-accent">
        <Plus className="size-5" />
      </div>
      <h3 className="font-serif text-2xl">Begin your first novel</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        A quiet page, a blinking cursor, and an assistant ready when you are.
      </p>
      <button
        onClick={onCreate}
        className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
      >
        Create a novel
      </button>
    </div>
  );
}
