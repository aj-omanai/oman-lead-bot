import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

/**
 * App-wide interface direction. Setting `dir` on <html> mirrors the whole
 * layout (flex order, text alignment, logical spacing). Persisted per browser.
 */
const STORAGE_KEY = "wasl-dir";

interface RtlContextValue {
  isRtl: boolean;
  toggleRtl: () => void;
  setRtl: (value: boolean) => void;
}

const RtlContext = createContext<RtlContextValue | null>(null);

export function RtlProvider({ children }: { children: ReactNode }) {
  const [isRtl, setIsRtl] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "rtl";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dir = isRtl ? "rtl" : "ltr";
    root.lang = isRtl ? "ar" : "en";
    try {
      window.localStorage.setItem(STORAGE_KEY, isRtl ? "rtl" : "ltr");
    } catch {
      // Storage unavailable — the direction still applies for this session.
    }
  }, [isRtl]);

  const toggleRtl = useCallback(() => setIsRtl((value) => !value), []);
  const setRtl = useCallback((value: boolean) => setIsRtl(value), []);

  const value = useMemo(
    () => ({ isRtl, toggleRtl, setRtl }),
    [isRtl, toggleRtl, setRtl],
  );

  return <RtlContext.Provider value={value}>{children}</RtlContext.Provider>;
}

export function useRtl(): RtlContextValue {
  const context = useContext(RtlContext);
  if (!context) {
    throw new Error("useRtl must be used within an RtlProvider");
  }
  return context;
}
