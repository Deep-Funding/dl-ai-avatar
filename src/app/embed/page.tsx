// src/app/embed/page.tsx
import { ChatProvider } from '@/components/chat-provider';

export default function EmbedPage() {
  // This page provides the chat widget in a clean, embeddable format.
  return (
    <div className="w-full bg-transparent">
      <ChatProvider />
    </div>
  );
}
