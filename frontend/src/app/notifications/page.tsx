"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { toast } from "sonner";
import Link from "next/link";
import {
  Bell,
  Droplet,
  CheckCircle2,
  AlertTriangle,
  Star,
  MessageSquare,
  X,
  MailOpen,
} from "lucide-react";

interface Notification {
  _id: string;
  type: "emergency" | "match_accepted" | "eligibility" | "message" | "trust" | "blood_needed" | "system";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  bloodRequestId?: string;
  matchId?: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function notifIcon(type: string) {
  switch (type) {
    case "emergency":
    case "blood_needed": return <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center"><Droplet className="w-4 h-4 text-[#E5384D] fill-[#E5384D]" /></div>;
    case "match_accepted": return <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>;
    case "eligibility": return <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center"><Bell className="w-4 h-4 text-blue-600" /></div>;
    case "message": return <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center"><MessageSquare className="w-4 h-4 text-purple-600" /></div>;
    case "trust": return <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center"><Star className="w-4 h-4 text-amber-600" /></div>;
    default: return <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><Bell className="w-4 h-4 text-slate-500" /></div>;
  }
}

// Fallback demo notifications when backend returns none
const DEMO_NOTIFICATIONS: Notification[] = [
  {
    _id: "1",
    type: "emergency",
    title: "Emergency B+ Blood Needed",
    message: "Amara Osei at LUTH needs 3 units of B+ blood. Critical condition. Please respond immediately.",
    read: false,
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
    bloodRequestId: "",
  },
  {
    _id: "2",
    type: "match_accepted",
    title: "Chioma Eze accepted your r...",
    message: "Great news! Chioma Eze (O+) has accepted your donation request and will arrive at LUTH in approx. 15 minutes.",
    read: false,
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    _id: "3",
    type: "eligibility",
    title: "Eligibility Reminder",
    message: "It has been 3 months since your last donation. You are now eligible to donate again. Update your availability.",
    read: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
  },
  {
    _id: "4",
    type: "message",
    title: "New message from Dr. Eme...",
    message: "Thank you for your donation yesterday. The patient's condition has stabilized thanks to your contribution.",
    read: true,
    createdAt: new Date(Date.now() - 5 * 60 * 60000).toISOString(),
  },
  {
    _id: "5",
    type: "trust",
    title: "Trust Score Updated",
    message: "Your trust score has increased to 94 after your recent donation to David Mensah. You are now in the top 5%.",
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
  },
  {
    _id: "6",
    type: "blood_needed",
    title: "O- Blood Needed — Korle Bu",
    message: "David Mensah requires 2 units of O- universal blood for an emergency C-section. Only 4 O- donors are nearby.",
    read: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60000).toISOString(),
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selected, setSelected]           = useState<Notification | null>(null);
  const [activeTab, setActiveTab]         = useState<"alerts" | "inbox">("alerts");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get("/notifications");
        const data = res.data?.data ?? [];
        setNotifications(data.length > 0 ? data : DEMO_NOTIFICATIONS);
      } catch {
        setNotifications(DEMO_NOTIFICATIONS);
      } finally {
        setLoading(false);
        // Select first by default
      }
    }
    load();
  }, []);

  // Auto-select first
  useEffect(() => {
    if (notifications.length > 0 && !selected) {
      setSelected(notifications[0]);
    }
  }, [notifications, selected]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all").catch(() => {});
    } catch {}
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All marked as read");
  };

  const handleSelect = (n: Notification) => {
    setSelected(n);
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => x._id === n._id ? { ...x, read: true } : x));
    }
  };

  const isEmergency = (n: Notification | null) =>
    n?.type === "emergency" || n?.type === "blood_needed";

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppLayout>
      <div className="flex gap-0 h-full -m-6 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" style={{ minHeight: "calc(100vh - 7rem)" }}>
        {/* ── LEFT: NOTIFICATION LIST ── */}
        <div className="w-80 border-r border-slate-100 flex flex-col shrink-0">
          {/* List Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h1 className="font-black text-slate-900 text-base">Notifications</h1>
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-[#E5384D] font-bold hover:underline"
            >
              Mark all read
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 px-5">
            {(["alerts", "inbox"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 pt-3 mr-5 text-sm font-bold transition-all border-b-2 capitalize ${
                  activeTab === tab
                    ? "text-[#E5384D] border-[#E5384D]"
                    : "text-slate-400 border-transparent hover:text-slate-600"
                }`}
              >
                {tab}
                {tab === "alerts" && unreadCount > 0 && (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[#E5384D] text-white font-black">{unreadCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <MailOpen className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm font-medium">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleSelect(n)}
                  className={`flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors border-b border-slate-50 hover:bg-slate-50 ${
                    selected?._id === n._id ? "bg-rose-50 border-l-2 border-l-[#E5384D]" : ""
                  }`}
                >
                  {notifIcon(n.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-bold truncate ${!n.read ? "text-slate-900" : "text-slate-600"}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                    {!n.read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#E5384D] mt-1.5" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: DETAIL PANEL ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {selected ? (
            <>
              {/* Emergency Banner */}
              {isEmergency(selected) && (
                <div className="bg-rose-50 border-b border-rose-100 px-6 py-3 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#E5384D] flex items-center justify-center">
                    <AlertTriangle className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-black text-[#E5384D] uppercase tracking-wider">Emergency Alert</span>
                </div>
              )}

              {/* Detail Content */}
              <div className="flex-1 px-8 py-6">
                {/* Title block */}
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-10 h-10 rounded-full bg-[#E5384D]/10 flex items-center justify-center shrink-0">
                    <Droplet className="w-5 h-5 text-[#E5384D]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{selected.title}</h2>
                    <p className="text-xs text-slate-400 mt-1">Sanguis Alert · {timeAgo(selected.createdAt)}</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 pt-5">
                  <p className="text-sm text-slate-700 leading-relaxed">{selected.message}</p>
                </div>
              </div>

              {/* Action Buttons */}
              {isEmergency(selected) && (
                <div className="px-8 pb-6 flex items-center gap-3">
                  {selected.bloodRequestId ? (
                    <Link href={`/requests/${selected.bloodRequestId}`} className="flex-1">
                      <button className="w-full h-11 rounded-xl font-bold text-sm text-white shadow-md shadow-rose-500/20 hover:opacity-90 transition-all"
                        style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}>
                        Respond to Emergency
                      </button>
                    </Link>
                  ) : (
                    <Link href="/dashboard" className="flex-1">
                      <button className="w-full h-11 rounded-xl font-bold text-sm text-white shadow-md shadow-rose-500/20 hover:opacity-90 transition-all"
                        style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}>
                        Respond to Emergency
                      </button>
                    </Link>
                  )}
                  <button
                    onClick={() => setSelected(null)}
                    className="h-11 px-5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <Bell className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium text-sm">Select a notification to view</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
