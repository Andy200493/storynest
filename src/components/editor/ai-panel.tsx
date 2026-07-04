import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiChat, aiQuickAction } from "@/lib/ai.functions";
import { Sparkles, Send, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Msg = { role: "user" | "assistant"; content: string };

type QuickAction = "continue" | "rewrite" | "expand" | "shorten" | "improve_dialogue" | "improve_description" | "grammar" | "summarize";
const QUICK: { label: string; action: QuickAction }[] = [
  { label: "Continue writing", action: "continue" },
  { label: "Rewrite", action: "rewrite" },
  { label: "Expand", action: "expand" },
  { label: "Shorten", action: "shorten" },
  { label: "Improve dialogue", action: "improve_dialogue" },
  { label: "Grammar fix", action: "grammar" },
];

export function AiPanel({
  novelTitle,
  chapterTitle,
  getSelection,
  onInsert,
}: {
  novelTitle?: string;
  chapterTitle?: string;
  getSelection: () => string;
  onInsert: (text: string) => void;
}) {
  const chat = useServerFn(aiChat);
  const quick = useServerFn(aiQuickAction);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { text: reply } = await chat({
        data: {
          messages: next,
          selection: getSelection() || undefined,
          chapterTitle,
          novelTitle,
        },
      });
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  }

  async function runQuick(action: (typeof QUICK)[number]["action"]) {
    const sel = getSelection();
    if (!sel.trim()) {
      toast.error("Select some text in your chapter first.");
      return;
    }
    setLoading(true);
    try {
      const { text } = await quick({ data: { action, text: sel } });
      onInsert(text);
      toast.success("Inserted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          <Wand2 className="size-3 text-accent" /> Quick actions
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q.action}
              onClick={() => runQuick(q.action)}
              disabled={loading}
              className="rounded-md bg-surface-2 px-2 py-1.5 text-left text-xs text-foreground/80 ring-1 ring-white/5 transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
            >
              {q.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground/70">
          Select prose in the editor, then choose an action.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-md bg-surface p-4 text-xs text-muted-foreground ring-1 ring-white/5">
            <Sparkles className="mb-2 size-4 text-accent" />
            Ask for a plot twist, a character backstory, a scene expansion — anything.
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-md p-3 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-accent/10 text-foreground ring-1 ring-accent/20"
                  : "bg-surface text-foreground/90 ring-1 ring-white/5"
              }`}
            >
              <div className="mb-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                {m.role === "user" ? "You" : "StoryNest"}
              </div>
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.role === "assistant" && (
                <button
                  onClick={() => onInsert(m.content)}
                  className="mt-2 text-[10px] text-accent underline underline-offset-4"
                >
                  Insert into chapter
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="text-xs text-muted-foreground">Thinking…</div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-border p-3"
      >
        <div className="flex items-end gap-2 rounded-md bg-surface p-2 ring-1 ring-white/5 focus-within:ring-accent/50">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="Ask StoryNest…"
            className="flex-1 resize-none bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded bg-accent p-1.5 text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
