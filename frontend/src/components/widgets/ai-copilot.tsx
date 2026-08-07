"use client";

import React, { useState } from "react";
import {
  Brain,
  Sparkles,
  Bot,
  MessageSquare,
  TrendingUp,
  ShieldCheck,
  Zap,
  ChevronRight,
  X,
  Send,
  AlertTriangle,
  HelpCircle,
  BarChart3,
  MapPin,
  Clock,
  Compass,
} from "lucide-react";

interface AiCopilotProps {
  initialContext?: string;
  bloodType?: string;
  hospitalName?: string;
}

interface AiQueryPreset {
  title: string;
  query: string;
  category: string;
  response: {
    answer: string;
    why: string[];
    metrics: { label: string; value: string; color: string }[];
  };
}

const PRESET_QUERIES: AiQueryPreset[] = [
  {
    title: "Why was Donor #1 ranked top candidate?",
    query: "Explain the AI donor ranking algorithm for the active O- emergency.",
    category: "AI Donor Ranking",
    response: {
      answer: "Donor Rajesh Kumar (O-) was ranked #1 with a match score of 98.4/100.",
      why: [
        "Exact ABO Match: O- universal donor compatible with target recipient.",
        "Proximity Matrix: Located 4.2 km away, calculated transit ETA of 12 minutes.",
        "High Trust Score: 98% historical response rate with zero no-shows across 14 past dispatches.",
        "Medical Eligibility: 104 days elapsed since last donation (passes standard 90-day AABB interval).",
      ],
      metrics: [
        { label: "ABO Compatibility", value: "100%", color: "text-emerald-400" },
        { label: "Proximity Score", value: "96%", color: "text-blue-400" },
        { label: "Trust Score", value: "98%", color: "text-purple-400" },
        { label: "No-Show Risk", value: "2.1%", color: "text-rose-400" },
      ],
    },
  },
  {
    title: "Predict regional blood shortage for next 7 days",
    query: "What is the 7-day inventory prediction and shortage risk for O- and B- blood groups?",
    category: "Blood Demand Forecast",
    response: {
      answer: "O- group is predicted to hit CRITICAL SHORTAGE within 48 hours in the Chennai Metro region.",
      why: [
        "Historical Demand Surge: 14-day request rate increased by 28% due to monsoon trauma admissions.",
        "Inventory Depletion Rate: Bank reserves currently at 12 units against a projected weekly demand of 34 units.",
        "Donor Cooldown Bottleneck: 62% of regional O- donors are currently in 90-day medical cooldown windows.",
        "Action Recommended: Trigger proactive SMS outreach to 18 eligible O- donors in adjacent sub-districts.",
      ],
      metrics: [
        { label: "Supply-Demand Ratio", value: "0.35 (Critical)", color: "text-rose-500" },
        { label: "Projected Demand", value: "34 Units", color: "text-amber-400" },
        { label: "Bank Inventory", value: "12 Units", color: "text-blue-400" },
        { label: "Deficit Window", value: "48 Hours", color: "text-rose-400" },
      ],
    },
  },
  {
    title: "Why pick Blood Bank over Donor Broadcast?",
    query: "Why did the system route to Central Red Cross Bank instead of broadcasting to donors?",
    category: "Optimal Bank Recommendation",
    response: {
      answer: "Bank fulfillment was selected because available unallocated stock meets 100% of the 4-unit request.",
      why: [
        "Zero Donor Disturbance: Direct courier pickup eliminates volunteer emergency pings.",
        "Guaranteed Latency: Bank dispatch courier transit takes 14 mins vs 35 mins average for donor mobilization.",
        "Verified Pathogen Testing: Bank units are already pre-screened and released for immediate transfusion.",
        "Cost Efficiency: Single courier leg reduces operational friction by 74%.",
      ],
      metrics: [
        { label: "Stock Coverage", value: "100%", color: "text-emerald-400" },
        { label: "Time Saved", value: "21 Mins", color: "text-blue-400" },
        { label: "Donor Disturbance", value: "0 Pings", color: "text-purple-400" },
        { label: "Audit Confidence", value: "99.9%", color: "text-emerald-400" },
      ],
    },
  },
  {
    title: "Predict donor no-show probability",
    query: "How does the AI compute no-show probability for candidate donors?",
    category: "No-Show Probability",
    response: {
      answer: "No-show probability is computed via a multi-factor logistic regression model.",
      why: [
        "Travel Distance Friction: Donors > 15 km away have a 3.4x higher no-show probability.",
        "Time of Day Factor: Night dispatches (10 PM - 6 AM) show a 18% reduction in acceptance rate.",
        "Historical Reliability: Past 5 dispatch responses weighted at 60% of total score.",
        "Weather/Traffic Penalty: Active rainfall increases estimated transit latency by 8 mins.",
      ],
      metrics: [
        { label: "Candidate No-Show", value: "4.2%", color: "text-emerald-400" },
        { label: "Distance Penalty", value: "+1.2%", color: "text-amber-400" },
        { label: "Time Factor", value: "Nominal", color: "text-blue-400" },
        { label: "Model Accuracy", value: "94.8%", color: "text-purple-400" },
      ],
    },
  },
];

