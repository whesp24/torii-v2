import { useState, useEffect } from "react";

const MQ = "(max-width: 767px), (pointer: coarse) and (max-width: 1024px)";

export function useIsMobile() {
  const [m, setM] = useState(() => window.matchMedia(MQ).matches);
  useEffect(() => {
    const mq = window.matchMedia(MQ);
    const h = (e: MediaQueryListEvent) => setM(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return m;
}
