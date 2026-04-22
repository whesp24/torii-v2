import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { timeAgo } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  metrics: { like_count: number; retweet_count: number; reply_count: number };
  author: { id: string; name: string; handle: string; avatar?: string };
  url: string;
}

interface VoiceHandle {
  id: number;
  handle: string;
  displayName: string | null;
  addedAt: number;
}

// ─── Initials avatar ──────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#3B82F6","#8B5CF6","#10B981","#F59E0B",
  "#EF4444","#EC4899","#06B6D4","#84CC16",
];

function getColor(handle: string) {
  let h = 0;
  for (const c of handle) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Tweet card ───────────────────────────────────────────────────────────────

function TweetCard({ tweet }: { tweet: Tweet }) {
  const color = getColor(tweet.author.handle);
  return (
    <div style={{
      background: "hsl(var(--surface2))", border: "1px solid hsl(var(--border-soft))",
      borderRadius: 12, padding: "14px 16px", marginBottom: 10,
      transition: "border-color 0.15s",
    }}
    onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(var(--border))")}
    onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(var(--border-soft))")}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
        {tweet.author.avatar ? (
          <img src={tweet.author.avatar} alt={tweet.author.name}
            style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
            color: "#fff", flexShrink: 0,
          }}>{initials(tweet.author.name)}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--fg))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tweet.author.name}
          </div>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))" }}>
            @{tweet.author.handle}
          </div>
        </div>
        <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", flexShrink: 0 }}>
          {timeAgo(tweet.createdAt)}
        </span>
      </div>

      {/* Body */}
      <p style={{ fontSize: 13, lineHeight: 1.6, color: "hsl(var(--fg-muted))", marginBottom: 10, textWrap: "pretty" } as any}>
        {tweet.text}
      </p>

      {/* Actions */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 10, color: "hsl(var(--fg-dim))" }}>
        <span>💬 {tweet.metrics?.reply_count ?? 0}</span>
        <span>↗ {tweet.metrics?.retweet_count ?? 0}</span>
        <span>♡ {tweet.metrics?.like_count ?? 0}</span>
        <a href={tweet.url} target="_blank" rel="noopener noreferrer"
          style={{ marginLeft: "auto", color: "var(--red-hex)", fontSize: 9, fontWeight: 700, letterSpacing: "0.04em" }}>
          View on X ↗
        </a>
      </div>
    </div>
  );
}

// ─── Skeleton tweet ───────────────────────────────────────────────────────────

function TweetSkeleton() {
  return (
    <div style={{ background: "hsl(var(--surface2))", border: "1px solid hsl(var(--border-soft))", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 9, marginBottom: 9, alignItems: "center" }}>
        <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 12, width: "45%", marginBottom: 5 }} />
          <div className="skeleton" style={{ height: 10, width: "30%" }} />
        </div>
      </div>
      {[95, 88, 72].map((w, i) => (
        <div key={i} className="skeleton" style={{ height: 12, width: `${w}%`, marginBottom: 7 }} />
      ))}
    </div>
  );
}

// ─── Manage handles panel ─────────────────────────────────────────────────────

