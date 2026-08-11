import { Suspense } from "react";
import OAuthCallbackContent from "./OAuthCallbackContent";
import { PageLoader } from "@/components/ui/loader";

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<PageLoader message="Loading authentication handshake..." />}>
      <OAuthCallbackContent />
    </Suspense>
  );
}
