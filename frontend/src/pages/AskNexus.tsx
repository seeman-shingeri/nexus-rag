import React, { useState } from 'react';
import { 
  MessageSquareCode, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  BookOpen, 
  ExternalLink,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { RAGAnswer, Citation } from '../types';
import { api } from '../services/api';

interface Message {
  id: string;
  sender: 'user' | 'nexus';
  text: string;
  timestamp: string;
  ragResult?: RAGAnswer;
}

export const AskNexus: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'nexus',
      text: 'NEXUS Multimodal Knowledge Engine ready. Ask any question regarding facility safety protocols, compliance standards, zone restrictions, or past incident responses.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    'What is the procedure for a chemical spill near machinery?',
    'What clearance is required to enter the Chemical Storage Vault Zone B?',
    'What are the mandatory PPE requirements in Zone A?',
    'What is the egress corridor clearance policy for Zone D?',
  ];

  const handleSend = async (questionText: string) => {
    if (!questionText.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: questionText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const result = await api.queryRAG(questionText);
      const nexusMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'nexus',
        text: result.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ragResult: result,
      };
      setMessages((prev) => [...prev, nexusMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'nexus',
        text: 'Communication error with Knowledge RAG backend. Please verify backend connection.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-[#0d1527] border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-950/60 border border-violet-500/50 flex items-center justify-center shadow-glow-violet">
            <MessageSquareCode className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <span>Ask NEXUS — Grounded Safety Q&A</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                ZERO HALLUCINATION GUARANTEE
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Retrieves, verifies, and cites standard operating procedures from the compliance database.
            </p>
          </div>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 rounded-2xl bg-[#0d1527]/70 border border-slate-800 p-5 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mb-1 px-1">
              <span>{msg.sender === 'user' ? 'OPERATOR' : 'NEXUS COGNITIVE CORE'}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            <div
              className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-cyan-950/40 border border-cyan-800 text-cyan-100 rounded-tr-none'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-lg'
              }`}
            >
              {msg.text}

              {/* Security Alert if prompt injection detected */}
              {msg.ragResult?.security_flag && (
                <div className="mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>Security Audit Flag: System prompt overrides are prohibited and logged.</span>
                </div>
              )}

              {/* Insufficient Evidence Warning */}
              {msg.ragResult?.insufficient_evidence && (
                <div className="mt-3 p-3 rounded-xl bg-amber-950/50 border border-amber-800/80 text-amber-300 text-xs flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 flex-shrink-0" />
                  <span>No matching compliance documents found. NEXUS refuses to invent safety answers.</span>
                </div>
              )}

              {/* Citations Box */}
              {msg.ragResult?.citations && msg.ragResult.citations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1.5 text-violet-400 font-bold">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>VERIFIED CITATIONS ({msg.ragResult.citations.length})</span>
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      {(msg.ragResult.confidence * 100).toFixed(0)}% Confidence
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {msg.ragResult.citations.map((cite, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono space-y-1"
                      >
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="font-semibold text-cyan-300 truncate">{cite.source}</span>
                          <span className="text-[10px] text-slate-500">
                            Page/Sec {cite.page ?? '1'} • Score: {(cite.relevance_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-[11px] font-sans text-slate-400 italic line-clamp-2">
                          "{cite.excerpt}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col items-start">
            <div className="text-[10px] font-mono text-slate-500 mb-1 px-1">NEXUS COGNITIVE CORE • QUERYING</div>
            <div className="rounded-2xl rounded-tl-none bg-slate-900 border border-slate-800 p-4 text-xs font-mono text-cyan-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Synthesizing grounded citations across safety manuals...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Starters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
        <span className="text-slate-500 text-[11px] uppercase flex-shrink-0">PROMPT STARTERS:</span>
        {samplePrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            disabled={loading}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 transition text-left"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputValue);
        }}
        className="flex items-center gap-3 p-2 rounded-2xl bg-[#0d1527] border border-slate-800"
      >
        <input
          type="text"
          placeholder="Ask about compliance procedures, hazard response, or historical incidents..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-sans"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || loading}
          className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-mono text-xs font-bold tracking-wider shadow-glow-cyan transition flex items-center gap-2"
        >
          <span>TRANSMIT</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
