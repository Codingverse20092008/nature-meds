import { AnimatePresence, motion } from 'framer-motion';
import { Bot, MessageSquareHeart, SendHorizonal, Sparkles, Stethoscope, X, User, Minus } from 'lucide-react';
import { useMemo, useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { formatCurrencyINR, getCategoryLabel } from '../lib/catalog';
import { useAiChat } from '../lib/queries';
import type { AiChatResponse } from '../lib/types';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  payload?: AiChatResponse;
};

const starterQuestions = [
  'Best medicine for cold?',
  'Show vitamins',
  'Which medicines need a prescription?',
];

export function MedCoachWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'assistant-welcome',
      role: 'assistant',
      content:
        'Nature Med Coach can help you explore products from your pharmacy database. I provide general product guidance only, and I always recommend checking with a doctor.',
    },
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiChat = useAiChat();

  const suggestions = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((entry) => entry.role === 'assistant' && entry.payload?.suggestions?.length);
    return lastAssistant?.payload?.suggestions ?? starterQuestions;
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [messages, open]);

  async function submit(nextMessage: string) {
    const trimmed = nextMessage.trim();
    if (!trimmed || aiChat.isPending) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
      },
    ]);
    setMessage('');

    try {
      const response = await aiChat.mutateAsync(trimmed);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.answer,
          payload: response,
        },
      ]);
    } catch (error) {
      const nextError =
        error instanceof Error ? error.message : 'Nature Med Coach could not respond right now.';
      toast.error(nextError);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content:
            "I couldn't complete that request right now. Please try again in a moment. Consult a doctor for medical advice.",
        },
      ]);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end">
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="mb-4 flex flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white/95 shadow-[0_40px_100px_rgba(0,0,0,0.15)] backdrop-blur-xl
                       w-[calc(100vw-2.5rem)] max-w-[400px] h-[70vh] max-h-[650px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-brand-50 bg-[linear-gradient(135deg,rgba(25,125,255,0.08),rgba(22,166,121,0.1))] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-brand-600 text-white shadow-brand-200 shadow-lg">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-900 leading-tight">Nature Med Coach</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="size-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-green-600">Online now</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-2 text-ink-400 hover:text-ink-600 hover:bg-ink-50 rounded-xl transition"
                >
                  <Minus size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-2 text-ink-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide space-y-6">
              {messages.map((entry) => (
                <div key={entry.id} className={`flex w-full ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[85%] ${entry.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-full text-white ${entry.role === 'user' ? 'bg-ink-800' : 'bg-brand-500 shadow-md shadow-brand-100'}`}>
                      {entry.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div
                      className={
                        entry.role === 'user'
                          ? 'rounded-[20px] rounded-tr-none bg-ink-900 px-4 py-3 text-sm leading-6 text-white shadow-xl'
                          : 'rounded-[20px] rounded-tl-none bg-surface-50 px-4 py-3 text-sm leading-6 text-ink-800 border border-surface-100'
                      }
                    >
                      <p className="whitespace-pre-line">{entry.content}</p>

                      {entry.payload?.references?.length ? (
                        <div className="mt-4 space-y-3 rounded-2xl border border-brand-100/50 bg-white/60 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-600 flex items-center gap-2">
                            <Sparkles size={10} /> Matching catalogs
                          </p>
                          {entry.payload.references.slice(0, 3).map((product) => (
                            <Link 
                              key={`${entry.id}-${product.slug}`} 
                              to={`/products/${product.slug}`} 
                              className="block group rounded-xl bg-white border border-surface-100 p-2.5 transition hover:border-brand-200 hover:shadow-md"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate font-bold text-ink-900 group-hover:text-brand-600">{product.name}</p>
                                  <p className="text-[10px] text-ink-500">{getCategoryLabel(product.category)}</p>
                                </div>
                                <span className="text-xs font-bold text-ink-900">{formatCurrencyINR(product.price)}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : null}

                      {entry.payload?.disclaimer ? (
                        <div className="mt-3 rounded-xl bg-amber-50/50 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-800 border border-amber-100/50">
                          {entry.payload.disclaimer}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}

              {aiChat.isPending && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white shadow-md shadow-brand-100">
                      <Bot size={14} />
                    </div>
                    <div className="rounded-[20px] rounded-tl-none bg-brand-50/50 px-4 py-3 text-sm text-brand-700 border border-brand-100">
                      <div className="flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-brand-500 animate-bounce" />
                        <span className="size-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:150ms]" />
                        <span className="size-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:300ms]" />
                        <span className="ml-1 text-xs font-medium">Med Coach is typing...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className="border-t border-surface-100 bg-white px-5 py-5">
              <div className="mb-4 flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => submit(suggestion)}
                    className="rounded-full border border-brand-100 bg-brand-50/30 px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-500 hover:text-white"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submit(message);
                }}
                className="flex items-center gap-2 rounded-[20px] bg-surface-50 p-1 pl-4 border border-surface-100 transition-within:border-brand-300 transition-within:ring-4 transition-within:ring-brand-50"
              >
                <input
                  type="text"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ask any health question..."
                  className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-ink-400"
                />
                <button 
                  type="submit" 
                  disabled={aiChat.isPending || !message.trim()} 
                  className="flex size-10 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg transition hover:bg-brand-700 disabled:opacity-50 disabled:grayscale"
                >
                  <SendHorizonal size={18} />
                </button>
              </form>

              <div className="mt-4 flex items-start gap-2 text-[10px] leading-relaxed text-ink-400">
                <Stethoscope size={12} className="mt-0.5 shrink-0 text-brand-600" />
                <p>Grounded guidance only. I am not a doctor. I recommend checking professional advice for treatment.</p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((current) => !current)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-3 rounded-full bg-brand-600 px-6 py-4 text-white shadow-[0_20px_50px_rgba(25,125,255,0.3)] transition hover:bg-brand-700 sm:px-6"
      >
        <div className="relative">
          {open ? <Minus size={22} /> : <MessageSquareHeart size={22} />}
          {!open && <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-brand-600 bg-green-500" />}
        </div>
        <span className="font-bold tracking-tight">{open ? 'Minimize' : 'Ask Med Coach'}</span>
      </motion.button>
    </div>
  );
}

