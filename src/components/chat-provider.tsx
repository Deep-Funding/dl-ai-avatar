
// 'use client';

// import { useState, useEffect, useRef } from 'react';
// import { usePathname } from 'next/navigation';
// import { Bot, Maximize, Minimize, User, X } from 'lucide-react';
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// import { Button } from '@/components/ui/button';
// import {
//   Card,
//   CardContent,
//   CardFooter,
//   CardHeader,
// } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
// import { LinkedText } from '@/components/linked-text';

// const ChatBubble = ({ onClick }: { onClick: () => void }) => (
//   <Button
//     className="fixed bottom-8 right-8 rounded-full w-16 h-16 bg-primary hover:bg-primary/90 shadow-lg"
//     onClick={onClick}
//     style={{boxShadow: '0 0 15px hsl(var(--primary)), 0 0 25px hsl(var(--primary))'}}
//   >
//     <Avatar>
//       <AvatarImage src="/logo.png" alt="DeepFunding AI" />
//       <AvatarFallback>AI</AvatarFallback>
//     </Avatar>
//   </Button>
// );

// const ChatInterface = ({
//   onClose,
//   isFullScreen,
//   onToggleFullScreen,
//   messages,
//   input,
//   onInputChange,
//   onSend,
//   isLoading,
//   scrollRef,
// }: {
//   onClose: () => void;
//   isFullScreen: boolean;
//   onToggleFullScreen: () => void;
//   messages: { role: 'user' | 'assistant'; content: string }[];
//   input: string;
//   onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
//   onSend: () => void;
//   isLoading: boolean;
//   scrollRef: React.RefObject<HTMLDivElement>;
// }) => (
//   <div
//     className={`fixed bottom-0 right-0 transition-all duration-300 ${
//       isFullScreen ? 'w-full h-full' : 'w-full max-w-md h-[70vh]'
//     } m-0 z-50`}
//   >
//     <Card
//       className={`flex flex-col h-full bg-card/80 backdrop-blur-sm border-border/50 ${
//         isFullScreen ? 'rounded-none' : 'rounded-t-lg'
//       }`}
//     >
//       <CardHeader className="flex flex-row items-center justify-between p-4">
//         <div className="flex items-center space-x-4">
//           <Avatar>
//             <AvatarImage src="/logo.png" alt="DeepFunding AI" />
//             <AvatarFallback>DF</AvatarFallback>
//           </Avatar>
//           <div>
//             <div className="text-lg font-semibold">Deep Avatar</div>
//             <p className="text-sm text-muted-foreground">Your guide to DeepFunding</p>
//           </div>
//         </div>
//         <div className="flex items-center space-x-2">
//           <Button variant="ghost" size="icon" onClick={onToggleFullScreen}>
//             {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
//           </Button>
//           <Button variant="ghost" size="icon" onClick={onClose}>
//             <X className="h-4 w-4" />
//           </Button>
//         </div>
//       </CardHeader>
//       <CardContent ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-4">
//         {messages.length === 0 && (
//            <div className="text-center text-muted-foreground">Ask a question to get started.</div>
//         )}
//         {messages.map((message, index) => (
//           <div
//             key={index}
//             className={`flex items-end gap-2 ${
//               message.role === 'user' ? 'justify-end' : 'justify-start'
//             }`}
//           >
//             {message.role === 'assistant' && (
//               <Bot className="h-8 w-8 text-primary" />
//             )}
//             <div
//               className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 text-base ${
//                 message.role === 'user'
//                   ? 'bg-primary text-primary-foreground'
//                   : 'bg-secondary text-secondary-foreground'
//               }`}
//             >
//               <LinkedText text={message.content} />
//             </div>
//              {message.role === 'user' && (
//               <User className="h-8 w-8 text-accent-foreground" />
//             )}
//           </div>
//         ))}
//         {isLoading && (
//           <div className="flex items-end gap-2 justify-start">
//              <Bot className="h-8 w-8 text-primary animate-pulse" />
//             <div className="max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 bg-secondary text-secondary-foreground">
//               <p>Thinking...</p>
//             </div>
//           </div>
//         )}
//       </CardContent>
//       <CardFooter className="p-4 border-t">
//         <div className="flex w-full items-center space-x-2">
//           <Input
//             placeholder="Ask a question..."
//             value={input}
//             onChange={onInputChange}
//             onKeyDown={(e) => e.key === 'Enter' && !isLoading && onSend()}
//             disabled={isLoading}
//           />
//           <Button onClick={onSend} disabled={isLoading}>
//             Send
//           </Button>
//         </div>
//       </CardFooter>
//     </Card>
//   </div>
// );

// export function ChatProvider() {
//   const [isOpen, setIsOpen] = useState(false);
//   const [isFullScreen, setIsFullScreen] = useState(false);
//   const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
//   const [input, setInput] = useState('');
//   const [isLoading, setIsLoading] = useState(false);

//   const pathname = usePathname();
//   const isEmbedPage = pathname ? pathname.startsWith('/embed') : false;
//   const scrollRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (isEmbedPage) {
//       setIsOpen(true);
//     }
//   }, [isEmbedPage]);

//   useEffect(() => {
//     if (scrollRef.current) {
//       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
//     }
//   }, [messages, isLoading]);


//   const handleSend = async () => {
//     if (!input.trim()) return;

