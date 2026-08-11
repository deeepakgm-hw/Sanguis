"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { ProfileSubNav } from "@/components/layout/profile-sub-nav";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "How often can I donate blood?",
    answer:
      "For whole blood donations, the standard minimum interval is 90 days (approximately 3 months). This follows AABB guidelines and ensures your body fully replenishes the donated red blood cells. Plasma donations can be made every 28 days, and platelet donations every 7 days up to 24 times per year. Sanguis tracks your last donation date and automatically shows your eligibility status on your dashboard.",
  },
  {
    question: "What are the eligibility requirements?",
    answer:
      "To be eligible to donate through Sanguis, you must: (1) Be at least 18 years old, (2) Weigh at least 50kg (110 lbs), (3) Be in good general health and feeling well on the day of donation, (4) Have hemoglobin of at least 12.5 g/dL (women) or 13.5 g/dL (men), and (5) Not have donated whole blood in the past 90 days. Certain medical conditions like HIV, Hepatitis B/C, or active infections may temporarily or permanently defer you. Always consult your doctor if unsure.",
  },
  {
    question: "How is my trust score calculated?",
    answer:
      "Your Sanguis Trust Score (0–100) is a composite metric that rewards reliability and responsiveness. It increases with: successful completed donations (+10 pts each), quick response time to match requests, positive feedback from recipients and hospitals, and maintaining an up-to-date profile. It decreases if you frequently accept matches but don't show up, or if your availability status is inaccurate. The score is updated after every donation event and visible only to matched hospitals.",
  },
  {
    question: "Is my medical information kept private?",
    answer:
      "Yes. Your medical data (blood type, donation history, medical conditions) is encrypted at rest and in transit. It is never sold to third parties. Only verified partner hospitals you are matched with can see your blood type during an active emergency match — and only for the duration of that match. You can revoke access or delete your data at any time from Settings → Account. Sanguis is fully compliant with applicable health data privacy regulations.",
  },
  {
    question: "What happens after I accept a donation request?",
    answer:
      "Once you accept, the hospital's contact person receives your name and a secure Sanguis-mediated message. You'll get their hospital address, ward, and phone number. You're expected to arrive within the agreed timeframe. After donation is confirmed by the hospital, your trust score is updated, you earn +50 points, and your 90-day eligibility timer resets automatically. If you can no longer make it, please decline as soon as possible so another donor can be matched.",
  },
  {
    question: "Can I set myself as temporarily unavailable?",
    answer:
      "Yes! Go to your Dashboard → Availability Settings, or navigate to Settings → Availability. You can block out a date range with a reason (e.g. travel, medical procedure). During this window you will not receive any match requests. The system automatically removes the block after the end date and restores your availability. You can also use the quick toggle on your Profile page.",
  },
  {
    question: "How do I verify my email address?",
    answer:
      "After registration, Sanguis sends a 6-digit OTP to your email. Enter it on the Verify Email screen to activate your account. If you didn't receive it, check your spam folder or click 'Resend Verification'. Email verification is required before you can accept donation matches. Once verified, a blue checkmark appears next to your name across the platform.",
  },
  {
    question: "Are there rewards for donating?",
    answer:
      "Every accepted and completed donation earns you +50 Sanguis Points. Points unlock milestone badges (Bronze at 5 donations, Silver at 20, Gold at 50). While points are not redeemable for cash, they build your trust score ranking, improve your profile visibility, and contribute to your community impact stats. A future loyalty rewards program is planned for 2027.",
  },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
        open ? "border-[#E5384D]/30 shadow-sm" : "border-slate-200"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-slate-50 transition-colors"
      >
        <span className={`text-sm font-bold ${open ? "text-[#E5384D]" : "text-slate-800"}`}>
          {item.question}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 ml-4 transition-transform duration-200 ${
            open ? "rotate-180 text-[#E5384D]" : "text-slate-400"
          }`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 bg-white border-t border-slate-100">
          <p className="text-sm text-slate-600 leading-relaxed pt-3">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [items, setItems] = useState<FAQItem[]>(FAQ_ITEMS);

  useEffect(() => {
    async function loadFaq() {
      try {
        const { api } = await import("@/lib/api");
        const res = await api.get("/content/faq");
        if (res.data?.data) setItems(res.data.data);
      } catch {}
    }
    loadFaq();
  }, []);

  return (
    <AppLayout>
      <div className="flex gap-5">
        <ProfileSubNav />

        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <h1 className="text-xl font-black text-slate-900">Frequently Asked Questions</h1>
            <p className="text-sm text-slate-500 mt-0.5">Everything you need to know about donating through Sanguis</p>
          </div>

          <div className="space-y-2.5">
            {items.map((item) => (
              <FAQAccordion key={item.question} item={item} />
            ))}
          </div>

          {/* Contact Support CTA */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between mt-4">
            <div>
              <p className="font-bold text-sm text-slate-900">Still have questions?</p>
              <p className="text-xs text-slate-500 mt-0.5">Our support team responds within 24 hours</p>
            </div>
            <a
              href="mailto:support@sanguis.app"
              className="h-9 px-4 rounded-xl text-xs font-bold text-white flex items-center shadow-sm hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
