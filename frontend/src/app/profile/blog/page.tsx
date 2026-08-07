"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { ProfileSubNav } from "@/components/layout/profile-sub-nav";
import { ArrowUpRight, Clock } from "lucide-react";

interface BlogPost {
  id: string;
  category: string;
  categoryColor: string;
  date: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  readMin: number;
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: "1",
    category: "Education",
    categoryColor: "bg-blue-100 text-blue-700",
    date: "August 3, 2026",
    title: "Why O-Negative is Called the Universal Donor",
    excerpt:
      "O-negative blood can be given to any patient regardless of blood type, making it critical in emergencies where typing is impossible.",
    imageUrl: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&h=220&fit=crop&auto=format",
    readMin: 4,
  },
  {
    id: "2",
    category: "Community",
    categoryColor: "bg-emerald-100 text-emerald-700",
    date: "July 22, 2026",
    title: "How Blood Donation Impacts Sickle Cell Patients",
    excerpt:
      "For patients with sickle cell disease, regular blood transfusions are not just helpful — they are life-sustaining interventions.",
    imageUrl: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400&h=220&fit=crop&auto=format",
    readMin: 6,
  },
  {
    id: "3",
    category: "News",
    categoryColor: "bg-amber-100 text-amber-700",
    date: "July 10, 2026",
    title: "Sanguis Reaches 1,000 Successful Matches in Lagos",
    excerpt:
      "In just 14 months since launch, Sanguis has facilitated over 1,000 life-saving blood donor-recipient connections across Lagos state.",
    imageUrl: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=220&fit=crop&auto=format",
    readMin: 3,
  },
  {
    id: "4",
    category: "Education",
    categoryColor: "bg-blue-100 text-blue-700",
    date: "June 28, 2026",
    title: "Understanding Blood Type Compatibility: A Complete Guide",
    excerpt:
      "Blood type compatibility goes beyond the ABO system. Rh factor, antibodies, and cross-matching all play critical roles in safe transfusions.",
    imageUrl: "https://images.unsplash.com/photo-1582560475093-ba66accbc424?w=400&h=220&fit=crop&auto=format",
    readMin: 8,
  },
  {
    id: "5",
    category: "Health",
    categoryColor: "bg-purple-100 text-purple-700",
    date: "June 15, 2026",
    title: "What to Eat Before and After Donating Blood",
    excerpt:
      "Proper nutrition before and after donation improves your experience, speeds recovery, and helps maintain hemoglobin levels for future eligibility.",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=220&fit=crop&auto=format",
    readMin: 5,
  },
  {
    id: "6",
    category: "Community",
    categoryColor: "bg-emerald-100 text-emerald-700",
    date: "June 1, 2026",
    title: "Meet the Donors: Stories of Lives Changed by a Single Pint",
    excerpt:
      "Three Sanguis donors share their personal journeys — from first-time nervousness to becoming champions of blood donation in their communities.",
    imageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=220&fit=crop&auto=format",
    readMin: 7,
  },
];

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>(BLOG_POSTS);

  useEffect(() => {
    async function loadBlog() {
      try {
        const { api } = await import("@/lib/api");
        const res = await api.get("/content/blog");
        if (res.data?.data && res.data.data.length > 0) {
          const fetched = res.data.data.map((p: any, idx: number) => ({
            ...p,
            categoryColor: idx % 3 === 0 ? "bg-blue-100 text-blue-700" : idx % 3 === 1 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
            imageUrl: BLOG_POSTS[idx % BLOG_POSTS.length]?.imageUrl || BLOG_POSTS[0].imageUrl,
          }));
          setPosts(fetched);
        }
      } catch {}
    }
    loadBlog();
  }, []);

  return (
    <AppLayout>
      <div className="flex gap-5">
        <ProfileSubNav />

        <div className="flex-1 min-w-0 space-y-5">
          <div>
            <h1 className="text-xl font-black text-slate-900">Sanguis Blog</h1>
            <p className="text-sm text-slate-500 mt-0.5">Education, community stories, and news from the Sanguis network</p>
          </div>

          {/* Blog Grid — 3 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-slate-200 transition-all duration-200 cursor-pointer group"
              >
                {/* Image */}
                <div className="relative h-36 overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/400x220/fee2e2/E5384D?text=${post.category}`;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${post.categoryColor}`}>
                      {post.category}
                    </span>
                    <span className="text-[10px] text-slate-400">{post.date}</span>
                  </div>

                  <h2 className="text-sm font-black text-slate-900 leading-snug mb-2 group-hover:text-[#E5384D] transition-colors">
                    {post.title}
                  </h2>

                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-3">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{post.readMin} min read</span>
                    </div>
                    <button className="flex items-center gap-1 text-[10px] font-bold text-[#E5384D] hover:underline">
                      Read more <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Load more */}
          <div className="text-center pt-2">
            <button className="h-10 px-6 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
              Load More Articles
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
