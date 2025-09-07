import React from 'react';

// A simple URL regex
const urlRegex = /(https?:\/\/[^\s]+)/g;

export const LinkedText = ({ text }: { text: string }) => {
  const parts = text.split(urlRegex);

  return (
    <p className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80"
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </p>
  );
};
