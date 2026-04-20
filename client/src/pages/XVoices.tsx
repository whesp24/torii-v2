import { useIsMobile } from "@/hooks/useMobile";

const X_ACCOUNTS = [
  { handle: "KevinLMak",       name: "Kevin Mak",       desc: "Macro & Japan markets" },
  { handle: "ContrarianCurse", name: "SuspendedCap",    desc: "Contrarian market takes" },
  { handle: "dsundheim",       name: "D. Sundheim",     desc: "Long/short equity" },
  { handle: "jeff_weinstein",  name: "Jeff Weinstein",  desc: "Tech & venture" },
  { handle: "patrick_oshag",   name: "Patrick O'Shag",  desc: "Capital allocation" },
  { handle: "HannoLustig",     name: "Hanno Lustig",    desc: "Finance & macro" },
];

function XFeedContent() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {X_ACCOUNTS.map(({ handle, name, desc }) => (
        <div key={handle} style={{
          background: "hsl(var(--surface))",
          border: "1px solid hsl(var(--border-soft))",
          borderRadius: 16,
          overflow: "hidden",
        }}>
          {/* Account header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px 10px",
            borderBottom: "1px solid hsl(var(--border-soft))",
          }}>
            {/* X logo circle */}
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "hsl(var(--secondary))",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="hsl(var(--fg))">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "hsl(var(--fg))", letterSpacing: "-0.01em" }}>{name}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "hsl(var(--fg-dim))" }}>@{handle}</div>
            </div>
            <a
              href={`https://x.com/${handle}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: "auto", flexShrink: 0,
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                padding: "4px 10px", borderRadius: 999,
                background: "hsl(var(--secondary))", color: "hsl(var(--fg-dim))",
                textDecoration: "none", border: "1px solid hsl(var(--border-soft))",
              }}
            >
              View →
            </a>
          </div>

          {/* Embedded timeline */}
          <div style={{ background: "hsl(var(--bg))" }}>
            <iframe
              src={`https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}?dnt=true&theme=dark&chrome=noheader,nofooter,noborders,transparent`}
              style={{
                width: "100%",
                height: 420,
                border: "none",
                display: "block",
                colorScheme: "dark",
              }}
              title={`@${handle} on X`}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function XVoices() {
  return (
    <div style={{ maxWidth: 680, paddingBottom: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "hsl(var(--fg))", flexShrink: 0 }}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          Voices
        </h1>
        <p className="page-sub">Curated X feeds · macro, markets & Japan</p>
      </div>
      <XFeedContent />
    </div>
  );
}
