'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  debugContext?: string;
  meta?: { streaming?: boolean }; // small meta flag for UI
};

const STORAGE_KEY = 'deep-avatar-chat-history-v1';
const PREFETCH_DEBOUNCE_MS = 700; // start prefetch after user pauses typing
const STREAM_CHAR_BATCH = 6; // how many chars to reveal per tick
const STREAM_INTERVAL_MS = 20; // tick speed for the simulated stream

// ---------- small util functions ----------
function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

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

// keep your existing cleaning logic
function cleanAnswerText(raw: string): string {
  if (!raw) return raw;
  let text = raw.trim();
  text = text.replace(/([0-9]+)\.\s*\n\s*\*\*/g, '$1. **');

  const secondSourcesIdx = text.indexOf('\nSources:\n');
  if (secondSourcesIdx !== -1) {
    text = text.slice(0, secondSourcesIdx).trim();
  }

  const marker =
    'These sources were selected as the most relevant matches to your question';
  const markerIndex = text.indexOf(marker);
  if (markerIndex !== -1) {
    text = text.slice(0, markerIndex).trim();
  }

  return text;
}

// ---------- Typing indicator component ----------
const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-3 py-2">
    <div className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" />
    <div className="h-2 w-2 rounded-full bg-slate-300 animate-pulse delay-150" />
    <div className="h-2 w-2 rounded-full bg-slate-300 animate-pulse delay-300" />
  </div>
);

