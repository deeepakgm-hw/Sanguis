"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  History,
  Droplet,
  HelpCircle,
  BookOpen,
  Settings,
  Heart,
} from "lucide-react";

export const PROFILE_SUB_NAV = [
  { label: "My Profile",         href: "/profile",               icon: <User className="w-4 h-4" /> },
  { label: "Donation History",   href: "/profile/history",       icon: <History className="w-4 h-4" /> },
  { label: "Compatibility Chart",href: "/profile/compatibility",  icon: <Droplet className="w-4 h-4" /> },
  { label: "FAQ",                href: "/profile/faq",            icon: <HelpCircle className="w-4 h-4" /> },
  { label: "Blog",               href: "/profile/blog",           icon: <BookOpen className="w-4 h-4" /> },
  { label: "Settings",           href: "/profile/settings",       icon: <Settings className="w-4 h-4" /> },
  { label: "Donate to Sanguis",  href: "/donate",                icon: <Heart className="w-4 h-4 text-[#E5384D]" /> },
];

export function ProfileSubNav() {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-fit sticky top-24">
      <nav className="p-3 space-y-0.5">
        {PROFILE_SUB_NAV.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                isActive
                  ? "bg-rose-50 text-[#E5384D] border border-rose-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className={isActive ? "text-[#E5384D]" : "text-slate-400"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
