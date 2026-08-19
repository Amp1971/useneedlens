"use client";

import { useEffect, useState } from "react";
import { 
  Radio, 
  ExternalLink, 
  RefreshCw, 
  Search, 
  Flame, 
  Sparkles, 
  Copy, 
  Check, 
  Filter 
} from "lucide-react";

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      setLeads(data.leads || []);
      if (data.leads?.length > 0) {
        setSelectedLead(data.leads[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filteredLeads = leads.filter(lead => {
    const matchesSource = filterSource === "ALL" || lead.source.toLowerCase().includes(filterSource.toLowerCase());
    const matchesSearch = lead.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          lead.body.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSource && matchesSearch;
  });

  const getAiDraft = (lead) => {
    if (!lead) return "";
    return `Hey @${lead.author} – saw your post about "${lead.title.slice(0, 45)}...". 
If you're debugging webhook delivery issues or retries in production, having real-time payload logging and replay capabilities makes isolating the root cause a lot simpler. We built UseHookLens specifically for monitoring and intercepting incoming webhooks with full observability. Hope this helps point you in the right direction!`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getAiDraft(selectedLead));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      {/* Top Header */}
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
          <p className="text-sm text-slate-400 mt-1">Social Intent & Developer Lead Ingestion Dashboard</p>
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

      {/* Metrics Row */}
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
          <div className="text-xs font-medium text-slate-400">Aktive Kilder</div>
          <div className="text-sm font-semibold text-emerald-400 mt-2">Stack Overflow, Dev.to, HN</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Søg i leads, emner eller søgeord..."
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

      {/* Main 2-Column Split */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Lead List */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800/60">
              Indhenter leads fra Stack Overflow, Dev.to og Hacker News...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800/60">
              Ingen leads matchede dine filtre.
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const isSelected = selectedLead?.id === lead.id;
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
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
                      Åbn kilde <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: AI Response & Lead Details */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur">
            {selectedLead ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-400" /> AI Outreach Assistant
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Kopieret!" : "Kopiér svar"}
                  </button>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-slate-400 mb-1">Valgt Lead:</h4>
                  <p className="text-sm font-semibold text-slate-200 line-clamp-2">{selectedLead.title}</p>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-slate-400 mb-1.5">Genereret Svarudkast:</h4>
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {getAiDraft(selectedLead)}
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href={selectedLead.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition shadow-lg shadow-blue-600/20"
                  >
                    Gå til tråd for at svare <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                Vælg et lead fra listen for at se detaljer og udkast.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