// ---------- Chat interface (visual) ----------
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
  onScrollToBottom,
  embedded,
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
  showScrollDown: boolean;
  onScrollToBottom: () => void;
  embedded?: boolean;
}) => {
  const bubbleWidthClass = isFullScreen ? 'max-w-[80%]' : 'max-w-xs md:max-w-md lg:max-w-lg';

  const handleClose = () => {
  if (embedded) {
    window.parent.postMessage(
      { type: "DEEPAI_WIDGET_CLOSE" },
      "*"
    );
  } else {
    onClose();
  }
};

  const [showScrollDown, setShowScrollDown] = useState(false);

  const scrollToBottom = () => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  };


  const handleScroll = () => {
    if (!scrollRef.current) return;

    const el = scrollRef.current;

    const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    // ChatGPT rule #1 — hide if at bottom
    const atBottom = scrollBottom < 50;

    // ChatGPT rule #2 — show only after scrolling up > 1 viewport height
    const pastThreshold = el.scrollTop < el.scrollHeight - el.clientHeight * 1.2;

    setShowScrollDown(!atBottom && pastThreshold);
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
    /*<div className={`fixed transition-all duration-300 ${isFullScreen ? 'inset-0' : 'bottom-0 right-0 w-full max-w-md h-[70vh]'} m-0 z-50`}>*/
    <div className={`transition-all duration-300 ${embedded ? 'relative w-full h-full' : `fixed ${isFullScreen ? 'inset-0' : 'bottom-0 right-0 w-full max-w-md h-[70vh]'} z-50`} `}>
      {/* overlay when fullscreen for readability - keep this if you already applied in your main file */}
      {isFullScreen && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none z-0" />}
      <Card className={`relative z-10 flex flex-col h-full bg-card/80 backdrop-blur-sm border-border/50 ${isFullScreen ? 'rounded-none' : 'rounded-t-lg'}`}>
        <CardHeader className="flex flex-row items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src="/logo.png" alt="Deep AI" />
              <AvatarFallback>DF</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-lg font-semibold">Deep Avatar</div>
              <p className="text-sm text-muted-foreground">Your guide to DeepFunding</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-sm hover:bg-white/20 hover:border-white/30 transition" onClick={onToggleFullScreen}>
              {isFullScreen ? <Minimize className="h-4 w-4 text-white" /> : <Maximize className="h-4 w-4 text-white" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 shadow-sm hover:bg-primary/30 hover:border-primary/40 transition" onClick={onNewChat}>
              <Plus className="h-4 w-4 text-primary-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-red-500/20 backdrop-blur-md border border-red-400/30 shadow-sm hover:bg-red-500/30 hover:border-red-400/40 transition" onClick={handleClose}>
              <X className="h-4 w-4 text-red-200" />
            </Button>
          </div>
        </CardHeader>

        <CardContent ref={scrollRef} onScroll={handleScroll} className="flex-grow overflow-y-auto p-4 space-y-4 relative">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground space-y-3">
              <p>Ask a question to get started, for example:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => onQuickInsert('What is a Workgroup in DeepFunding and how does it differ from a Circle?')}>Workgroups vs Circles</Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => onQuickInsert('How does governance work in DeepFunding?')}>Governance structure</Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => onQuickInsert('How does the compensation scheme for Circle members work?')}>Compensation scheme</Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => onQuickInsert('What is the role of the IT Circle and how can I interact with them?')}>IT Circle role</Button>
              </div>
            </div>
          )}

          {messages.map((message) => {
            const isAssistant = message.role === 'assistant';
            return (
              <div key={message.id} className={`flex flex-col gap-1 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-end gap-2">
                  {isAssistant && <Bot className="h-8 w-8 text-primary" />}
                  <div
                    className={`
    ${bubbleWidthClass}
    px-4 py-2
    text-[15px] leading-relaxed
    animate-fadeInSlideUp

    ${message.role === 'user'
                        ? 'bg-[#2f2f2f] text-white rounded-3xl rounded-br-none shadow-sm'
                        : 'text-secondary-foreground'
                      }
  `}
                  >

                    {/* If message.meta?.streaming is true, we can show a subtle "streaming" indicator style (optional) */}
                    {message.meta?.streaming ? (
                      <span className="opacity-90">{message.content}<span className="blinking-cursor">●</span></span>
                    ) : (
                      <LinkedText text={message.content} />
                    )}
                  </div>
                  {message.role === 'user' && <User className="h-8 w-8 text-accent-foreground" />}
                </div>
              </div>
            );
          })}

          {showScrollDown && (
            <button
              onClick={scrollToBottom}
              className={`
                fixed 
                bottom-24 left-1/2 -translate-x-1/2
                z-[9999]
                h-10 w-10 flex items-center justify-center
                rounded-full
          
                bg-[#2f2f2f]/90 backdrop-blur-md
                border border-white/10
                shadow-[0_0_12px_rgba(0,0,0,0.45)]
          
                transition-all duration-200
                hover:bg-[#3b3b3b]/90 active:scale-95
          
                animate-chatgptAppear
                ${isLoading ? 'opacity-50 pointer-events-none' : ''}
              `}
            >
              <ArrowDown className="h-5 w-5 text-white" />
            </button>
          )}
        </CardContent>

        <p className="text-xs text-muted-foreground text-center leading-snug px-4">
          ⚠️ This assistant uses publicly available DeepFunding sources; responses are generated by AI and may contain inaccuracies. Verify critical details.
        </p>

        <CardFooter className="p-4 border-t">
          <div className="flex w-full items-center space-x-2">
            <Input placeholder="Ask a question..." value={input} onChange={onInputChange} onKeyDown={(e) => e.key === 'Enter' && !isLoading && onSend()} disabled={isLoading} />
            <Button onClick={onSend} disabled={isLoading} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-md shadow-blue-400/20 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
              Send
            </Button>
          </div>
        </CardFooter>

        {/* Scroll down button (floating) */}
        {showScrollDown && (
          <button onClick={onScrollToBottom} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] h-10 w-10 flex items-center justify-center rounded-full bg-[#2f2f2f]/90 backdrop-blur-md border border-white/10 shadow-[0_0_12px_rgba(0,0,0,0.45)] transition-all duration-200 hover:bg-[#3b3b3b]/90 active:scale-95">
            <ArrowDown className="h-5 w-5 text-white" />
          </button>
        )}
      </Card>
    </div>
  );
};

// ---------- ChatProvider (logic + streaming + prefetch) ----------
export function ChatProvider() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const pathname = usePathname();
  const isEmbedPage = pathname ? pathname.startsWith('/embed') : false;
  const scrollRef = useRef<HTMLDivElement>(null);

  // scroll button
  const [showScrollDown, setShowScrollDown] = useState(false);

  // prefetch: store last prefetched query and its result
  const prefetchedRef = useRef<{ query: string; result?: any; controller?: AbortController } | null>(null);
  const prefetchTimerRef = useRef<number | null>(null);

  // streaming helpers
  const streamingRef = useRef<{ id: string; interval?: number | null } | null>(null);

  // useEffect(() => {
  //   if (isEmbedPage) setIsOpen(true);
  // }, [isEmbedPage]);

  // restore from storage
  useEffect(() => {
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

  // save to storage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (err) {
      console.error('[Chat] Failed to save conversation:', err);
    }
  }, [messages]);

  // autoscroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // show scroll down button state
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      setShowScrollDown(!isBottom);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // ---------- Prefetch (debounced) ----------
  useEffect(() => {
    // If input is empty or short, skip
    if (!input || input.trim().length < 6) return;

    if (prefetchTimerRef.current) {
      window.clearTimeout(prefetchTimerRef.current);
    }

    prefetchTimerRef.current = window.setTimeout(() => {
      startPrefetch(input.trim());
    }, PREFETCH_DEBOUNCE_MS);

    return () => {
      if (prefetchTimerRef.current) window.clearTimeout(prefetchTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const startPrefetch = async (query: string) => {
    try {
      // If we already prefetched same query, skip
      if (prefetchedRef.current?.query === query && prefetchedRef.current?.result) return;

      // Abort any previous prefetch
      if (prefetchedRef.current?.controller) {
        prefetchedRef.current.controller.abort();
      }

      const controller = new AbortController();
      prefetchedRef.current = { query, controller };

      // Start a light-weight preflight request: ask the server for "context only"
      // We assume /api/ask supports a "prefetch" param (if not, server will just return full answer)
      // This fetch is intentionally light: short timeout and no heavy prompt
      const resp = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query, prefetch: true }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        // ignore prefetch failure
        return;
      }

      const data = await resp.json();
      prefetchedRef.current = { query, result: data, controller: undefined };
      console.log('[Chat] Prefetch complete for:', query);
    } catch (err) {
      if ((err as any)?.name === 'AbortError') return;
      console.warn('[Chat] Prefetch error', err);
    }
  };

  // ---------- helper to simulate streaming (reveals text progressively) ----------
  const streamTextIntoMessage = (messageId: string, fullText: string) => {
    // clear any previous streaming interval
    if (streamingRef.current?.interval) {
      window.clearInterval(streamingRef.current.interval);
      streamingRef.current.interval = null;
    }

    const total = fullText.length;
    let pos = 0;

    // mark message as streaming in meta
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, meta: { ...(m.meta || {}), streaming: true } } : m)));

    const interval = window.setInterval(() => {
      pos = Math.min(total, pos + STREAM_CHAR_BATCH);
      const current = fullText.slice(0, pos);

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: current } : m))
      );

      // scroll while streaming
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;

      if (pos >= total) {
        window.clearInterval(interval);
        streamingRef.current = null;
        // remove streaming flag
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, meta: { ...(m.meta || {}), streaming: false } } : m)));
      }
    }, STREAM_INTERVAL_MS);

    streamingRef.current = { id: messageId, interval };
  };

  // ---------- main send handler ----------
  const handleSend = async () => {
    if (!input.trim()) return;

    const question = input.trim();
    setInput('');

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: newId(),
      role: 'user',
      content: question,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Quick path for acknowledgements (no network)
    if (isAcknowledgement(question)) {
      const assistantMessage: ChatMessage = {
        id: newId(),
        role: 'assistant',
        content: "You're welcome! If you have more DeepFunding questions, feel free to ask.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
      return;
    }

    // Create a placeholder assistant "typing" message immediately for instant feedback
    const placeholderId = newId();
    const placeholderMessage: ChatMessage = {
      id: placeholderId,
      role: 'assistant',
      content: '', // initially empty; will stream into it
      meta: { streaming: true },
    };
    setMessages((prev) => [...prev, placeholderMessage]);
    setIsLoading(true);

    try {
      // If we have a prefetched result for this exact query, use it
      if (prefetchedRef.current?.query === question && prefetchedRef.current?.result) {
        const pref = prefetchedRef.current.result;
        // if result contains final answer text
        const maybeAnswer = pref.answer || pref.result?.answer || pref.data?.answer;
        const answerText = cleanAnswerText(String(maybeAnswer || ''));
        // stream it into the placeholder
        streamTextIntoMessage(placeholderId, answerText);
        // also append sources if any
        // replace placeholder meta when done (the streaming helper clears meta)
        setIsLoading(false);
        return;
      }

      // Normal request path: call the API
      const resp = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!resp.ok) {
        // read body to show more helpful error
        let details = `Request failed with status ${resp.status}`;
        try {
          const j = await resp.json();
          details = j.error || details;
        } catch {
          // ignore
        }
        // replace the placeholder with an error message
        setMessages((prev) => prev.map((m) => (m.id === placeholderId ? { ...m, content: `Sorry — ${details}`, meta: { ...(m.meta || {}), streaming: false } } : m)));
        setIsLoading(false);
        return;
      }

      const data = await resp.json();
      const answer = cleanAnswerText(String(data.answer ?? ''));
      // stream the answer into the placeholder
      streamTextIntoMessage(placeholderId, answer);

      // If you want to preserve sources or debug context, update the message after streaming completes
      // Here we simply update message with final summary after streaming finishes (small timeout to ensure completion)
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? {
                ...m,
                content: answer,
                sources: (data.sources || []).map((s: any) => ({
                  url: s.url,
                  score: s.score,
                  timestamp: s.timestamp,
                  summary: s.summary ?? null,
                })),
                debugContext: data.context ?? undefined,
                meta: { ...(m.meta || {}), streaming: false },
              }
              : m
          )
        );
      }, Math.max(250, answer.length / 10)); // a little buffer

    } catch (err: any) {
      console.error('[Chat] send error', err);
      setMessages((prev) => prev.map((m) => (m.id === placeholderId ? { ...m, content: `Sorry, something went wrong: ${err.message || err}`, meta: { ...(m.meta || {}), streaming: false } } : m)));
    } finally {
      setIsLoading(false);
    }
  };

  // scroll to bottom helper (used by the floating arrow)
  const onScrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  // quick insert helper
  const handleQuickInsert = (q: string) => {
    setInput(q);
  };

  // new chat
  const handleNewChat = () => {
    setMessages([]);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  };

  return (
    <>
      {isOpen ? (
        <ChatInterface
          embedded={isEmbedPage}
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
          showScrollDown={showScrollDown}
          onScrollToBottom={onScrollToBottom}
        />
      ) : (
        !isEmbedPage && (
          <Button className="fixed bottom-8 right-8 rounded-full w-16 h-16 bg-primary hover:bg-primary/90 shadow-lg" onClick={() => setIsOpen(true)} style={{ boxShadow: '0 0 15px hsl(var(--primary)), 0 0 25px hsl(var(--primary))' }}>
            <Avatar>
              <AvatarImage src="/logo.png" alt="DeepFunding AI" />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
          </Button>
        )
      )}
    </>
  );
}
