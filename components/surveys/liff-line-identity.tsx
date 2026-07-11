"use client";

import { useEffect } from "react";

type LiffProfile = {
  userId?: string;
};

type LiffClient = {
  init: (config: { liffId: string; withLoginOnExternalBrowser?: boolean }) => Promise<void>;
  isLoggedIn: () => boolean;
  login: (options?: { redirectUri?: string }) => void;
  getProfile: () => Promise<LiffProfile>;
};

declare global {
  interface Window {
    liff?: LiffClient;
    __liffSdkLoadPromise?: Promise<LiffClient>;
    __liffInitPromise?: Promise<void>;
  }
}

const LIFF_SDK_SRC = "https://static.line-scdn.net/liff/edge/2/sdk.js";

export function LiffLineIdentity({
  enabled,
  liffId,
  onLineUserId
}: {
  enabled: boolean;
  liffId: string;
  onLineUserId: (lineUserId: string) => void;
}) {
  useEffect(() => {
    if (!enabled || !liffId) return;

    let cancelled = false;

    async function resolveLineUserId() {
      try {
        const liff = await loadLiffSdk();
        await initLiff(liff, liffId);

        if (cancelled) return;

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const profile = await liff.getProfile();
        if (!cancelled && profile.userId) {
          onLineUserId(profile.userId);
        }
      } catch (error) {
        console.warn("Failed to resolve LINE user ID with LIFF.", error);
      }
    }

    resolveLineUserId();

    return () => {
      cancelled = true;
    };
  }, [enabled, liffId, onLineUserId]);

  return null;
}

function loadLiffSdk() {
  if (window.liff) return Promise.resolve(window.liff);
  if (window.__liffSdkLoadPromise) return window.__liffSdkLoadPromise;

  window.__liffSdkLoadPromise = new Promise<LiffClient>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${LIFF_SDK_SRC}"]`
    );

    const resolveLoadedSdk = () => {
      if (window.liff) {
        resolve(window.liff);
      } else {
        reject(new Error("LIFF SDK loaded without window.liff."));
      }
    };

    if (existingScript) {
      existingScript.addEventListener("load", resolveLoadedSdk, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load LIFF SDK.")), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.charset = "utf-8";
    script.src = LIFF_SDK_SRC;
    script.onload = resolveLoadedSdk;
    script.onerror = () => reject(new Error("Failed to load LIFF SDK."));
    document.head.appendChild(script);
  });

  return window.__liffSdkLoadPromise;
}

function initLiff(liff: LiffClient, liffId: string) {
  if (!window.__liffInitPromise) {
    window.__liffInitPromise = liff.init({
      liffId,
      withLoginOnExternalBrowser: true
    });
  }

  return window.__liffInitPromise;
}