function ManageHandles({
  handles,
  onAdd,
  onRemove,
  onClose,
}: {
  handles: VoiceHandle[];
  onAdd: (handle: string, name: string) => void;
  onRemove: (handle: string) => void;
  onClose: () => void;
}) {
  const [handle, setHandle] = useState("");
  const [name,   setName]   = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) return;
    onAdd(handle.trim().replace(/^@/, ""), name.trim());
    setHandle(""); setName("");
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(6px)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        width: 420, background: "hsl(var(--surface))",
        border: "1px solid hsl(var(--border))", borderRadius: 16,
        boxShadow: "0 16px 48px rgba(0,0,0,0.5)", overflow: "hidden",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid hsl(var(--border-soft))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "hsl(var(--fg))" }}>Manage Voices</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "hsl(var(--fg-dim))", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {/* Add form */}
        <form onSubmit={handleSubmit} style={{ padding: "14px 18px", borderBottom: "1px solid hsl(var(--border-soft))" }}>
          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            Add Account
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input className="input" value={handle} onChange={e => setHandle(e.target.value)}
              placeholder="@handle or handle" style={{ flex: 1 }} />
            <input className="input" value={name} onChange={e => setName(e.target.value)}
              placeholder="Display name (optional)" style={{ flex: 1 }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}
            disabled={!handle.trim()}>
            + Add Voice
          </button>
        </form>

        {/* Current handles */}
        <div style={{ padding: "10px 8px", maxHeight: 280, overflowY: "auto" }}>
          {handles.length === 0 && (
            <div style={{ padding: "20px", textAlign: "center", color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", fontSize: 11 }}>
              No voices added yet
            </div>
          )}
          {handles.map(h => (
            <div key={h.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 8, transition: "background 0.1s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "hsl(var(--surface2))")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: getColor(h.handle),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0,
              }}>
                {initials(h.displayName || h.handle)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--fg))" }}>{h.displayName || h.handle}</div>
                <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))" }}>@{h.handle}</div>
              </div>
              <a href={`https://x.com/${h.handle}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", marginRight: 4 }}>↗</a>
              <button onClick={() => onRemove(h.handle)}
                style={{ background: "none", border: "none", color: "hsl(var(--fg-dim))", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "2px 4px" }}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main XVoices page ────────────────────────────────────────────────────────

export default function XVoices() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string>("all");
  const [managing, setManaging] = useState(false);

  // Load handles from API
  const { data: handlesData } = useQuery<VoiceHandle[]>({
    queryKey: ["/api/voices/handles"],
    queryFn:  () => apiRequest("GET", "/api/voices/handles"),
    staleTime: 60000,
  });
  const handles = Array.isArray(handlesData) ? handlesData : [];

  // Load tweets
  const { data: tweetsData, isLoading, error } = useQuery<Tweet[]>({
    queryKey: ["/api/voices"],
    queryFn:  () => apiRequest("GET", "/api/voices"),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
  const allTweets = Array.isArray(tweetsData) ? tweetsData : [];

  // Add / remove handle mutations
  const addHandle = useMutation({
    mutationFn: ({ handle, displayName }: { handle: string; displayName?: string }) =>
      apiRequest("POST", "/api/voices/handles", { handle, displayName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/voices/handles"] });
      qc.invalidateQueries({ queryKey: ["/api/voices"] });
    },
  });
  const removeHandle = useMutation({
    mutationFn: (handle: string) => apiRequest("DELETE", `/api/voices/handles/${handle}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/voices/handles"] });
      qc.invalidateQueries({ queryKey: ["/api/voices"] });
    },
  });

  // Filter tweets by selected account
  const tweets = selected === "all"
    ? allTweets
    : allTweets.filter(t => t.author.handle.toLowerCase() === selected.toLowerCase());

  const hasXToken = !(error as any)?.message?.includes("X_BEARER_TOKEN");

  return (
    <div style={{ maxWidth: 900, paddingBottom: 32 }}>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="hsl(var(--fg))">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Voices
          </h1>
          <p className="page-sub">Curated finance & Japan accounts · {handles.length} tracked · refreshes every 5m</p>
        </div>
        <button className="btn btn-ghost" onClick={() => setManaging(true)} style={{ marginTop: 4 }}>
          ⚙ Manage
        </button>
      </div>

      {/* X_BEARER_TOKEN missing warning */}
      {!hasXToken && (
        <div style={{
          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
          borderRadius: 12, padding: "12px 16px", marginBottom: 16,
          fontSize: 12, color: "#f59e0b", fontFamily: "var(--font-mono)",
        }}>
          ⚠ X_BEARER_TOKEN not configured — set it in Railway environment variables to fetch real tweets.
        </div>
      )}

      {/* Account filter chips */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4, marginBottom: 16 }}>
        <button
          onClick={() => setSelected("all")}
          style={{
            flexShrink: 0, padding: "6px 14px", borderRadius: 999, border: "none",
            cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
            background: selected === "all" ? "var(--red-hex)" : "hsl(var(--surface))",
            color: selected === "all" ? "#fff" : "hsl(var(--fg-dim))",
            transition: "all 0.15s",
          }}>
          All
        </button>
        {handles.map(h => (
          <button key={h.id} onClick={() => setSelected(selected === h.handle ? "all" : h.handle)}
            style={{
              flexShrink: 0, padding: "6px 14px", borderRadius: 999, border: "none",
              cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
              background: selected === h.handle ? "var(--red-hex)" : "hsl(var(--surface))",
              color: selected === h.handle ? "#fff" : "hsl(var(--fg-dim))",
              transition: "all 0.15s",
            }}>
            @{h.handle}
          </button>
        ))}
      </div>

      {/* Tweet feed */}
      {isLoading ? (
        Array(5).fill(0).map((_, i) => <TweetSkeleton key={i} />)
      ) : tweets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          {allTweets.length === 0
            ? hasXToken ? "No tweets fetched yet — try refreshing." : "Configure X_BEARER_TOKEN to see tweets."
            : `No tweets from @${selected}`}
        </div>
      ) : (
        tweets.map(t => <TweetCard key={t.id} tweet={t} />)
      )}

      {/* Manage modal */}
      {managing && (
        <ManageHandles
          handles={handles}
          onAdd={(handle, displayName) => addHandle.mutate({ handle, displayName })}
          onRemove={handle => removeHandle.mutate(handle)}
          onClose={() => setManaging(false)}
        />
      )}
    </div>
  );
}
