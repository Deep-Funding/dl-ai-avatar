'use client';
import { ChatProvider } from '@/components/chat-provider';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-[#1e1f29] to-[#2a2a4a]">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-primary" style={{textShadow: '0 0 10px hsl(var(--primary))'}}>Welcome to Deep AI</h1>
        <p className="text-lg text-muted-foreground">
          Click the chat bubble in the bottom right corner to get started.
        </p>
      </div>
      <ChatProvider />
    </main>
  );
}
