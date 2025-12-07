'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, Maximize, Minimize, Plus, User, X, ArrowDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LinkedText } from '@/components/linked-text';

type SourceInfo = {
  url: string;
  score: number;
  timestamp: string;
  summary: string | null;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceInfo[];
  debugContext?: string; // raw combined context from server (dev only)
};

const STORAGE_KEY = 'deep-avatar-chat-history-v1';

function isAcknowledgement(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .replace(/[!?.,]/g, '')
    .trim();

  if (!normalized) return false;

  const exactMatches = new Set([
    'thanks',
    'thank you',
    'thank you very much',
    'thanks a lot',
    'ok',
    'okay',
    'k',
    'ok thanks',
    'ok thank you',
    'cool',
    'nice',
    'great',
    'awesome',
    'got it',
    'understood',
    'makes sense',
    'sounds good',
    'all good',
    'perfect',
    'noted',
  ]);

  if (exactMatches.has(normalized)) return true;

  // Slightly looser matches (phrases inside a longer sentence)
  const partials = [
    'thanks',
    'thank you',
    'got it',
    'understood',
    'makes sense',
    'sounds good',
    'all good',
  ];

  return partials.some((p) => normalized.includes(p));
}




// Helper to strip the extra "Sources:\nsite(score)\n..." block,
// and also the explanatory sentence if present.
function cleanAnswerText(raw: string): string {
  if (!raw) return raw;

  let text = raw.trim();

  // Fix "1.\n  **Direct answer**" -> "1. **Direct answer**"
  text = text.replace(/([0-9]+)\.\s*\n\s*\*\*/g, '$1. **');

  // 1) Remove trailing block starting with a plain "Sources:" line
  //    (this is the domain(score) list, e.g. deep-communities.ai(0.69))
  const secondSourcesIdx = text.indexOf('\nSources:\n');
  if (secondSourcesIdx !== -1) {
    text = text.slice(0, secondSourcesIdx).trim();
  }

  // 2) Also remove the explanatory sentence if it appears (safety net)
  const marker =
    'These sources were selected as the most relevant matches to your question';
  const markerIndex = text.indexOf(marker);
  if (markerIndex !== -1) {
    text = text.slice(0, markerIndex).trim();
  }

  return text;
}


const ChatBubble = ({ onClick }: { onClick: () => void }) => (
  <Button
    className="fixed bottom-8 right-8 rounded-full w-16 h-16 bg-primary hover:bg-primary/90 shadow-lg"
    onClick={onClick}
    style={{
      boxShadow:
        '0 0 15px hsl(var(--primary)), 0 0 25px hsl(var(--primary))',
    }}
  >
    <Avatar>
      <AvatarImage src="/logo.png" alt="DeepFunding AI" />
      <AvatarFallback>AI</AvatarFallback>
    </Avatar>
  </Button>
);

