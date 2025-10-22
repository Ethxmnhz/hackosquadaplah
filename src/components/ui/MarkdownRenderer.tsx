import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Horizontal rule - this will properly render --- as a horizontal line
          hr: () => (
            <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-gray-500 to-transparent" />
          ),
          // Code blocks
          code(codeProps) {
            // Destructure safely; inline detection uses 'inline' flag present on ReactMarkdown v8 component props
            const { children, className: codeClassName } = codeProps as any;
            const match = /language-(\w+)/.exec(codeClassName || '');
            const isInline = (codeProps as any).inline === true;
            if (!isInline && match) {
              return (
                <SyntaxHighlighter
                  style={oneDark as any}
                  language={match[1]}
                  PreTag="div"
                  className="rounded-lg"
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              );
            }
            return (
              <code className="bg-slate-800 px-2 py-1 rounded text-primary font-mono text-sm">
                {children}
              </code>
            );
          },
          // Paragraphs
          p: ({ children }) => (
            <p className="text-gray-300 leading-relaxed mb-4">{children}</p>
          ),
          // Headings
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold text-white mb-6 mt-8 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-bold text-white mb-4 mt-6">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold text-white mb-3 mt-4">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-semibold text-white mb-2 mt-4">{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-base font-semibold text-white mb-2 mt-3">{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-sm font-semibold text-white mb-2 mt-3">{children}</h6>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-4 ml-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-2 text-gray-300 mb-4 ml-4">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-light underline transition-colors"
            >
              {children}
            </a>
          ),
          // Images
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="max-w-full h-auto rounded-lg shadow-lg border border-slate-600 my-4"
            />
          ),
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full border-collapse border border-slate-600 rounded-lg">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-800">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-slate-600 px-4 py-2 font-semibold text-white text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-600 px-4 py-2 text-gray-300">
              {children}
            </td>
          ),
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary bg-primary/5 pl-4 py-2 my-4 italic text-gray-300">
              {children}
            </blockquote>
          ),
          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-bold text-white">{children}</strong>
          ),
          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic text-gray-200">{children}</em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
