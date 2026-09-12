import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CONTENT_PROSE_CLASS } from "./prose";

/** Render the editor's Markdown with full paragraph, list and hard-break support. */
export function Markdown({ content, className = "" }: { content: string; className?: string }) {
  return (
    <div className={`${CONTENT_PROSE_CLASS} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, title }) => (
            <a href={href} title={title} target="_blank" rel="noopener noreferrer">{children}</a>
          ),
          img: ({ src, alt, title }) => src ? <img src={src} alt={alt ?? ""} title={title} loading="lazy" /> : <span>{alt}</span>,
          table: ({ children }) => (
            <div className="max-w-full overflow-x-auto" role="region" aria-label="Content table" tabIndex={0}>
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
