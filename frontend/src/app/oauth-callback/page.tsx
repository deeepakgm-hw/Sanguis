"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { PageLoader } from "@/components/ui/loader";
import { toast } from "sonner";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const token = searchParams.get("token");
    if (!token) {
      toast.error("Social login failed. Access token missing.");
      router.replace("/login");
      return;
    }

    async function handleCallback() {
      try {
        // 1. Set the token
        setAccessToken(token!);

        // 2. Fetch user details
        const response = await api.get("/auth/me");
        const userData = response.data.data;
        
        setUser(userData);
        toast.success("Successfully authenticated with Google.");
        
        router.replace("/dashboard");
      } catch (err) {
        console.error("OAuth session bootstrap failed:", err);
        toast.error("Failed to authenticate session.");
        router.replace("/login");
      }
    }

    handleCallback();
  }, [searchParams, setAccessToken, setUser, router]);

  return <PageLoader message="Finalizing security handshake..." />;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<PageLoader message="Loading authentication handshake..." />}>
      <OAuthCallbackContent />
    </Suspense>
  );
}