export function SanguisAiCopilot({ initialContext }: AiCopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<AiQueryPreset>(PRESET_QUERIES[0]);
  const [customInput, setCustomInput] = useState("");
  const [messages, setMessages] = useState<
    Array<{ sender: "user" | "ai"; text: string; why?: string[]; metrics?: { label: string; value: string; color: string }[] }>
  >([
    {
      sender: "ai",
      text: "Sanguis XAI Engine active. Select a decision prompt below to audit WHY the AI made specific dispatch, ranking, or forecasting recommendations.",
      why: activePreset.response.why,
      metrics: activePreset.response.metrics,
    },
  ]);

  const handleSelectPreset = (preset: AiQueryPreset) => {
    setActivePreset(preset);
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: preset.query },
      {
        sender: "ai",
        text: preset.response.answer,
        why: preset.response.why,
        metrics: preset.response.metrics,
      },
    ]);
  };

  const handleCustomSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    const userText = customInput;
    setCustomInput("");

    setMessages((prev) => [
      ...prev,
      { sender: "user", text: userText },
      {
        sender: "ai",
        text: `AI Explanation for "${userText}": Based on spatial cascade telemetry, ABO compatibility scoring, and AABB medical interval rules.`,
        why: [
          "ABO Compatibility Protocol: Exact match or universal donor (O-) prioritisation applied.",
          "Spatial Cascade Haversine Grid: Distance mapped to 50km radius with real-time traffic multiplier.",
          "Starvation Wait-Time Correction: Requests > 2 hours receive +3 points/hr priority bump to prevent starvation.",
          "Verification Status Bonus: Hospital email verification adds +15 points fraud-screening proxy bonus.",
        ],
        metrics: [
          { label: "Decision Confidence", value: "97.6%", color: "text-emerald-400" },
          { label: "XAI Transparency", value: "100%", color: "text-purple-400" },
          { label: "Latency", value: "4.2s", color: "text-blue-400" },
        ],
      },
    ]);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs uppercase tracking-wider px-4 py-3 rounded-full shadow-2xl shadow-rose-950/60 border border-rose-400/30 transition-all hover:scale-105 group"
      >
        <Brain className="h-4.5 w-4.5 animate-pulse" />
        <span>Sanguis AI Copilot</span>
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
      </button>

      {/* Slide-out Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-lg bg-zinc-950 border-l border-zinc-800 h-full flex flex-col justify-between shadow-2xl text-zinc-50 font-mono relative">

            {/* Drawer Header */}
            <div className="p-4 border-b border-zinc-900 bg-zinc-950/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                  <Brain className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                    Sanguis XAI Decision Engine
                  </h2>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Explainable Healthcare AI · Transparency Audit</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Quick AI Decision Audit Presets */}
              <div>
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Audit AI Decisions (Select Query)</p>
                <div className="grid grid-cols-1 gap-2">
                  {PRESET_QUERIES.map((p) => (
                    <button
                      key={p.title}
                      onClick={() => handleSelectPreset(p)}
                      className={`text-left p-2.5 rounded-lg border transition-all ${
                        activePreset.title === p.title
                          ? "border-rose-500/50 bg-rose-500/10 text-rose-400"
                          : "border-zinc-850 bg-zinc-900/30 text-zinc-300 hover:bg-zinc-900/60"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                        <span>{p.category}</span>
                        <ChevronRight className="h-3 w-3" />
                      </div>
                      <p className="text-[10px] font-bold">{p.title}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversation Log */}
              <div className="space-y-4 pt-2 border-t border-zinc-900">
                {messages.map((m, idx) => (
                  <div key={idx} className={`space-y-2 ${m.sender === "user" ? "text-right" : "text-left"}`}>
                    <div
                      className={`inline-block p-3 rounded-xl text-xs max-w-[90%] ${
                        m.sender === "user"
                          ? "bg-rose-600 text-white font-bold"
                          : "border border-zinc-800 bg-zinc-900/40 text-zinc-200"
                      }`}
                    >
                      <p>{m.text}</p>
                    </div>

                    {/* WHY Rationale Card */}
                    {m.why && m.why.length > 0 && (
                      <div className="border border-rose-900/30 bg-rose-950/10 rounded-xl p-3.5 space-y-2 text-left">
                        <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[9px] uppercase tracking-widest border-b border-zinc-800 pb-2">
                          <Sparkles className="h-3.5 w-3.5" /> WHY This AI Decision Was Made (XAI Rationale):
                        </div>
                        <ul className="space-y-1.5">
                          {m.why.map((reason, rIdx) => (
                            <li key={rIdx} className="text-[9.5px] text-zinc-400 flex items-start gap-1.5 leading-relaxed font-sans">
                              <span className="text-rose-500 font-bold font-mono">▸</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Decision Metrics Bar */}
                    {m.metrics && m.metrics.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 text-left">
                        {m.metrics.map((metric) => (
                          <div key={metric.label} className="border border-zinc-850 bg-zinc-950 p-2 rounded-lg text-[9px] font-mono">
                            <p className="text-zinc-500 uppercase tracking-widest text-[8px]">{metric.label}</p>
                            <p className={`text-xs font-black mt-0.5 ${metric.color}`}>{metric.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Drawer Input */}
            <form onSubmit={handleCustomSend} className="p-3 border-t border-zinc-900 bg-zinc-950 flex items-center gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Ask Sanguis AI to explain any decision..."
                className="flex-1 h-9 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-rose-500/50 font-sans"
              />
              <button
                type="submit"
                className="h-9 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center transition-colors shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>

          </div>
        </div>
      )}
    </>
  );
}
