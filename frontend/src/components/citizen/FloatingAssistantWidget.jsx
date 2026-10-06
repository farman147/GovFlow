import { Bot, MessageSquare, Send, Sparkles, X, ChevronUp, Ticket } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { queryAssistant } from '../../api/assistantService';

const quickPrompts = [
  "Email for Vehicle Registration?",
  "Documents for DL Renewal?",
  "Best time to visit RTO (TFT)?",
  "Fee for Income Certificate?"
];

export default function FloatingAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: "👋 Hi! Need help with documents, fees, staff contacts, or TFT demand forecasts? Ask me below!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText) => {
    const q = String(queryText || input).trim();
    if (!q || loading) return;

    const userMsg = { id: Date.now(), sender: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await queryAssistant({ query: q });
      const answer = res.data?.data?.answer || "Here is the information from GovFlow.";
      const assistantMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: answer,
        action: res.data?.data?.action,
        tft: res.data?.data?.tftForecast
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: "I was unable to retrieve data right now. Please try again or open the full Civic AI Assistant page."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 rounded-full bg-emerald-600 px-4 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:bg-emerald-500 hover:scale-105"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
            <Sparkles size={14} className="text-white animate-pulse" />
          </div>
          <span className="text-sm">Ask Civic AI</span>
        </button>
      ) : (
        <div className="flex h-[500px] w-[350px] sm:w-[380px] flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-white/20 p-1.5">
                <Bot size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold leading-tight">Civic AI Assistant</h4>
                <p className="text-[10px] text-emerald-100">Live DB & TFT Forecasts</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-white/80 transition hover:bg-white/20 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 shadow-2xs ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'border border-slate-200 bg-white text-slate-800 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                  {m.tft && (
                    <div className="mt-2 rounded-xl bg-indigo-50 border border-indigo-100 p-2 text-[11px] text-indigo-900">
                      <p className="font-semibold">🤖 TFT Best Visit: {m.tft.lowDemandHour}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-500 flex items-center gap-2 shadow-2xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="border-t border-slate-100 bg-white px-3 py-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(qp)}
                  className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition"
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-slate-100 bg-white p-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about documents, emails, TFT..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="rounded-xl bg-emerald-600 p-2 text-white transition hover:bg-emerald-500 disabled:bg-slate-200 shadow-2xs"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
