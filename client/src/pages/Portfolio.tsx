import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice, formatPct, formatCompact, pctClass } from "@/lib/utils";
import { useState } from "react";
import { Link } from "wouter";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const PIE_COLORS = ["#BC0024","#3b82f6","#22c55e","#f59e0b","#8b5cf6","#06b6d4","#ec4899","#84cc16","#f97316","#64748b","#a78bfa"];

type SortKey = "value" | "changePct" | "change" | "shares";

export default function Portfolio() {
  const qc = useQueryClient();
  const [sort, setSort] = useState<SortKey>("value");
  const [showAdd, setShowAdd] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newCost, setNewCost] = useState("");

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
  const sorted = [...holdings].sort((a: any, b: any) => (b[sort] || 0) - (a[sort] || 0));
  const total = holdings.reduce((s: number, h: any) => s + (h.value || 0), 0);
  const dayChange = holdings.reduce((s: number, h: any) => s + (h.change || 0) * h.shares, 0);
  const positions = holdings.length;
  const up = holdings.filter((h: any) => h.changePct > 0).length;
  const down = holdings.filter((h: any) => h.changePct < 0).length;

  const pieData = [...holdings]
    .filter((h: any) => h.value > 0)
    .sort((a: any, b: any) => b.value - a.value)
    .map((h: any, i: number) => ({ name: h.ticker, value: h.value, color: PIE_COLORS[i % PIE_COLORS.length] }));

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 className="page-title">My Portfolio</h1>
          <p className="page-sub">Tracked via Yahoo Finance · ~15min delayed</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{ background: "#BC0024", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Add Holding
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="kpi-card" style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          {[
            { label: "Ticker", val: newTicker, set: setNewTicker, placeholder: "NVDA" },
            { label: "Shares", val: newShares, set: setNewShares, placeholder: "3" },
            { label: "Cost Basis (opt)", val: newCost, set: setNewCost, placeholder: "120.00" },
          ].map(({ label, val, set, placeholder }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "hsl(var(--muted-foreground))" }}>{label}</label>
              <input
                value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
                style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", padding: "6px 10px", borderRadius: 6, fontSize: 13, width: 140, fontFamily: "var(--font-mono)", outline: "none" }}
              />
            </div>
          ))}
          <button
            onClick={() => addMutation.mutate({ ticker: newTicker.toUpperCase(), shares: parseFloat(newShares), costBasis: newCost ? parseFloat(newCost) : null })}
            disabled={!newTicker || !newShares || addMutation.isPending}
            style={{ background: "#BC0024", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {addMutation.isPending ? "Adding…" : "Add"}
          </button>
        </div>
      )}

      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="section-label">TOTAL VALUE</div>
          <div className="tabular font-bold" style={{ fontSize: 24, letterSpacing: "-0.02em" }}>${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
          <div className={`tabular text-xs font-medium ${pctClass(dayChange)}`}>{dayChange >= 0 ? "+" : ""}${Math.abs(dayChange).toFixed(2)} today</div>
        </div>
        <div className="kpi-card">
          <div className="section-label">POSITIONS</div>
          <div className="tabular font-bold" style={{ fontSize: 24 }}>{positions}</div>
          <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}><span className="up">{up} up</span> · <span className="down">{down} down</span></div>
        </div>
        <div className="kpi-card" style={{ gridColumn: "span 2" }}>
          <div className="section-label" style={{ marginBottom: 8 }}>ALLOCATION</div>
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={48} dataKey="value" paddingAngle={2}>
                {pieData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: any) => [`$${v.toFixed(0)}`, ""]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 4 }}>
            {pieData.map((d: any) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                <span style={{ fontFamily: "var(--font-mono)", color: "hsl(var(--muted-foreground))" }}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings table */}
      <div className="kpi-card" style={{ padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid hsl(var(--border))" }}>
          <div className="section-label" style={{ marginBottom: 0, flex: 1 }}>HOLDINGS</div>
          {(["value","changePct","shares"] as SortKey[]).map(k => (
            <button key={k} onClick={() => setSort(k)} className={`filter-tab ${sort === k ? "active" : ""}`}>
              {k === "value" ? "VALUE" : k === "changePct" ? "% CHG" : "SHARES"}
            </button>
          ))}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>TICKER</th>
                <th>NAME</th>
                <th style={{ textAlign: "right" }}>SHARES</th>
                <th style={{ textAlign: "right" }}>PRICE</th>
                <th style={{ textAlign: "right" }}>DAY CHG</th>
                <th style={{ textAlign: "right" }}>% CHG</th>
                <th style={{ textAlign: "right" }}>VALUE</th>
                <th style={{ textAlign: "right" }}>ALLOC</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(8).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={10}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td></tr>
                ))
                : sorted.map((h: any, i: number) => {
                  const alloc = total > 0 ? (h.value / total) * 100 : 0;
                  return (
                    <tr key={h.id} onClick={() => window.location.hash = `/stock/${h.ticker}`}>
                      <td style={{ color: "hsl(var(--muted-foreground))", fontFamily: "var(--font-mono)", fontSize: 11 }}>{i + 1}</td>
                      <td><span className="tabular font-semibold" style={{ fontSize: 13 }}>{h.ticker}</span></td>
                      <td style={{ color: "hsl(var(--muted-foreground))", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{h.shortName}</td>
                      <td className="tabular" style={{ textAlign: "right" }}>{h.shares}</td>
                      <td className="tabular" style={{ textAlign: "right" }}>${formatPrice(h.price)}</td>
                      <td className={`tabular ${pctClass(h.changePct)}`} style={{ textAlign: "right" }}>{h.change >= 0 ? "+" : ""}{formatPrice(h.change)}</td>
                      <td className={`tabular font-medium ${pctClass(h.changePct)}`} style={{ textAlign: "right" }}>{formatPct(h.changePct)}</td>
                      <td className="tabular font-semibold" style={{ textAlign: "right" }}>${formatPrice(h.value, 0)}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                          <div style={{ width: 48, height: 4, borderRadius: 2, background: "hsl(var(--border))", overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(alloc * 2, 100)}%`, height: "100%", background: "#BC0024", borderRadius: 2 }} />
                          </div>
                          <span className="tabular" style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", width: 36, textAlign: "right" }}>{alloc.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (confirm(`Remove ${h.ticker}?`)) deleteMutation.mutate(h.id); }}
                          style={{ background: "none", border: "none", color: "hsl(var(--muted-foreground))", cursor: "pointer", fontSize: 14, padding: "2px 6px", borderRadius: 4 }}
                        >×</button>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
