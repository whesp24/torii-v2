import { useIsMobile } from "@/hooks/useMobile";

const X_ACCOUNTS = [
  { handle: "KevinLMak",       name: "Kevin Mak",       desc: "Macro & Japan markets analysis", topics: ["Japan", "Macro", "FX"] },
  { handle: "ContrarianCurse", name: "SuspendedCap",    desc: "Contrarian market takes & positioning", topics: ["Equities", "Sentiment"] },
  { handle: "dsundheim",       name: "D. Sundheim",     desc: "Long/short equity & capital allocation", topics: ["Long/Short", "Equity"] },
  { handle: "jeff_weinstein",  name: "Jeff Weinstein",  desc: "Tech, venture & growth investing", topics: ["Tech", "Venture"] },
  { handle: "patrick_oshag",   name: "Patrick O'Shag",  desc: "Capital allocation & value investing", topics: ["Value", "Capital"] },
  { handle: "HannoLustig",     name: "Hanno Lustig",    desc: "Finance research & macro economics", topics: ["Macro", "Research"] },
];

function XLogo({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

export default function XVoices() {
  return (
    <div style={{ maxWidth: 680, paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <XLogo size={20} color="hsl(var(--fg))" />
          Voices
        </h1>
        <p className="page-sub">6 curated accounts · macro, markets & Japan</p>
      </div>

      {/* Notice */}
      <div style={{
        padding: "10px 14px",
        borderRadius: 12,
        background: "hsl(350 100% 39% / 0.08)",
        border: "1px solid hsl(350 100% 39% / 0.2)",
        marginBottom: 18,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <XLogo size={13} color="#e05070" />
        <span style={{ fontSize: 12, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)" }}>
          Tap any account to open their feed directly on X
        </span>
      </div>

      {/* Account cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {X_ACCOUNTS.map(({ handle, name, desc, topics }) => (
          <a
            key={handle}
            href={`https://x.com/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              borderRadius: 16,
              background: "hsl(var(--surface))",
              border: "1px solid hsl(var(--border-soft))",
              transition: "border-color 0.15s",
              cursor: "pointer",
            }}>
              {/* Avatar circle with X logo */}
              <div style={{
                width: 44, height: 44,
                borderRadius: "50%",
                background: "hsl(var(--secondary))",
                border: "1px solid hsl(var(--border-soft))",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <XLogo size={18} color="hsl(var(--fg))" />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "hsl(var(--fg))", letterSpacing: "-0.01em", marginBottom: 2 }}>
                  {name}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#e05070", marginBottom: 5, letterSpacing: "0.02em" }}>
                  @{handle}
                </div>
                <div style={{ fontSize: 12, color: "hsl(var(--fg-dim))", lineHeight: 1.4 }}>
                  {desc}
                </div>
                {/* Topic pills */}
                <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
                  {topics.map(t => (
                    <span key={t} style={{
                      fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
                      padding: "2px 7px", borderRadius: 999,
                      background: "hsl(var(--secondary))", color: "hsl(var(--fg-dim))",
                      letterSpacing: "0.06em",
                    }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Arrow */}
              <div style={{
                flexShrink: 0,
                fontFamily: "var(--font-mono)", fontSize: 12,
                color: "hsl(var(--fg-dim))",
                paddingLeft: 4,
              }}>→</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
