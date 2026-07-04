import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import {
  EditorSurface,
  useNovelEditor,
  type TiptapContent,
} from "@/components/editor/tiptap-editor";
import { AiPanel } from "@/components/editor/ai-panel";
import { Plus, Trash2, Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Quote, List, ListOrdered, Highlighter, Undo2, Redo2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/novel/$novelId")({
  component: NovelEditorPage,
});

type Chapter = {
  id: string;
  title: string;
  content: TiptapContent;
  position: number;
  word_count: number;
};

type Novel = {
  id: string;
  title: string;
  subtitle: string | null;
  genre: string | null;
  status: string;
};

function wordCount(text: string) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

function NovelEditorPage() {
  const { novelId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: novel } = useQuery({
    queryKey: ["novel", novelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("novels")
        .select("id, title, subtitle, genre, status")
        .eq("id", novelId)
        .single();
      if (error) throw error;
      return data as Novel;
    },
  });

  const { data: chapters = [] } = useQuery({
    queryKey: ["chapters", novelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapters")
        .select("id, title, content, position, word_count")
        .eq("novel_id", novelId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as Chapter[];
    },
  });

  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId && chapters.length > 0) setActiveId(chapters[0].id);
    if (activeId && !chapters.find((c) => c.id === activeId) && chapters.length > 0) {
      setActiveId(chapters[0].id);
    }
  }, [chapters, activeId]);

  const active = useMemo(
    () => chapters.find((c) => c.id === activeId) ?? null,
    [chapters, activeId],
  );

  async function createChapter() {
    const user = (await supabase.auth.getUser()).data.user!;
    const nextPos = (chapters[chapters.length - 1]?.position ?? -1) + 1;
    const { data, error } = await supabase
      .from("chapters")
      .insert({
        novel_id: novelId,
        user_id: user.id,
        title: `Chapter ${chapters.length + 1}`,
        position: nextPos,
        content: null,
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["chapters", novelId] });
    qc.invalidateQueries({ queryKey: ["chapter-counts"] });
    setActiveId(data.id);
  }

  async function deleteChapter(id: string) {
    if (!confirm("Delete this chapter?")) return;
    const { error } = await supabase.from("chapters").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["chapters", novelId] });
    qc.invalidateQueries({ queryKey: ["chapter-counts"] });
  }

  async function renameChapter(c: Chapter) {
    const title = prompt("Rename chapter", c.title);
    if (!title || title === c.title) return;
    const { error } = await supabase.from("chapters").update({ title }).eq("id", c.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["chapters", novelId] });
  }

  async function renameNovel() {
    if (!novel) return;
    const title = prompt("Rename novel", novel.title);
    if (!title || title === novel.title) return;
    const { error } = await supabase.from("novels").update({ title }).eq("id", novelId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["novel", novelId] });
    qc.invalidateQueries({ queryKey: ["novels"] });
  }

  return (
    <AppShell>
      <div className="flex h-screen w-full overflow-hidden">
        {/* Chapters */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-4">
            <button onClick={renameNovel} className="min-w-0 flex-1 text-left">
              <div className="truncate font-serif text-lg">{novel?.title ?? "…"}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Manuscript
              </div>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {chapters.length === 0 && (
              <p className="p-4 text-xs text-muted-foreground">No chapters yet.</p>
            )}
            {chapters.map((c) => {
              const active = c.id === activeId;
              return (
                <div
                  key={c.id}
                  className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-accent/10 text-foreground ring-1 ring-accent/20"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground"
                  }`}
                >
                  <button
                    onClick={() => setActiveId(c.id)}
                    onDoubleClick={() => renameChapter(c)}
                    className="min-w-0 flex-1 truncate text-left"
                    title="Double-click to rename"
                  >
                    {c.title}
                  </button>
                  <button
                    onClick={() => deleteChapter(c.id)}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="border-t border-border p-3">
            <button
              onClick={createChapter}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-surface py-2 text-xs ring-1 ring-white/5 hover:bg-surface-2"
            >
              <Plus className="size-3.5" /> New Chapter
            </button>
          </div>
        </aside>

        {/* Main */}
        <section className="flex flex-1 flex-col overflow-hidden bg-background">
          {active ? (
            <ChapterEditor
              key={active.id}
              chapter={active}
              novelTitle={novel?.title}
              novelId={novelId}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  No chapter selected. Create one to begin.
                </p>
                <button
                  onClick={createChapter}
                  className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
                >
                  Create first chapter
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function ChapterEditor({
  chapter,
  novelTitle,
  novelId,
}: {
  chapter: Chapter;
  novelTitle?: string;
  novelId: string;
}) {
  const qc = useQueryClient();
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [stats, setStats] = useState({ words: chapter.word_count, chars: 0 });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<{ json: TiptapContent; text: string }>({
    json: chapter.content,
    text: "",
  });

  const editor = useNovelEditor({
    content: chapter.content,
    onUpdate: (json, text) => {
      latest.current = { json, text };
      const w = wordCount(text);
      setStats({ words: w, chars: text.length });
      setSaveState("dirty");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(save, 900);
    },
  });

  async function save() {
    setSaveState("saving");
    const { error } = await supabase
      .from("chapters")
      .update({
        content: latest.current.json,
        word_count: wordCount(latest.current.text),
      })
      .eq("id", chapter.id);
    if (error) {
      toast.error(error.message);
      setSaveState("dirty");
      return;
    }
    setSaveState("saved");
    qc.invalidateQueries({ queryKey: ["chapter-counts"] });
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        save();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.id]);

  function getSelection(): string {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    if (from === to) return editor.getText();
    return editor.state.doc.textBetween(from, to, "\n");
  }

  function onInsert(text: string) {
    if (!editor) return;
    editor.chain().focus().insertContent(text).run();
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-1 border-b border-border px-6 py-2">
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive("heading", { level: 1 })}>
            <Heading1 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })}>
            <Heading2 className="size-3.5" />
          </ToolbarButton>
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")}>
            <Bold className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")}>
            <Italic className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")}>
            <UnderlineIcon className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHighlight().run()} active={editor?.isActive("highlight")}>
            <Highlighter className="size-3.5" />
          </ToolbarButton>
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")}>
            <List className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")}>
            <ListOrdered className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")}>
            <Quote className="size-3.5" />
          </ToolbarButton>
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton onClick={() => editor?.chain().focus().undo().run()}>
            <Undo2 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().redo().run()}>
            <Redo2 className="size-3.5" />
          </ToolbarButton>
        </div>

        {/* Editor */}
        <motion.div
          key={chapter.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex-1 overflow-y-auto"
        >
          <div className="mx-auto max-w-[68ch] px-6 py-16">
            <input
              defaultValue={chapter.title}
              onBlur={async (e) => {
                const v = e.target.value.trim();
                if (v && v !== chapter.title) {
                  await supabase.from("chapters").update({ title: v }).eq("id", chapter.id);
                  qc.invalidateQueries({ queryKey: ["chapters", novelId] });
                }
              }}
              className="mb-6 w-full bg-transparent font-serif text-4xl leading-tight outline-none placeholder:text-muted-foreground"
              placeholder="Chapter title"
            />
            <EditorSurface editor={editor} />
          </div>
        </motion.div>

        {/* Status bar */}
        <div className="flex h-10 items-center justify-between border-t border-border px-4 text-[10px] uppercase tracking-wider text-muted-foreground">
          <div className="flex gap-4">
            <span>{stats.words} words</span>
            <span>{stats.chars} chars</span>
            <span>{Math.max(1, Math.round(stats.words / 220))}m read</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`size-1.5 rounded-full ${
                saveState === "saved"
                  ? "bg-emerald-500"
                  : saveState === "saving"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-muted-foreground"
              }`}
            />
            <span>
              {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Unsaved"}
            </span>
          </div>
        </div>
      </div>

      {/* Inspector */}
      <aside className="hidden w-80 shrink-0 flex-col border-l border-border lg:flex">
        <AiPanel
          novelTitle={novelTitle}
          chapterTitle={chapter.title}
          getSelection={getSelection}
          onInsert={onInsert}
        />
      </aside>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  children,
}: {
  onClick?: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid size-7 place-items-center rounded transition-colors ${
        active
          ? "bg-accent/10 text-accent"
          : "text-muted-foreground hover:bg-surface hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
