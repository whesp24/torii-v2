import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { timeAgo } from "@/lib/utils";

type Tweet = {
  id: string;
  text: string;
  createdAt: string;
  metrics: { like_count: number; retweet_count: number; reply_count: number };
  author: { id: string; name: string; handle: string; avatar: string };
  url: string;
};

function XLogo({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function TweetCard({ tweet }: { tweet: Tweet }) {
  return (
    <a
      href={tweet.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "block" }}
    >
      <div style={{
        padding: "14px 16px",
        borderRadius: 16,
        background: "hsl(var(--surface))",
        border: "1px solid hsl(var(--border-soft))",
        transition: "border-color 0.15s",
      }}>
        {/* Author row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          {tweet.author.avatar ? (
            <img
              src={tweet.author.avatar}
              alt={tweet.author.name}
              style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              background: "hsl(var(--secondary))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <XLogo size={14} color="hsl(var(--fg-dim))" />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "hsl(var(--fg))", letterSpacing: "-0.01em" }}>
              {tweet.author.name}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#e05070" }}>
              @{tweet.author.handle}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "hsl(var(--fg-dim))" }}>
              {timeAgo(tweet.createdAt)}
            </span>
            <XLogo size={12} color="hsl(var(--fg-dim))" />
          </div>
        </div>

        {/* Tweet text */}
        <div style={{
          fontSize: 14, lineHeight: 1.55, color: "hsl(var(--fg))",
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {tweet.text}
        </div>

        {/* Metrics */}
        {tweet.metrics && (
          <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
            {[
              { icon: "♥", val: tweet.metrics.like_count },
              { icon: "↻", val: tweet.metrics.retweet_count },
              { icon: "↩", val: tweet.metrics.reply_count },
            ].map(({ icon, val }) => (
              <span key={icon} style={{
                fontFamily: "var(--font-mono)", fontSize: 11,
                color: "hsl(var(--fg-dim))", display: "flex", alignItems: "center", gap: 4,
              }}>
                {icon} {val?.toLocaleString() ?? 0}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}

export default function XVoices() {
  const { data: tweets = [], isLoading, error, refetch } = useQuery<Tweet[]>({
    queryKey: ["/api/voices"],
    queryFn: () => apiRequest("GET", "/api/voices"),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 1,
  });

  return (
    <div style={{ maxWidth: 680, paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <XLogo size={20} color="hsl(var(--fg))" />
            Voices
          </h1>
          <p className="page-sub">6 accounts · merged chronological feed</p>
        </div>
        <button
          onClick={() => refetch()}
          style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
            padding: "7px 13px", borderRadius: 10,
            background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-soft))",
            color: "hsl(var(--fg))", cursor: "pointer", flexShrink: 0,
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* States */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 110, borderRadius: 16 }} />
          ))}
        </div>
      ) : error || (tweets as any)?.error ? (
        <div style={{
          padding: "32px 20px", textAlign: "center",
          background: "hsl(var(--surface))", borderRadius: 16,
          border: "1px solid hsl(var(--border-soft))",
        }}>
          <XLogo size={28} color="hsl(var(--fg-dim))" />
          <div style={{ fontWeight: 600, fontSize: 14, color: "hsl(var(--fg))", margin: "12px 0 6px" }}>
            Feed unavailable
          </div>
          <div style={{ fontSize: 12, color: "hsl(var(--fg-dim))" }}>
            Make sure X_BEARER_TOKEN is set in Railway variables.
          </div>
        </div>
      ) : tweets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "hsl(var(--fg-dim))", fontSize: 13 }}>
          No posts found.
        </div>
      ) : (
        <>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "hsl(var(--fg-dim))", marginBottom: 12 }}>
            {tweets.length} posts · newest first
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tweets.map(t => <TweetCard key={t.id} tweet={t} />)}
          </div>
        </>
      )}
    </div>
  );
}
