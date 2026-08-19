"use client";

import { useEffect, useState } from "react";
import { 
  ExternalLink, 
  RefreshCw, 
  Search, 
  Flame, 
  Sparkles, 
  Copy, 
  Check,
  Bot
} from "lucide-react";

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [aiDraft, setAiDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      const items = data.leads || [];
      setLeads(items);
      if (items.length > 0) {
        setSelectedLead(items[0]);
        generateAiReply(items[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateAiReply = async (lead) => {
    if (!lead) return;
    setIsGenerating(true);
    setAiDraft("");
    try {
      const res = await fetch("/api/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: lead.title,
          body: lead.body,
          author: lead.author,
          source: lead.source
        })
      });
      const data = await res.json();
      setAiDraft(data.reply || "Kunne ikke generere svarudkast.");
    } catch (e) {
      console.error(e);
      setAiDraft("Fejl under generering af svar.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleSelectLead = (lead) => {
    setSelectedLead(lead);
    generateAiReply(lead);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSource = filterSource === "ALL" || lead.source.toLowerCase().includes(filterSource.toLowerCase());
    const matchesSearch = lead.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          lead.body.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSource && matchesSearch;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(aiDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              UseNeedLens <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Radar</span>
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">AI-Powered Intent & Lead Outreach for UseHookLens</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLeads}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Opdater Feeds
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-400">Total Leads Fundet</div>
          <div className="text-2xl font-bold text-white mt-1">{leads.length}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-400">Høj Købsintention (🔥 High)</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {leads.filter(l => l.intent === "High").length}
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-400">AI Outreach Engine</div>
          <div className="text-sm font-semibold text-purple-400 mt-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Gemini Flash 3.6 Active
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Søg i emner, fejlbeskeder eller teknologier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
          />
        </div>
        <div className="flex gap-2">
          {["ALL", "Stack Overflow", "Dev.to", "Hacker News"].map((source) => (
            <button
              key={source}
              onClick={() => setFilterSource(source)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition ${
                filterSource === source
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
              }`}
            >
              {source}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800/60">
              Indhenter leads fra Stack Overflow, Dev.to og Hacker News...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800/60">
              Ingen leads matchede dine søgekriterier.
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const isSelected = selectedLead?.id === lead.id;
              return (
                <div
                  key={lead.id}
                  onClick={() => handleSelectLead(lead)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? "bg-slate-800/90 border-blue-500 ring-1 ring-blue-500/50"
                      : "bg-slate-900/50 border-slate-800/70 hover:bg-slate-900 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {lead.source}
                      </span>
                      {lead.intent === "High" && (
                        <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Flame className="w-3 h-3" /> High Intent
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-100 mb-1 leading-snug">
                    {lead.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {lead.body || "Ingen forhåndsvisning tilgængelig."}
                  </p>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <span className="text-[11px] text-slate-500">Af @{lead.author}</span>
                    <a
                      href={lead.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                    >
                      Åbn tråd <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="lg:col-span-5">
          <div className="sticky top-6 bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur">
            {selectedLead ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> AI Outreach Draft
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generateAiReply(selectedLead)}
                      disabled={isGenerating}
                      className="p-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition"
                      title="Regenerér svar"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                    </button>
                    <button
                      onClick={handleCopy}
                      disabled={isGenerating || !aiDraft}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition disabled:opacity-50"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Kopieret!" : "Kopiér"}
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-slate-400 mb-1">Valgt Spørgsmål:</h4>
                  <p className="text-sm font-semibold text-slate-200 line-clamp-2">{selectedLead.title}</p>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-purple-400" /> Gemini Analyse & Svar:
                  </h4>
                  <div className="min-h-[160px] p-4 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {isGenerating ? (
                      <div className="flex items-center gap-2 text-slate-500 py-8 justify-center">
                        <Sparkles className="w-4 h-4 animate-spin text-purple-400" />
                        Analyserer tråd og formulerer svar...
                      </div>
                    ) : (
                      aiDraft
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href={selectedLead.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 transition"
                  >
                    Gå direkte til opslaget <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                Vælg et lead fra listen for at generere et AI-svarudkast.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
