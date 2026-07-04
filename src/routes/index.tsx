import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, BookOpen, Feather } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 selection:text-accent">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="size-6 rotate-45 rounded-sm bg-accent" />
          <span className="text-lg font-medium tracking-tight">StoryNest</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            to="/auth"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            Start writing
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-6 pt-20 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3 text-accent" />
            AI writing partner for novelists
          </div>
          <h1 className="font-serif text-6xl leading-[1.05] tracking-tight text-balance md:text-7xl">
            A quiet workspace <br className="hidden md:block" />
            for your next novel.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground text-pretty">
            Draft chapters in a focused editor, organize characters and worlds,
            and let a literary AI help you find the next sentence.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
            >
              Create a free account
            </Link>
            <Link
              to="/auth"
              className="rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2"
            >
              Sign in
            </Link>
          </div>
        </motion.div>

        <div className="mt-24 grid gap-4 md:grid-cols-3">
          {[
            { icon: Feather, title: "Focused editor", body: "Distraction-free prose with autosave and elegant typography." },
            { icon: BookOpen, title: "Chapter outline", body: "Reorder chapters, track word counts, and stay in flow." },
            { icon: Sparkles, title: "AI assistant", body: "Continue, rewrite, expand, and brainstorm — right beside your text." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-surface p-6 text-left">
              <f.icon className="mb-3 size-4 text-accent" />
              <h3 className="text-sm font-medium">{f.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
