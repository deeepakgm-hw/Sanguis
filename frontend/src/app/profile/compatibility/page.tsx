"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { ProfileSubNav } from "@/components/layout/profile-sub-nav";
import { useAuthStore } from "@/store/auth.store";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// Full 8×8 compatibility matrix
// DONORS (rows) → which RECIPIENTS (cols) they can donate to
// Order: O-, O+, A-, A+, B-, B+, AB-, AB+
const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] as const;
type BT = (typeof BLOOD_TYPES)[number];

// compatibility[donor][recipient] = true if donor can give to recipient
const COMPAT: Record<BT, Record<BT, boolean>> = {
  "O-":  { "O-":true,  "O+":true,  "A-":true,  "A+":true,  "B-":true,  "B+":true,  "AB-":true,  "AB+":true  },
  "O+":  { "O-":false, "O+":true,  "A-":false, "A+":true,  "B-":false, "B+":true,  "AB-":false, "AB+":true  },
  "A-":  { "O-":false, "O+":false, "A-":true,  "A+":true,  "B-":false, "B+":false, "AB-":true,  "AB+":true  },
  "A+":  { "O-":false, "O+":false, "A-":false, "A+":true,  "B-":false, "B+":false, "AB-":false, "AB+":true  },
  "B-":  { "O-":false, "O+":false, "A-":false, "A+":false, "B-":true,  "B+":true,  "AB-":true,  "AB+":true  },
  "B+":  { "O-":false, "O+":false, "A-":false, "A+":false, "B-":false, "B+":true,  "AB-":false, "AB+":true  },
  "AB-": { "O-":false, "O+":false, "A-":false, "A+":false, "B-":false, "B+":false, "AB-":true,  "AB+":true  },
  "AB+": { "O-":false, "O+":false, "A-":false, "A+":false, "B-":false, "B+":false, "AB-":false, "AB+":true  },
};

export default function CompatibilityChartPage() {
  const user = useAuthStore((s) => s.user);
  const [myBloodType, setMyBloodType] = useState<BT | null>(null);
  const [compatMatrix, setCompatMatrix] = useState<Record<string, Record<string, boolean>>>(COMPAT);

  useEffect(() => {
    api.get("/donors/me").then((res) => {
      const bt = res.data?.data?.bloodType as BT;
      if (BLOOD_TYPES.includes(bt)) setMyBloodType(bt);
    }).catch(() => {});

    api.get("/matches/compatibility").then((res) => {
      if (res.data?.data) setCompatMatrix(res.data.data);
    }).catch(() => {});
  }, []);

  return (
    <AppLayout>
      <div className="flex gap-5">
        <ProfileSubNav />

        <div className="flex-1 min-w-0 space-y-5">
          <div>
            <h1 className="text-xl font-black text-slate-900">Blood Compatibility Chart</h1>
            <p className="text-sm text-slate-500 mt-0.5">Shows which blood types each donor type can donate to.</p>
          </div>

          {myBloodType && (
            <div className="flex items-center gap-2 text-sm bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5">
              <span className="font-black text-[#E5384D]">{myBloodType}</span>
              <span className="text-slate-600">— your blood type is highlighted in the table below</span>
            </div>
          )}

          {/* Compatibility Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 min-w-[120px]">
                      <div className="text-[10px] leading-tight">
                        <span className="block">Donor ↓ /</span>
                        <span className="block">Recipient →</span>
                      </div>
                    </th>
                    {BLOOD_TYPES.map((bt) => (
                      <th key={bt} className="px-3 py-3.5 text-xs font-black text-slate-700 text-center whitespace-nowrap">
                        {bt}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {BLOOD_TYPES.map((donor) => {
                    const isMyType = myBloodType === donor;
                    return (
                      <tr
                        key={donor}
                        className={`transition-colors ${isMyType ? "bg-rose-50" : "hover:bg-slate-50"}`}
                      >
                        {/* Donor Label */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-black ${isMyType ? "text-[#E5384D]" : "text-slate-800"}`}>
                              {donor}
                            </span>
                            {isMyType && (
                              <span className="text-[9px] font-black bg-[#E5384D] text-white rounded-full px-1.5 py-0.5 uppercase tracking-wide">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Compatibility cells */}
                        {BLOOD_TYPES.map((recipient) => {
                          const can = compatMatrix[donor]?.[recipient] ?? false;
                          return (
                            <td key={recipient} className="px-3 py-3.5 text-center">
                              {can ? (
                                <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto">
                                  <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto">
                                  <svg className="w-3 h-3 text-slate-300" viewBox="0 0 12 12" fill="none">
                                    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                  </svg>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-xs text-slate-600 font-medium">Compatible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <svg className="w-3 h-3 text-slate-300" viewBox="0 0 12 12" fill="none">
                    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-xs text-slate-600 font-medium">Not compatible</span>
              </div>
              {myBloodType && (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-rose-100 border border-rose-200" />
                  <span className="text-xs text-[#E5384D] font-bold">Your blood type row</span>
                </div>
              )}
            </div>
          </div>

          {/* Universal Donor/Recipient note */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Universal Donor</p>
              <p className="text-2xl font-black text-[#E5384D]">O-</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Can donate to <strong>all 8</strong> blood types. Critical in emergencies.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Universal Recipient</p>
              <p className="text-2xl font-black text-purple-600">AB+</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Can receive from <strong>all 8</strong> blood types.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
