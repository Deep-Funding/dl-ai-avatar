'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Components } from 'react-markdown';

type LinkedTextProps = {
  text: string;
};

// Regex to detect plaintext URLs
const URL_REGEX = /(https?:\/\/[^\s)]+)/g;

export function LinkedText({ text }: LinkedTextProps) {
  // Automatically wrap raw URLs in markdown-style links
  const processed = text.replace(URL_REGEX, (url) => `[${url}](${url})`);
  return (
    <ReactMarkdown
      components={{
        // ---------------- PARAGRAPHS ----------------
        p: ({ children }) => {
          const value = String(children).trim();

          // Match headings: "1. Direct answer"
          if (/^1\.\s*Direct Answer/i.test(value)) {
            return (
              <p className="mt-3 mb-1 text-white font-semibold text-[1.1rem] border-t border-white/10 pt-2">
                {value}
              </p>
            );
          }

          if (/^2\.\s*Short Explanation/i.test(value)) {
            return (
              <p className="mt-3 mb-1 text-white font-semibold text-[1.05rem]">
                {value}
              </p>
            );
          }

          if (/^3\.\s*Sources/i.test(value)) {
            return (
              <p className="mt-4 mb-1 text-white/80 font-semibold text-[0.95rem]">
                {value}
              </p>
            );
          }

          return (
            <p className="mb-1 last:mb-0 whitespace-pre-wrap text-white/85 leading-relaxed">
              {children}
            </p>
          );
        },

        // ---------------- BOLD ----------------
        strong: ({ children }) => (
          <strong className="font-bold text-white">{children}</strong>
        ),

        // ---------------- ITALIC ----------------
        em: ({ children }) => (
          <em className="italic text-white/90">{children}</em>
        ),

        // ---------------- LISTS ----------------
        ul: ({ children }) => (
          <ul className="list-disc list-inside mt-1 mb-2 space-y-1 text-white/85">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mt-1 mb-2 space-y-1 text-white/85">
            {children}
          </ol>
        ),
        li: ({ children }) => <li>{children}</li>,

        // ---------------- LINKS ----------------
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 text-blue-400 hover:text-blue-300"
          >
            {children}
          </a>
        ),

        // ---------------- CODE BLOCKS & INLINE CODE ----------------
        code: ({ node, children }) => {
          const isInline = node?.position?.start?.line === node?.position?.end?.line;

          if (isInline) {
            return (
              <code className="px-1 py-0.5 rounded bg-white/10 text-xs text-white">
                {children}
              </code>
            );
          }

          // Block code (inside <pre>)
          return (
            <code className="block p-3 rounded-lg bg-black/30 text-xs text-white whitespace-pre-wrap border border-white/10 my-2">
              {children}
            </code>
          );
        },
      }}
    >
      {processed}
    </ReactMarkdown>
  );
}