import { useEffect, useMemo, useRef, useState } from "react";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  type MDXEditorMethods,
  UndoRedo,
  diffSourcePlugin,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";

type RichMarkdownEditorProps = {
  value: string;
  onChange: (markdown: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
};

export function RichMarkdownEditor({
  value,
  onChange,
  onBlur,
  disabled = false,
}: RichMarkdownEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const editorValue = useRef(value);
  const [parseError, setParseError] = useState<string | null>(null);

  const plugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      thematicBreakPlugin(),
      markdownShortcutPlugin(),
      diffSourcePlugin({ viewMode: "rich-text" }),
      toolbarPlugin({
        toolbarClassName: "cresciva-markdown-toolbar",
        toolbarContents: () => (
          <DiffSourceToggleWrapper options={["rich-text", "source"]}>
            <div
              role="toolbar"
              aria-label="Formatting tools"
              className="flex flex-wrap items-center gap-1"
            >
              <UndoRedo />
              <BlockTypeSelect />
              <BoldItalicUnderlineToggles options={["Bold", "Italic"]} />
              <ListsToggle options={["bullet", "number"]} />
              <CreateLink />
              <InsertThematicBreak />
            </div>
          </DiffSourceToggleWrapper>
        ),
      }),
    ],
    [],
  );

  useEffect(() => {
    if (value === editorValue.current) return;
    editorValue.current = value;
    editorRef.current?.setMarkdown(value);
  }, [value]);

  return (
    <div className="space-y-2">
      <MDXEditor
        ref={editorRef}
        markdown={value}
        onChange={(markdown) => {
          editorValue.current = markdown;
          setParseError(null);
          onChange(markdown);
        }}
        onBlur={onBlur}
        onError={({ error }) => setParseError(error)}
        readOnly={disabled}
        placeholder="Start writing your resource…"
        className="cresciva-markdown-editor mdxeditor-full-height"
        contentEditableClassName="cresciva-markdown-content prose prose-slate max-w-none prose-headings:font-display prose-a:text-navy"
        plugins={plugins}
      />
      {parseError && (
        <p role="alert" className="text-sm text-destructive-strong">
          This Markdown cannot be displayed yet: {parseError}
        </p>
      )}
    </div>
  );
}
