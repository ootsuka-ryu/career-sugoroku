"use client";

import { useEffect } from "react";

export default function HomePage() {
  useEffect(() => {
    const search = window.location.search;
    const hash = window.location.hash;
    const isRecovery =
      search.includes("type=recovery") ||
      search.includes("mode=recovery") ||
      hash.includes("type=recovery");

    if (isRecovery) {
      window.location.replace(`/login${search}${hash}`);
      return;
    }

    window.location.replace("/login");
  }, []);

  return null;
}
