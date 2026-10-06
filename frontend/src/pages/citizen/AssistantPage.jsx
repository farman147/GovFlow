import {
  ArrowRight,
  BarChart2,
  Bot,
  CheckCircle2,
  RefreshCw,
  Send,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react';

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getApiErrorMessage } from '../../api/axios';
import {
  getAssistantInsights,
  queryAssistant,
} from '../../api/assistantService';
import { getServices } from '../../api/serviceService';
import { createToken } from '../../api/tokenService';

import DashboardLayout from '../../components/citizen/DashboardLayout';
import ConfirmDialog from '../../components/citizen/ConfirmDialog';

const initialSuggestions = [
  'What is the email for Vehicle Registration?',
  'What documents do I need for Driving License Renewal?',
  'When is the best time to visit RTO?',
  'What is the fee for Income Certificate?',
  'Check live queue status for all services',
  'Eligibility for Land Record Request',
  'What is the email for Birth Certificate?',
];

export default function AssistantPage() {
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: `Hello! I am your GovFlow Civic AI Assistant.

I can help you find information about government services, required documents, fees, eligibility, live queues, appointments and service information.

How can I help you today?`,
      quickPrompts: initialSuggestions,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');

  const [insights, setInsights] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tokenActionService, setTokenActionService] = useState(null);
  const [creatingToken, setCreatingToken] = useState(false);

  const [errorBanner, setErrorBanner] = useState('');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, loading]);

  useEffect(() => {
    loadContextData();
  }, []);

  const loadContextData = async () => {
    try {
      const [serviceRes, insightRes] = await Promise.all([
        getServices().catch(() => ({
          data: {
            data: {
              services: [],
            },
          },
        })),

        getAssistantInsights().catch(() => ({
          data: {
            data: null,
          },
        })),
      ]);

      setServices(serviceRes.data?.data?.services || []);
      setInsights(insightRes.data?.data || null);
    } catch {
      // Non-blocking
    }
  };

  const handleSendMessage = async (textToSend) => {
    const query = String(textToSend || input).trim();

    if (!query || loading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setErrorBanner('');

    try {
      const res = await queryAssistant({
        query,
        serviceId: selectedServiceId || null,
      });

      const responseData = res.data?.data;

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text:
          responseData?.answer ||
          'I have analyzed your request.',
        service: responseData?.service || null,
        tftForecast: responseData?.tftForecast || null,
        liveQueue: responseData?.liveQueue || null,
        quickPrompts: responseData?.quickPrompts || [],
        action: responseData?.action || null,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      if (responseData?.service?._id) {
        setSelectedServiceId(responseData.service._id);
      }

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMsg = getApiErrorMessage(
        err,
        'Unable to get an answer from the AI assistant right now.'
      );

      setErrorBanner(errorMsg);

      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'assistant',
          text: `Error: ${errorMsg}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAction = (service) => {
    if (!service?._id) return;

    setTokenActionService(service);
    setConfirmOpen(true);
  };

  const handleConfirmCreateToken = async () => {
    if (!tokenActionService?._id) return;

    try {
      setCreatingToken(true);

      const res = await createToken({
        serviceId: tokenActionService._id,
        priority: 'normal',
      });

      const tokenId = res.data?.data?.token?._id;

      setConfirmOpen(false);
      setTokenActionService(null);

      if (tokenId) {
        navigate(`/citizen/tokens/${tokenId}`);
      }
    } catch (err) {
      setErrorBanner(
        getApiErrorMessage(err, 'Unable to generate token.')
      );

      setConfirmOpen(false);
    } finally {
      setCreatingToken(false);
    }
  };

  const clearChat = () => {
    setSelectedServiceId('');
    setErrorBanner('');

    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Conversation cleared.

How can I help you with GovFlow services today?`,
        quickPrompts: initialSuggestions,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
  };

  const renderFormattedText = (text) => {
    if (!text) return null;

    const lines = text.split('\n');

    return (
      <div className="space-y-2 text-sm leading-6">
        {lines.map((line, index) => {
          const trimmed = line.trim();

          if (!trimmed) {
            return <div key={index} className="h-1" />;
          }

          if (trimmed.startsWith('### ')) {
            return (
              <h4
                key={index}
                className="mt-3 text-sm font-bold text-slate-900"
              >
                {trimmed.replace('### ', '')}
              </h4>
            );
          }

          if (
            trimmed.startsWith('- ') ||
            trimmed.startsWith('* ')
          ) {
            return (
              <div
                key={index}
                className="flex items-start gap-2"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />

                <span className="text-slate-700">
                  {trimmed.substring(2)}
                </span>
              </div>
            );
          }

          if (/^\d+\.\s/.test(trimmed)) {
            const match = trimmed.match(/^(\d+)\.\s/);

            return (
              <div
                key={index}
                className="flex items-start gap-2"
              >
                <span className="font-bold text-emerald-600">
                  {match?.[1]}.
                </span>

                <span className="text-slate-700">
                  {trimmed.replace(/^\d+\.\s/, '')}
                </span>
              </div>
            );
          }

          return (
            <p
              key={index}
              className="whitespace-pre-wrap text-slate-700"
            >
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <DashboardLayout
      title="Civic AI Assistant"
      subtitle="Ask questions about government services and get information from GovFlow."
    >
      <div className="space-y-6">

        {/* Error */}
        {errorBanner && (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{errorBanner}</span>

            <button
              type="button"
              onClick={() => setErrorBanner('')}
              className="shrink-0 rounded-lg p-1 hover:bg-red-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Header Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-100/60 blur-3xl" />

          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
                <Bot size={28} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    GovFlow Civic AI
                  </h2>

                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    Online
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Your assistant for government services.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={clearChat}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <RefreshCw size={15} />
              Clear conversation
            </button>
          </div>
        </div>

        {/* AI Insight */}
        {insights && (
          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-600 p-2 text-white">
                  <Sparkles size={19} />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Live service insight
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {insights.summary}
                  </p>
                </div>
              </div>

              {insights.lowestWaitService && (
                <button
                  type="button"
                  onClick={() =>
                    handleSendMessage(
                      `Tell me about ${insights.lowestWaitService.name}`
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50"
                >
                  {insights.lowestWaitService.name}
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Service Selector */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Ask about a specific service
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                Select a service or let the assistant detect it automatically.
              </p>
            </div>

            <select
              value={selectedServiceId}
              onChange={(e) =>
                setSelectedServiceId(e.target.value)
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:bg-white"
            >
              <option value="">
                All Services — Auto Detect
              </option>

              {services.map((service) => (
                <option
                  key={service._id}
                  value={service._id}
                >
                  {service.name} ({service.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chat */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          {/* Chat Header */}
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Sparkles size={19} />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-900">
                  Ask GovFlow
                </p>

                <p className="text-xs text-slate-500">
                  Services • Documents • Fees • Eligibility • Queue information
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="max-h-[580px] min-h-[500px] space-y-6 overflow-y-auto p-5 sm:p-7">

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender === 'user'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >

                {/* Assistant Icon */}
                {msg.sender === 'assistant' && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                    <Bot size={18} />
                  </div>
                )}

                <div
                  className={`max-w-2xl ${
                    msg.sender === 'user'
                      ? 'rounded-2xl rounded-br-md bg-emerald-600 text-white'
                      : 'rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50'
                  } p-5`}
                >

                  {/* Message Header */}
                  <div className="mb-3 flex items-center justify-between gap-6">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        msg.sender === 'user'
                          ? 'text-emerald-100'
                          : 'text-emerald-700'
                      }`}
                    >
                      {msg.sender === 'user'
                        ? 'You'
                        : 'Civic AI'}
                    </span>

                    <span
                      className={`text-[10px] ${
                        msg.sender === 'user'
                          ? 'text-emerald-100'
                          : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Message */}
                  {msg.sender === 'user' ? (
                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {msg.text}
                    </p>
                  ) : (
                    renderFormattedText(msg.text)
                  )}

                  {/* Live Queue */}
                  {msg.liveQueue && (
                    <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-4">

                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Status
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {msg.liveQueue.status}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Waiting
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {msg.liveQueue.waitingCount}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Est. Wait
                        </p>
                        <p className="mt-1 text-sm font-bold text-emerald-700">
                          ~{msg.liveQueue.estimatedWaitMinutes} min
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Counters
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {msg.liveQueue.availableCounters}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TFT Forecast */}
                  {msg.tftForecast && (
                    <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                      <div className="flex items-center gap-2">
                        <BarChart2
                          size={16}
                          className="text-indigo-600"
                        />

                        <span className="text-xs font-bold text-indigo-900">
                          Demand Forecast
                        </span>
                      </div>

                      <p className="mt-2 text-xs leading-5 text-slate-700">
                        {msg.tftForecast.summary}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.tftForecast.lowDemandHour && (
                          <span className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700">
                            Lower demand: {msg.tftForecast.lowDemandHour}
                          </span>
                        )}

                        {msg.tftForecast.peakHour && (
                          <span className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700">
                            Peak: {msg.tftForecast.peakHour}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Token Action */}
                  {msg.action && (
                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Ready to visit?
                        </p>

                        <p className="mt-0.5 text-[11px] text-slate-500">
                          You can take a live queue token.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleTriggerAction(
                            msg.service || {
                              _id: msg.action.serviceId,
                              name: msg.action.serviceName,
                            }
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        <Ticket size={14} />
                        Take Token
                      </button>
                    </div>
                  )}

                  {/* Quick Prompts */}
                  {msg.quickPrompts?.length > 0 && (
                    <div className="mt-5 border-t border-slate-200 pt-4">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Suggested questions
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {msg.quickPrompts.map((prompt, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() =>
                              handleSendMessage(prompt)
                            }
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <Bot size={18} />
                </div>

                <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:0.3s]" />

                    <span className="ml-2 text-xs text-slate-500">
                      GovFlow is processing your request...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 bg-slate-50/50 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-emerald-400"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                placeholder="Ask about a government service..."
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Send size={17} />
              </button>
            </form>

            <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-slate-400">
              <CheckCircle2 size={12} />
              GovFlow uses available service data to answer your questions.
            </div>
          </div>
        </div>
      </div>

      {/* Token Confirmation */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Create a token?"
        message={`You are about to take a live queue token for ${
          tokenActionService?.name || 'this service'
        }.`}
        confirmLabel="Take Token"
        onConfirm={handleConfirmCreateToken}
        onCancel={() => {
          setConfirmOpen(false);
          setTokenActionService(null);
        }}
        loading={creatingToken}
      />
    </DashboardLayout>
  );
}