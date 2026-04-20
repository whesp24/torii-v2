import { useState } from "react";

const X_ACCOUNTS = [
  { handle: "KevinLMak",       name: "Kevin Mak",       topics: ["Japan", "Macro", "FX"] },
  { handle: "ContrarianCurse", name: "SuspendedCap",    topics: ["Equities", "Sentiment"] },
  { handle: "dsundheim",       name: "D. Sundheim",     topics: ["Long/Short", "Equity"] },
  { handle: "jeff_weinstein",  name: "Jeff Weinstein",  topics: ["Tech", "Venture"] },
  { handle: "patrick_oshag",   name: "Patrick O'Shag",  topics: ["Value", "Capital"] },
  { handle: "HannoLustig",     name: "Hanno Lustig",    topics: ["Macro", "Research"] },
];

// Most stable public Nitter instances
const NITTER_HOST = "nitter.net";

function XLogo({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

export default function XVoices() {
  const [selected, setSelected] = useState(X_ACCOUNTS[0].handle);
  const acct = X_ACCOUNTS.find(a => a.handle === selected)!;

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          <XLogo size={20} color="hsl(var(--fg))" /> Voices
        </h1>
      </div>
      <p className="page-sub" style={{ marginBottom: 14 }}>Curated X accounts · macro, markets & Japan</p>

      {/* Account picker — horizontal scroll chips */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 14, scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
        {X_ACCOUNTS.map(a => (
          <button
            key={a.handle}
            onClick={() => setSelected(a.handle)}
            style={{
              flexShrink: 0,
              padding: "7px 13px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              background: selected === a.handle ? "#BC0024" : "hsl(var(--surface))",
              color: selected === a.handle ? "#fff" : "hsl(var(--fg-dim))",
              transition: "all 0.15s",
            }}
          >
            @{a.handle}
          </button>
        ))}
      </div>

      {/* Selected account label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "hsl(var(--fg))" }}>{acct.name}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#e05070", marginLeft: 8 }}>@{acct.handle}</span>
        </div>
        <a
          href={`https://x.com/${acct.handle}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
            padding: "5px 11px", borderRadius: 999,
            background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-soft))",
            color: "hsl(var(--fg-dim))", textDecoration: "none",
          }}
        >
          Open on X →
        </a>
      </div>

      {/* Nitter embed */}
      <div style={{
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid hsl(var(--border-soft))",
        background: "hsl(var(--surface))",
      }}>
        <iframe
          key={selected}
          src={`https://${NITTER_HOST}/${selected}/with_replies#m`}
          style={{ width: "100%", height: 600, border: "none", display: "block", colorScheme: "dark" }}
          title={`@${selected} on X`}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation"
        />
      </div>
    </div>
  );
}
