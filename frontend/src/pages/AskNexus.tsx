import React, { useState } from 'react';
import { 
  Send, 
  Search, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Info,
  Clock,
  Sparkles,
  RefreshCw
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
      text: 'Compliance knowledge retrieval engine active. You can query facility safety procedures, emergency protocols, restricted zone boundaries, or approved PPE standards.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    'What is the procedure for deploying containment booms around a chemical spill?',
    'What clearance level is required to enter the Chemical Storage Vault Zone 2?',
    'What are the mandatory PPE requirements in the Main Fabrication Floor?',
    'What is the emergency evacuation corridor policy for Zone 4?',
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
      const result = await api.queryRAG(questionText, zoneFilter || undefined);
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
        text: 'Unable to communicate with the document retrieval engine. Please ensure the backend is reachable.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] space-y-3">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Safety & Compliance Knowledge Search</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Vectorized RAG retrieval over standard operating procedures and compliance documentation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-slate-500">ZONE SCOPE:</label>
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="px-2 py-1 rounded border border-slate-200 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">All Monitored Zones</option>
            <option value="1">Zone 1: Fabrication</option>
            <option value="2">Zone 2: Chemical Vault</option>
            <option value="3">Zone 3: Loading Bay</option>
            <option value="4">Zone 4: Server Hub</option>
          </select>
        </div>
      </div>

      {/* Conversation / Query Stream */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-1.5">
            {msg.sender === 'user' ? (
              <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 max-w-2xl ml-auto text-xs space-y-1">
                <div className="flex justify-between items-center font-mono text-[10px] text-blue-700 font-semibold">
                  <span>INVESTIGATOR QUERY</span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="text-slate-900 font-medium">{msg.text}</p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm max-w-3xl mr-auto text-xs space-y-3">
                <div className="flex justify-between items-center font-mono text-[10px] text-slate-500 pb-2 border-b border-slate-100">
                  <span className="font-semibold text-slate-700 uppercase">Grounded Response</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div className="text-slate-800 leading-relaxed font-sans text-xs whitespace-pre-line">
                  {msg.text}
                </div>

                {/* Evidence citations */}
                {msg.ragResult && msg.ragResult.citations && msg.ragResult.citations.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                      Retrieved Source Citations:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.ragResult.citations.map((cite, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded border border-slate-200 bg-slate-50/80 text-[11px] font-mono space-y-1"
                        >
                          <div className="flex items-center justify-between font-semibold text-slate-800 truncate">
                            <span className="truncate">{cite.source}</span>
                            <span className="text-blue-700 ml-2">Score: {cite.relevance_score?.toFixed(2) ?? '1.00'}</span>
                          </div>
                          {cite.excerpt && (
                            <p className="text-slate-600 line-clamp-2 text-[10px] leading-tight">
                              {cite.excerpt}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insufficient Evidence Warning if flagged */}
                {msg.ragResult?.insufficient_evidence && (
                  <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-mono flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
                    <span>Insufficient evidence in ingested documents. Generative fabrication withheld.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 max-w-sm text-xs font-mono text-slate-500 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>Retrieving vector embeddings and synthesizing grounded response...</span>
          </div>
        )}
      </div>

      {/* Suggested Prompts & Input Bar */}
      <div className="flex-shrink-0 space-y-2 pt-2 border-t border-slate-200 bg-slate-50">
        {messages.length <= 2 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-mono text-slate-500">Suggested:</span>
            {samplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium transition shadow-sm text-left truncate max-w-xs"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputValue);
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Ask a question about facility safety procedures, hazardous storage, or PPE rules..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading}
              className="w-full pl-3 pr-3 py-2 rounded border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white shadow-sm font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold tracking-wide transition shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </form>
      </div>
    </div>
  );
};