//     const userMessage = { role: 'user' as const, content: input };
//     setMessages(prev => [...prev, userMessage]);
//     setInput('');
//     setIsLoading(true);

//     try {
//       const res = await fetch('/api/ask', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ question: input }),
//       });

//       if (!res.ok) {
//         // Clone the response to be able to read it multiple times
//         const resClone = res.clone();
//         let errorDetails = `Request failed with status ${res.status}`;
//         try {
//           const errorData = await resClone.json();
//           errorDetails = errorData.error || errorDetails;
//         } catch (e) {
//           // If parsing JSON fails, fall back to the text body
//           errorDetails = await res.text();
//         }
//         throw new Error(errorDetails);
//       }
      
//       const data = await res.json();
      
//       // Log context to the web console
//       if (data.context) {
//         console.log('--- Context from Server ---');
//         console.log(data.context);
//         console.log('---------------------------');
//       }

//       const assistantMessage = { role: 'assistant' as const, content: data.answer };
//       setMessages(prev => [...prev, assistantMessage]);

//     } catch (error: any) {
//       const errorMessage = { role: 'assistant' as const, content: `Sorry, something went wrong: ${error.message}` };
//       setMessages(prev => [...prev, errorMessage]);
//     } finally {
//       setIsLoading(false);
//     }
//   };
  
//   return (
//     <>
//       {isOpen ? (
//         <ChatInterface
//           onClose={() => setIsOpen(false)}
//           isFullScreen={isFullScreen}
//           onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
//           messages={messages}
//           input={input}
//           onInputChange={(e) => setInput(e.target.value)}
//           onSend={handleSend}
//           isLoading={isLoading}
//           scrollRef={scrollRef}
//         />
//       ) : (
//         !isEmbedPage && <ChatBubble onClick={() => setIsOpen(true)} />
//       )}
//     </>
//   );
// }


'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, Maximize, Minimize, User, X } from 'lucide-react';
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
  debugContext?: string; // raw combined context from server
};

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
  expandedContextIds,
  onToggleContextForMessage,
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
  expandedContextIds: string[];
  onToggleContextForMessage: (id: string) => void;
}) => {
  // Wider bubbles in full screen
  const bubbleWidthClass = isFullScreen
    ? 'max-w-[80%]'
    : 'max-w-xs md:max-w-md lg:max-w-lg';

  return (
    <div
      className={`fixed transition-all duration-300 ${
        isFullScreen ? 'inset-0' : 'bottom-0 right-0 w-full max-w-md h-[70vh]'
      } m-0 z-50`}
    >
      <Card
        className={`flex flex-col h-full bg-card/80 backdrop-blur-sm border-border/50 ${
          isFullScreen ? 'rounded-none' : 'rounded-t-lg'
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
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent
          ref={scrollRef}
          className="flex-grow overflow-y-auto p-4 space-y-4"
        >
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground">
              Ask a question to get started.
            </div>
          )}

          {messages.map((message) => {
            const isExpanded = expandedContextIds.includes(message.id);

            return (
              <div
                key={message.id}
                className={`flex flex-col gap-1 ${
                  message.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-end gap-2">
                  {message.role === 'assistant' && (
                    <Bot className="h-8 w-8 text-primary" />
                  )}
                  <div
                    className={`${bubbleWidthClass} rounded-lg px-4 py-2 text-base ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    <LinkedText text={message.content} />
                  </div>
                  {message.role === 'user' && (
                    <User className="h-8 w-8 text-accent-foreground" />
                  )}
                </div>

                {/* Sources (assistant only) */}
                {message.role === 'assistant' &&
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

                      {/* "Why these sources?" explanation */}
                      <p className="text-[11px] opacity-80">
                        These sources were selected as the most relevant
                        matches to your question among documents from{' '}
                        <code>deepfunding.ai</code>,{' '}
                        <code>community.deepfunding.ai</code>, and{' '}
                        <code>df-manual.github.io</code>.
                      </p>
                    </div>
                  )}

                {/* Per-message debug raw context (assistant only) */}
                {message.role === 'assistant' && message.debugContext && (
                  <div className="ml-10 mt-1 max-w-[90%]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => onToggleContextForMessage(message.id)}
                    >
                      {isExpanded ? 'Hide context' : 'Show context'}
                    </Button>
                    {isExpanded && (
                      <div className="mt-1 text-[11px] text-muted-foreground bg-muted/60 border border-dashed rounded-md p-2 overflow-x-auto">
                        <div className="font-semibold mb-1">Raw context:</div>
                        <pre className="whitespace-pre-wrap">
                          {message.debugContext}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
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
        </CardContent>

        <CardFooter className="p-4 border-t">
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
  const [expandedContextIds, setExpandedContextIds] = useState<string[]>([]);

  const pathname = usePathname();
  const isEmbedPage = pathname ? pathname.startsWith('/embed') : false;
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const toggleContextForMessage = (id: string) => {
    setExpandedContextIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

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
        content: data.answer,
        sources,
        debugContext: data.context ?? undefined,
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
          expandedContextIds={expandedContextIds}
          onToggleContextForMessage={toggleContextForMessage}
        />
      ) : (
        !isEmbedPage && <ChatBubble onClick={() => setIsOpen(true)} />
      )}
    </>
  );
}
