import { AnimatePresence, motion } from 'framer-motion';
import { Bot, MessageSquareHeart, SendHorizonal, Sparkles, Stethoscope, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { formatCurrencyINR, getCategoryLabel } from '../lib/catalog';
import { useAiChat } from '../lib/queries';
import type { AiChatResponse } from '../lib/types';
import { useAuthStore } from '../store/authStore';

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
  const user = useAuthStore((state) => state.user);
  const aiChat = useAiChat();

  const suggestions = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((entry) => entry.role === 'assistant' && entry.payload?.suggestions?.length);
    return lastAssistant?.payload?.suggestions ?? starterQuestions;
  }, [messages]);

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
    <>
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-20 right-5 z-40 flex max-h-[80vh] w-[calc(100vw-1.5rem)] max-w-[420px] flex-col overflow-hidden rounded-[30px] border border-white/70 bg-white/90 shadow-[0_30px_80px_rgba(17,36,60,0.18)] backdrop-blur-2xl sm:w-[min(420px,calc(100vw-2.5rem))]"
          >
            <div className="border-b border-brand-100 bg-[linear-gradient(135deg,rgba(25,125,255,0.12),rgba(22,166,121,0.18))] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-brand-700">
                    <Sparkles size={13} />
                    Nature Med Coach
                  </div>
                  <h3 className="font-[var(--font-display)] text-xl font-semibold text-ink-900">
                    Safe product guidance, grounded in your pharmacy database
                  </h3>
                  <p className="mt-1 text-sm text-ink-600">
                    {user
                      ? `Signed in as ${user.firstName}. Recent preferences may help personalize suggestions.`
                      : 'Sign in to let Med Coach use your recent orders for better suggestions.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex size-10 items-center justify-center rounded-2xl border border-white/80 bg-white/80 text-ink-700"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.map((entry) => (
                <div key={entry.id} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={
                      entry.role === 'user'
                        ? 'max-w-[85%] rounded-[24px] rounded-br-md bg-brand-600 px-4 py-3 text-sm leading-6 text-white shadow-[0_16px_30px_rgba(25,125,255,0.22)]'
                        : 'max-w-[90%] rounded-[24px] rounded-bl-md bg-surface-50 px-4 py-3 text-sm leading-6 text-ink-800'
                    }
                  >
                    <p className="whitespace-pre-line">{entry.content}</p>

                    {entry.payload?.references?.length ? (
                      <div className="mt-4 space-y-2 rounded-[20px] border border-brand-100 bg-white/80 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Grounded medicines</p>
                        {entry.payload.references.slice(0, 4).map((product) => (
                          <div key={`${entry.id}-${product.slug}-${product.source}`} className="rounded-2xl bg-surface-50 px-3 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-ink-900">{product.name}</p>
                                <p className="mt-1 text-xs text-ink-500">
                                  {getCategoryLabel(product.category)} · {product.source === 'database' ? 'DB' : 'CSV'}
                                </p>
                              </div>
                              <span className="text-sm font-semibold text-brand-700">{formatCurrencyINR(product.price)}</span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-ink-600">
                              {product.description || 'No detailed description available in the internal dataset.'}
                            </p>
                            <p className="mt-2 text-[11px] font-medium text-ink-500">
                              {product.requiresPrescription ? 'Prescription required' : 'No prescription flag'} · Stock {product.stock}
                            </p>
                            {product.id > 0 ? (
                              <Link to={`/products/${product.slug}`} className="mt-3 inline-flex text-xs font-semibold text-brand-600">
                                View product
                              </Link>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {entry.payload?.disclaimer ? (
                      <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-800">
                        {entry.payload.disclaimer}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {aiChat.isPending ? (
                <div className="flex justify-start">
                  <div className="rounded-[24px] rounded-bl-md bg-surface-50 px-4 py-3 text-sm text-ink-700">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex size-2 animate-pulse rounded-full bg-brand-500" />
                      <span className="inline-flex size-2 animate-pulse rounded-full bg-brand-500 [animation-delay:120ms]" />
                      <span className="inline-flex size-2 animate-pulse rounded-full bg-brand-500 [animation-delay:240ms]" />
                      <span className="ml-2">Nature Med Coach is reviewing your internal medicine data…</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-brand-100 px-4 py-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => submit(suggestion)}
                    className="rounded-full bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
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
                className="flex items-end gap-3"
              >
                <div className="flex-1 rounded-[24px] border border-brand-100 bg-white px-4 py-3 shadow-[0_12px_24px_rgba(17,36,60,0.06)]">
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={2}
                    placeholder="Ask about medicines, categories, or product options..."
                    className="w-full resize-none bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-500"
                  />
                </div>
                <button type="submit" className="btn-primary h-[52px] px-4" disabled={aiChat.isPending}>
                  <SendHorizonal size={16} />
                  Send
                </button>
              </form>

              <div className="mt-3 flex items-start gap-2 rounded-2xl bg-surface-50 px-3 py-3 text-xs leading-5 text-ink-600">
                <Stethoscope size={14} className="mt-0.5 shrink-0 text-brand-600" />
                <p>Nature Med Coach offers general product guidance only. It does not diagnose, prescribe, or replace a doctor.</p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((current) => !current)}
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-3 rounded-full bg-[linear-gradient(135deg,#197dff,#16a679)] px-4 py-3 text-sm font-semibold text-white shadow-[0_22px_48px_rgba(25,125,255,0.32)] sm:px-5 sm:py-4"
      >
        {open ? <X size={18} /> : <MessageSquareHeart size={18} />}
        <span className="hidden sm:inline">{open ? 'Close coach' : 'Ask Nature Med Coach'}</span>
        <span className="sm:hidden"><Bot size={18} /></span>
      </motion.button>
    </>
  );
}
