import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";

export type TiptapContent = Record<string, unknown> | null;

export function useNovelEditor({
  content,
  onUpdate,
  editable = true,
}: {
  content: TiptapContent;
  onUpdate: (json: TiptapContent, text: string) => void;
  editable?: boolean;
}): Editor | null {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Highlight,
      Typography,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: "Begin writing…" }),
    ],
    content: content ?? undefined,
    editable,
    editorProps: {
      attributes: {
        class: "tiptap-prose focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON() as TiptapContent, editor.getText());
    },
  });

  useEffect(() => {
    return () => editor?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return editor;
}

export function EditorSurface({ editor }: { editor: Editor | null }) {
  return <EditorContent editor={editor} />;
}