const ChatInterface = ({
  onClose,
  isFullScreen,
  onToggleFullScreen,
  messages,
  input,
  onInputChange,
  onSend,
  isLoading,
  scrollRef,
  onQuickInsert,
  onNewChat,
  expandedContextIds,
}: {
  onClose: () => void;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  messages: ChatMessage[];
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  isLoading: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  onQuickInsert: (q: string) => void;
  onNewChat: () => void;
  expandedContextIds: string[];

}) => {
  // Wider bubbles in full screen
  const bubbleWidthClass = isFullScreen
    ? 'max-w-[80%]'
    : 'max-w-xs md:max-w-md lg:max-w-lg';

  const [showScrollDown, setShowScrollDown] = useState(false);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };



  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const isBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      setShowScrollDown(!isBottom);
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef]);


  return (
    <div
      className={`fixed transition-all duration-300 ${isFullScreen ? 'inset-0' : 'bottom-0 right-0 w-full max-w-md h-[70vh]'
        } m-0 z-50`}
    >
      <Card
        className={`flex flex-col h-full bg-card/80 backdrop-blur-sm border-border/50 ${isFullScreen ? 'rounded-none' : 'rounded-t-lg'
          }`}
      >
        <CardHeader className="flex flex-row items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src="/logo.png" alt="DeepFunding AI" />
              <AvatarFallback>DF</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-lg font-semibold">Deep Avatar</div>
              <p className="text-sm text-muted-foreground">
                Your guide to DeepFunding
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={onToggleFullScreen}>
              {isFullScreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onNewChat}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent
          ref={scrollRef}
          className="flex-grow overflow-y-auto p-4 space-y-4 relative"
        >
          {/* {messages.length === 0 && (
            <div className="text-center text-muted-foreground">
              Ask a question to get started.
            </div>
          )} */}

          {messages.length === 0 && (
            <div className="text-center text-muted-foreground space-y-3">
              <p>Ask a question to get started, for example:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    onQuickInsert('What is a Workgroup in DeepFunding and how does it differ from a Circle?')
                  }
                >
                  Workgroups vs Circles
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    onQuickInsert('How does governance work in DeepFunding?')
                  }
                >
                  Governance structure
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    onQuickInsert('How does the compensation scheme for Circle members work?')
                  }
                >
                  Compensation scheme
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    onQuickInsert('What is the role of the IT Circle and how can I interact with them?')
                  }
                >
                  IT Circle role
                </Button>
              </div>
            </div>
          )}


          {messages.map((message) => {
            return (
              <div
                key={message.id}
                className={`flex flex-col gap-1 ${message.role === 'user' ? 'items-end' : 'items-start'
                  }`}
              >
                <div className="flex items-end gap-2">
                  {message.role === 'assistant' && (
                    <Bot className="h-8 w-8 text-primary" />
                  )}
                  <div
                    className={`
                      ${bubbleWidthClass}
                      rounded-lg px-4 py-2
                      text-[15px] leading-relaxed
                      ${message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground/80 [&_strong]:text-secondary-foreground [&_strong]:font-semibold'
                      }
                    `}
                  >
                    <LinkedText text={message.content} />
                  </div>
                  {message.role === 'user' && (
                    <User className="h-8 w-8 text-accent-foreground" />
                  )}
                </div>

                {/* Sources (assistant only, UI list) */}
                {/*message.role === 'assistant' &&
                  message.sources &&
                  message.sources.length > 0 && (
                    <div className="ml-10 text-xs text-muted-foreground max-w-[80%] space-y-1">
                      <div>
                        <span className="font-semibold">Sources:</span>
                        <ul className="mt-1 space-y-0.5 list-disc list-inside">
                          {message.sources.map((s, i) => (
                            <li key={i}>
                              <a
                                href={s.url}
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                              >
                                {new URL(s.url).hostname}
                              </a>
                              <span className="ml-1 opacity-70">
                                ({s.score.toFixed(2)})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )*/}

                {/* Note: debug "Show context" UI removed as requested */}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-end gap-2 justify-start">
              <Bot className="h-8 w-8 text-primary animate-pulse" />
              <div className="max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 bg-secondary text-secondary-foreground">
                <p>Thinking...</p>
              </div>
            </div>
          )}
          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground text-center leading-snug">
            ⚠️ This assistant uses publicly available DeepFunding sources, but responses are
            generated by AI and may contain inaccuracies. Please verify critical details with
            the official DeepFunding team.
          </p>

          { showScrollDown && (
            <button
              onClick={scrollToBottom}
              className="
      absolute left-1/2 transform -translate-x-1/2 
      bottom-20 z-50 flex items-center justify-center
      w-10 h-10 rounded-full shadow-lg border border-white/20
      bg-white/20 backdrop-blur-md hover:bg-white/30 transition
    "
            >
              <ArrowDown className="h-5 w-5 text-white" />
            </button>
          )}


        </CardContent>

        <CardFooter className="p-4 border-t">

          {/* Input */}
          <div className="flex w-full items-center space-x-2">
            <Input
              placeholder="Ask a question..."
              value={input}
              onChange={onInputChange}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && onSend()}
              disabled={isLoading}
            />
            <Button onClick={onSend} disabled={isLoading}>
              Send
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export function ChatProvider() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const pathname = usePathname();
  const isEmbedPage = pathname ? pathname.startsWith('/embed') : false;
  const scrollRef = useRef<HTMLDivElement>(null);

  const [showScrollDown, setShowScrollDown] = useState(false);
  const [expandedContextIds, setExpandedContextIds] = useState<string[]>([]);



  const handleQuickInsert = (q: string) => {
    setInput(q);
  };

  const handleNewChat = () => {
    setMessages([]);
    setExpandedContextIds([]);
    localStorage.setItem("deepfunding-chat", JSON.stringify([]));
  };



  useEffect(() => {
    if (isEmbedPage) {
      setIsOpen(true);
    }
  }, [isEmbedPage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed)) {
        setMessages(parsed);
        console.log('[Chat] Restored conversation from localStorage.');
      }
    } catch (err) {
      console.error('[Chat] Failed to restore conversation:', err);
    }
  }, []);


  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (err) {
      console.error('[Chat] Failed to save conversation:', err);
    }
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      setShowScrollDown(!isBottom);
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [scrollRef]);




  const newId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  const handleSend = async () => {
    if (!input.trim()) return;

    const question = input.trim();

    const userMessage: ChatMessage = {
      id: newId(),
      role: 'user',
      content: question,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // 🧠 If this is just an acknowledgement like "thanks", don't call the API.
    if (isAcknowledgement(question)) {
      const assistantMessage: ChatMessage = {
        id: newId(),
        role: 'assistant',
        content:
          "You're welcome! If you have more DeepFunding questions, feel free to ask.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const resClone = res.clone();
        let errorDetails = `Request failed with status ${res.status}`;
        try {
          const errorData = await resClone.json();
          errorDetails = errorData.error || errorDetails;
        } catch (e) {
          errorDetails = await res.text();
        }
        throw new Error(errorDetails);
      }

      const data = await res.json();

      // Optional console context log
      if (data.context) {
        console.log('--- Context from Server ---');
        console.log(data.context);
        console.log('---------------------------');
      }

      const sources: SourceInfo[] = (data.sources || []).map((s: any) => ({
        url: s.url,
        score: s.score,
        timestamp: s.timestamp,
        summary: s.summary ?? null,
      }));

      const assistantMessage: ChatMessage = {
        id: newId(),
        role: 'assistant',
        content: cleanAnswerText(data.answer),
        sources,
        debugContext: data.context ?? undefined, // still available in console if needed
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: newId(),
        role: 'assistant',
        content: `Sorry, something went wrong: ${error.message}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isOpen ? (
        <ChatInterface
          onClose={() => setIsOpen(false)}
          isFullScreen={isFullScreen}
          onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
          messages={messages}
          input={input}
          onInputChange={(e) => setInput(e.target.value)}
          onSend={handleSend}
          isLoading={isLoading}
          scrollRef={scrollRef}
          onQuickInsert={handleQuickInsert}
          onNewChat={handleNewChat}
          expandedContextIds={expandedContextIds}
        />
      ) : (
        !isEmbedPage && <ChatBubble onClick={() => setIsOpen(true)} />
      )}
    </>
  );
}
