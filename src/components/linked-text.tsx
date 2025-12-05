'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';

type LinkedTextProps = {
  text: string;
};

export function LinkedText({ text }: LinkedTextProps) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="mb-1 last:mb-0 whitespace-pre-wrap">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => (
          <ul className="list-disc list-inside mt-1 space-y-0.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mt-1 space-y-0.5">{children}</ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {children}
          </a>
        ),
        code: ({ inline, children }) =>
          inline ? (
            <code className="px-1 py-0.5 rounded bg-black/10 text-xs">
              {children}
            </code>
          ) : (
            <code className="block p-2 rounded bg-black/10 text-xs whitespace-pre-wrap">
              {children}
            </code>
          ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
