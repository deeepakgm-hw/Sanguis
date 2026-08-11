"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { ProfileSubNav } from "@/components/layout/profile-sub-nav";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ToggleProps {
  id: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

function Toggle({ id, checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex w-11 h-6 rounded-full transition-all duration-200 focus:outline-none ${
        checked ? "bg-[#E5384D]" : "bg-slate-200"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

interface Section {
  label: string;
  items: { id: string; label: string; key: string }[];
}

const SETTINGS_SECTIONS: Section[] = [
  {
    label: "NOTIFICATIONS",
    items: [
      { id: "toggle-emergency",   label: "Emergency blood requests nearby", key: "emergencyAlerts" },
      { id: "toggle-reminders",   label: "Donation reminders",              key: "donationReminders" },
      { id: "toggle-messages",    label: "New messages",                    key: "newMessages" },
      { id: "toggle-trust",       label: "Trust score updates",             key: "trustUpdates" },
      { id: "toggle-blog",        label: "Blog & platform updates",         key: "blogUpdates" },
    ],
  },
  {
    label: "PRIVACY",
    items: [
      { id: "toggle-show-profile",  label: "Show my profile to other users",    key: "showProfile" },
      { id: "toggle-share-location",label: "Share location for nearby matches", key: "shareLocation" },
      { id: "toggle-direct-msg",    label: "Allow direct messages from anyone", key: "allowDirectMessages" },
    ],
  },
  {
    label: "AVAILABILITY",
    items: [
      { id: "toggle-available",   label: "Set status as Available to donate",  key: "isAvailable" },
    ],
  },
];

const DEFAULTS: Record<string, boolean> = {
  emergencyAlerts:    true,
  donationReminders:  true,
  newMessages:        true,
  trustUpdates:       false,
  blogUpdates:        false,
  showProfile:        true,
  shareLocation:      true,
  allowDirectMessages:false,
  isAvailable:        true,
};

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadPrefs() {
      try {
        const res = await api.get("/settings/preferences").catch(() => null);
        if (res?.data?.data) {
          setPrefs({ ...DEFAULTS, ...res.data.data });
        }
      } catch {}
      finally { setLoaded(true); }
    }
    loadPrefs();
  }, []);

  const handleToggle = (key: string, val: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save availability if changed
      if ("isAvailable" in prefs) {
        await api.patch("/donors/me/availability", { isAvailable: prefs.isAvailable }).catch(() => {});
      }
      // Save other preferences
      await api.patch("/settings/preferences", prefs).catch(() => {});
      toast.success("Settings saved successfully!");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action is irreversible.")) return;
    try {
      await api.delete("/auth/account");
      toast.success("Account deleted.");
      window.location.href = "/";
    } catch {
      toast.error("Failed to delete account. Contact support.");
    }
  };

  return (
    <AppLayout>
      <div className="flex gap-5">
        <ProfileSubNav />

        <div className="flex-1 min-w-0 space-y-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black text-slate-900">Settings</h1>
            <button
              onClick={handleSave}
              disabled={saving || !loaded}
              className="h-9 px-5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center gap-2 shadow-md shadow-rose-500/20"
              style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>

          {/* Settings Sections */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
            {SETTINGS_SECTIONS.map((section) => (
              <div key={section.label}>
                {/* Section header */}
                <div className="px-5 pt-5 pb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{section.label}</p>
                </div>

                {/* Toggle rows */}
                {section.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <label htmlFor={item.id} className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                      {item.label}
                    </label>
                    <Toggle
                      id={item.id}
                      checked={prefs[item.key] ?? false}
                      onChange={(val) => handleToggle(item.key, val)}
                    />
                  </div>
                ))}
                <div className="pb-1" />
              </div>
            ))}
          </div>

          {/* Account */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ACCOUNT</p>
            </div>

            <div className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div>
                <p className="text-sm font-medium text-slate-700">Signed in as</p>
                <p className="text-xs text-slate-400 mt-0.5">{user?.email ?? "—"}</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5 capitalize">
                {user?.role ?? "user"}
              </span>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Delete Account</p>
                <p className="text-xs text-slate-400 mt-0.5">Permanently remove your data from Sanguis</p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="h-8 px-3.5 rounded-xl text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-all"
              >
                Delete
              </button>
            </div>
            <div className="pb-1" />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
