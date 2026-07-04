import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ChatInput = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
  selection: z.string().optional(),
  chapterTitle: z.string().optional(),
  novelTitle: z.string().optional(),
});

export const aiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const system = [
      "You are StoryNest, a warm and literary AI writing partner for novelists.",
      "You help expand scenes, sharpen dialogue, brainstorm plot, name characters, and improve prose.",
      "Keep responses focused. When writing prose, match the writer's voice and tense.",
      data.novelTitle ? `Novel: "${data.novelTitle}"` : null,
      data.chapterTitle ? `Current chapter: "${data.chapterTitle}"` : null,
      data.selection
        ? `The writer has selected this passage for context:\n"""\n${data.selection}\n"""`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      messages: [{ role: "system", content: system }, ...data.messages],
    });

    return { text };
  });

const QuickInput = z.object({
  action: z.enum([
    "continue",
    "rewrite",
    "expand",
    "shorten",
    "improve_dialogue",
    "improve_description",
    "grammar",
    "summarize",
  ]),
  text: z.string().min(1),
});

export const aiQuickAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => QuickInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const prompts: Record<typeof data.action, string> = {
      continue:
        "Continue this passage naturally, matching voice, tense, and pacing. Add 1-2 paragraphs. Return only the new prose.",
      rewrite:
        "Rewrite this passage with sharper prose while keeping meaning and voice. Return only the rewritten prose.",
      expand:
        "Expand this passage with richer sensory detail and interiority. Return only the expanded prose.",
      shorten:
        "Tighten this passage. Cut filler, keep intent. Return only the shortened prose.",
      improve_dialogue:
        "Improve the dialogue in this passage — make it feel more natural and character-specific. Return only the revised passage.",
      improve_description:
        "Strengthen the descriptions in this passage with specific, evocative imagery. Return only the revised passage.",
      grammar:
        "Fix grammar and punctuation. Do not change meaning or voice. Return only the corrected passage.",
      summarize:
        "Summarize this passage in 2-3 sentences.",
    };

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      messages: [
        {
          role: "system",
          content:
            "You are StoryNest, a precise literary editor. Follow the instruction and return only the requested output — no preamble, no quotes, no explanations.",
        },
        { role: "user", content: `${prompts[data.action]}\n\n"""\n${data.text}\n"""` },
      ],
    });

    return { text };
  });
