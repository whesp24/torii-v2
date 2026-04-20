import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice, formatPct } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const PIE_COLORS = [
  "#C8002A","#3b82f6","#22c55e","#f59e0b","#8b5cf6",
  "#06b6d4","#ec4899","#84cc16","#f97316","#64748b","#a78bfa",
];

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const h = (e: MediaQueryListEvent) => setM(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return m;
}

export default function Portfolio() {
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [showAdd, setShowAdd] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newCost, setNewCost] = useState("");
  const [sort, setSort] = useState<"value" | "changePct" | "shares">("value");

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ["/api/portfolio/quotes"],
    queryFn: () => apiRequest("GET", "/api/portfolio/quotes"),
    refetchInterval: 60000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/holdings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/portfolio/quotes"] }),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/holdings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/portfolio/quotes"] });
      setShowAdd(false); setNewTicker(""); setNewShares(""); setNewCost("");
    },
  });

  const holdings = Array.isArray(portfolio) ? portfolio : [];
  const sorted   = [...holdings].sort((a: any, b: any) => (b[sort] || 0) - (a[sort] || 0));
  const total    = holdings.reduce((s: number, h: any) => s + (h.value || 0), 0);
  const dayChg   = holdings.reduce((s: number, h: any) => s + ((h.change || 0) * h.shares), 0);
  const up       = holdings.filter((h: any) => h.changePct > 0).length;
  const down     = holdings.filter((h: any) => h.changePct < 0).length;

  const pieData = [...holdings]
    .filter((h: any) => h.value > 0)
    .sort((a: any, b: any) => b.value - a.value)
    .map((h: any, i: number) => ({ name: h.ticker, value: h.value, color: PIE_COLORS[i % PIE_COLORS.length] }));

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Portfolio</h1>
          <p className="page-sub">Yahoo Finance · prices refresh every 60s</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} style={{ marginTop: 4 }}>
          {showAdd ? "✕ Cancel" : "+ Add"}
        </button>
      </div>

      {/* Add holding form */}
      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-label" style={{ marginBottom: 12 }}>Add Holding</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            {[
              { label: "Ticker", val: newTicker, set: setNewTicker, ph: "NVDA", w: 100 },
              { label: "Shares", val: newShares, set: setNewShares, ph: "3",    w: 100 },
              { label: "Cost Basis (optional)", val: newCost, set: setNewCost, ph: "120.00", w: 140 },
            ].map(({ label, val, set, ph, w }) => (
              <div key={label}>
                <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", marginBottom: 5 }}>{label}</div>
                <input
                  className="input"
                  value={val} onChange={e => set(e.target.value)}
                  placeholder={ph}
                  style={{ width: w }}
                />
              </div>
            ))}
            <button
              className="btn btn-primary"
              onClick={() => addMutation.mutate({
                ticker: newTicker.toUpperCase().trim(),
                shares: parseFloat(newShares),
                costBasis: newCost ? parseFloat(newCost) : null,
              })}
              disabled={!newTicker || !newShares || addMutation.isPending}
            >
              {addMutation.isPending ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {/* Total value */}
        <div className="stat-card">
          <div className="stat-label">Total Value</div>
          <div className="stat-value" style={{ fontSize: isMobile ? 16 : 22 }}>
            {total > 0 ? `$${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
          </div>
          {dayChg !== 0 && (
            <div className={`stat-change ${dayChg >= 0 ? "up" : "down"}`}>
              {dayChg >= 0 ? "+" : "−"}${Math.abs(dayChg).toFixed(2)} today
            </div>
          )}
        </div>

        {/* Positions */}
        <div className="stat-card">
          <div className="stat-label">Positions</div>
          <div className="stat-value" style={{ fontSize: isMobile ? 16 : 22 }}>{holdings.length}</div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))" }}>
            <span className="up">{up}↑</span> <span className="down">{down}↓</span>
          </div>
        </div>

        {/* Allocation donut — spans full width on mobile as its own row */}
        {!isMobile && pieData.length > 0 && (
          <div className="stat-card" style={{ gridRow: "span 1" }}>
            <div className="stat-label">Allocation</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ResponsiveContainer width={80} height={80}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={24} outerRadius={38} dataKey="value" paddingAngle={2}>
                    {pieData.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(0)}`, ""]}
                    contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-soft))", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 8px" }}>
                {pieData.slice(0, 6).map((d: any) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-mono)", color: "hsl(var(--fg-muted))" }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile donut */}
      {isMobile && pieData.length > 0 && (
        <div className="card" style={{ marginBottom: 16, display: "flex", gap: 16, alignItems: "center" }}>
          <ResponsiveContainer width={80} height={80}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={22} outerRadius={36} dataKey="value" paddingAngle={2}>
                {pieData.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", flex: 1 }}>
            {pieData.map((d: any) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: d.color }} />
                <span style={{ fontFamily: "var(--font-mono)", color: "hsl(var(--fg-muted))" }}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Holdings — mobile: cards, desktop: table */}
      {isMobile ? (
        <MobileHoldings sorted={sorted} isLoading={isLoading} total={total} onDelete={(id) => {
          if (confirm("Remove this holding?")) deleteMutation.mutate(id);
        }} />
      ) : (
        <DesktopTable sorted={sorted} isLoading={isLoading} total={total} sort={sort} setSort={setSort}
          onDelete={(id) => { if (confirm("Remove this holding?")) deleteMutation.mutate(id); }} />
      )}
    </div>
  );
}

// ─── Mobile holdings list ─────────────────────────────────────────────────────

function MobileHoldings({ sorted, isLoading, total, onDelete }: any) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>Holdings</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {isLoading
          ? Array(6).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 68, borderRadius: 12 }} />
            ))
          : sorted.map((h: any) => {
              const alloc = total > 0 ? (h.value / total) * 100 : 0;
              const isUp  = h.changePct > 0;
              const isDown = h.changePct < 0;
              const color = isUp ? "var(--green-hex)" : isDown ? "#ff6b6b" : "hsl(var(--fg-dim))";

              return (
                <Link key={h.id} href={`/stock/${h.ticker}`}>
                  <div className="card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                    {/* Ticker + name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "hsl(var(--fg))" }}>{h.ticker}</span>
                        <span style={{ fontSize: 11, color: "hsl(var(--fg-dim))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.shares} sh</span>
                      </div>
                      <div style={{ fontSize: 11, color: "hsl(var(--fg-dim))", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {h.shortName || h.displayName}
                      </div>
                      {/* Allocation bar */}
                      <div style={{ marginTop: 6, height: 3, background: "hsl(var(--border-soft))", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(alloc * 2, 100)}%`, height: "100%", background: "var(--red-hex)", borderRadius: 2 }} />
                      </div>
                    </div>

                    {/* Price + change */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {h.price != null ? (
                        <>
                          <div className="tabular" style={{ fontSize: 15, fontWeight: 700, color: "hsl(var(--fg))" }}>
                            ${formatPrice(h.price)}
                          </div>
                          <div className="tabular" style={{ fontSize: 11, color, fontWeight: 600 }}>
                            {h.changePct >= 0 ? "+" : ""}{h.changePct?.toFixed(2)}%
                          </div>
                          <div style={{ fontSize: 10, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", marginTop: 1 }}>
                            ${formatPrice(h.value, 0)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="skeleton" style={{ width: 56, height: 16, marginBottom: 4 }} />
                          <div className="skeleton" style={{ width: 36, height: 12 }} />
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
        }
      </div>
    </div>
  );
}

// ─── Desktop table ────────────────────────────────────────────────────────────

function DesktopTable({ sorted, isLoading, total, sort, setSort, onDelete }: any) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid hsl(var(--border-soft))" }}>
        <div className="section-label" style={{ marginBottom: 0, flex: 1 }}>Holdings</div>
        <div className="filter-strip">
          {(["value", "changePct", "shares"] as const).map(k => (
            <button key={k} className={`filter-tab ${sort === k ? "active" : ""}`} onClick={() => setSort(k)}>
              {k === "value" ? "Value" : k === "changePct" ? "% Chg" : "Shares"}
            </button>
          ))}
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Ticker</th>
              <th>Name</th>
              <th style={{ textAlign: "right" }}>Shares</th>
              <th style={{ textAlign: "right" }}>Price</th>
              <th style={{ textAlign: "right" }}>Day Chg</th>
              <th style={{ textAlign: "right" }}>% Chg</th>
              <th style={{ textAlign: "right" }}>Value</th>
              <th style={{ textAlign: "right" }}>Alloc</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array(8).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={10}><div className="skeleton" style={{ height: 14 }} /></td></tr>
                ))
              : sorted.map((h: any, i: number) => {
                  const alloc  = total > 0 ? (h.value / total) * 100 : 0;
                  const isUp   = h.changePct > 0;
                  const isDown = h.changePct < 0;
                  const color  = isUp ? "var(--green-hex)" : isDown ? "#ff6b6b" : "hsl(var(--fg-dim))";
                  const pieColor = ["#C8002A","#3b82f6","#22c55e","#f59e0b","#8b5cf6","#06b6d4","#ec4899","#84cc16","#f97316","#64748b","#a78bfa"][i % 11];

                  return (
                    <tr key={h.id} onClick={() => window.location.hash = `/stock/${h.ticker}`}>
                      <td style={{ color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", fontSize: 11 }}>{i + 1}</td>
                      <td><span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700 }}>{h.ticker}</span></td>
                      <td style={{ color: "hsl(var(--fg-muted))", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{h.shortName}</td>
                      <td className="tabular" style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{h.shares}</td>
                      <td className="tabular" style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                        {h.price != null ? `$${formatPrice(h.price)}` : "—"}
                      </td>
                      <td className="tabular" style={{ textAlign: "right", color, fontFamily: "var(--font-mono)" }}>
                        {h.change != null ? `${h.change >= 0 ? "+" : ""}${formatPrice(h.change)}` : "—"}
                      </td>
                      <td className="tabular" style={{ textAlign: "right", color, fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                        {h.changePct != null ? `${h.changePct >= 0 ? "+" : ""}${h.changePct.toFixed(2)}%` : "—"}
                      </td>
                      <td className="tabular" style={{ textAlign: "right", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                        {h.value != null ? `$${formatPrice(h.value, 0)}` : "—"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                          <div style={{ width: 48, height: 4, borderRadius: 2, background: "hsl(var(--border-soft))", overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(alloc * 2, 100)}%`, height: "100%", background: pieColor, borderRadius: 2 }} />
                          </div>
                          <span className="tabular" style={{ fontSize: 11, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", width: 36, textAlign: "right" }}>
                            {alloc.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <button onClick={e => { e.stopPropagation(); onDelete(h.id); }}
                          style={{ background: "none", border: "none", color: "hsl(var(--fg-dim))", cursor: "pointer", fontSize: 16, padding: "2px 6px", borderRadius: 4, lineHeight: 1 }}>
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
