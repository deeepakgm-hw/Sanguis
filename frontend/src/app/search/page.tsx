import { Suspense } from "react";
import SearchContent from "./SearchContent";

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center font-sans text-sm">
        Loading search gateway…
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
