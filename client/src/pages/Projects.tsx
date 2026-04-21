import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Milestone {
  id: string;
  text: string;
  done: boolean;
}

type ProjectStatus = "active" | "paused" | "completed" | "archived";

interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  category: string;
  milestones: Milestone[];
  notes: string;
  linkedContactIds: string[];
  createdAt: string;
}

interface Contact {
  id: string;
  name: string;
  title?: string;
  company?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "torii-projects";
const CONTACTS_KEY = "torii-contacts";

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  active:    { label: "Active",    color: "#22C55E", bg: "rgba(34,197,94,0.1)" },
  paused:    { label: "Paused",    color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  completed: { label: "Completed", color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
  archived:  { label: "Archived",  color: "#525268", bg: "rgba(82,82,104,0.12)" },
};

const CATEGORIES = [
  "Research", "Investment Thesis", "Due Diligence", "Portfolio", "Networking",
  "Operations", "Market Analysis", "Other",
];

const DEFAULT_PROJECTS: Project[] = [
  {
    id: "default-1",
    name: "Japan Market Entry Research",
    description: "Deep-dive into Japan's financial landscape, key players, regulatory framework, and opportunity areas for market entry.",
    status: "active",
    category: "Research",
    notes: "",
    linkedContactIds: [],
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    milestones: [
      { id: "m1", text: "Map top 20 Japanese financial firms", done: true },
      { id: "m2", text: "Review FSA regulatory requirements", done: true },
      { id: "m3", text: "Connect with 5 Japan-based advisors", done: false },
      { id: "m4", text: "Compile competitive intelligence report", done: false },
      { id: "m5", text: "Present findings to team", done: false },
    ],
  },
  {
    id: "default-2",
    name: "Portfolio Rebalancing Q2",
    description: "Evaluate current holdings allocation, run scenario analysis on USD/JPY exposure, and finalize rebalancing plan.",
    status: "active",
    category: "Investment Thesis",
    notes: "Focus on reducing JPY exposure. Consider trimming MUFG if yen strengthens past 148.",
    linkedContactIds: [],
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    milestones: [
      { id: "m1", text: "Run current allocation analysis", done: true },
      { id: "m2", text: "USD/JPY scenario modeling", done: false },
      { id: "m3", text: "Review VRT + NVDA thesis", done: false },
      { id: "m4", text: "Execute rebalancing trades", done: false },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROJECTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PROJECTS;
  } catch {
    return DEFAULT_PROJECTS;
  }
}

function saveProjects(projects: Project[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {}
}

function loadContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── New Project Modal ────────────────────────────────────────────────────────

interface NewProjectModalProps {
  onClose: () => void;
  onAdd: (project: Project) => void;
}

function NewProjectModal({ onClose, onAdd }: NewProjectModalProps) {
  const [form, setForm] = useState({
    name: "", description: "", status: "active" as ProjectStatus,
    category: "Research", milestoneText: "", notes: "",
  });
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [mInput, setMInput] = useState("");

  function addMilestone() {
    if (!mInput.trim()) return;
    setMilestones((m) => [...m, { id: uid(), text: mInput.trim(), done: false }]);
    setMInput("");
  }

  function removeMilestone(id: string) {
    setMilestones((m) => m.filter((x) => x.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const project: Project = {
      id: uid(),
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
      category: form.category,
      milestones,
      notes: form.notes.trim(),
      linkedContactIds: [],
      createdAt: new Date().toISOString(),
    };
    onAdd(project);
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "hsl(var(--surface2))", border: "1px solid hsl(var(--border-soft))",
    borderRadius: 8, color: "hsl(var(--fg))", fontSize: 12, fontFamily: "var(--font-mono)",
    padding: "7px 12px", outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 600, letterSpacing: "0.08em",
    textTransform: "uppercase" as const, color: "hsl(var(--fg-dim))", display: "block", marginBottom: 5,
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--fg))", fontFamily: "var(--font-mono)" }}>
            New Project
          </span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 18 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Project Name *</label>
            <input style={inputStyle} placeholder="e.g. Japan Market Entry" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} placeholder="What is this project about?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 12px", marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProjectStatus }))}>
                {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Milestones</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Add milestone..."
                value={mInput}
                onChange={(e) => setMInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMilestone(); } }}
              />
              <button
                type="button"
                onClick={addMilestone}
                style={{
                  padding: "7px 12px", borderRadius: 8, background: "hsl(var(--surface))",
                  border: "1px solid hsl(var(--border-soft))", color: "hsl(var(--fg-muted))",
                  fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer",
                }}
              >
                + Add
              </button>
            </div>
            {milestones.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, border: "1.5px solid hsl(var(--border))", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "hsl(var(--fg-muted))", fontFamily: "var(--font-mono)", flex: 1 }}>{m.text}</span>
                <button type="button" onClick={() => removeMilestone(m.id)} style={{ background: "none", border: "none", color: "hsl(var(--fg-dim))", cursor: "pointer", fontSize: 10 }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} placeholder="Initial notes..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "7px 16px", borderRadius: 8, background: "hsl(var(--surface2))", border: "1px solid hsl(var(--border-soft))", color: "hsl(var(--fg-muted))", fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer" }}>Cancel</button>
            <button type="submit" style={{ padding: "7px 16px", borderRadius: 8, background: "var(--red-hex)", border: "none", color: "#fff", fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700, cursor: "pointer" }}>Create Project</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  contacts: Contact[];
  onUpdate: (project: Project) => void;
  onDelete: (id: string) => void;
}

function ProjectCard({ project, contacts, onUpdate, onDelete }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [notes, setNotes] = useState(project.notes);

  const cfg = STATUS_CONFIG[project.status];
  const done = project.milestones.filter((m) => m.done).length;
  const total = project.milestones.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  function toggleMilestone(id: string) {
    const updated = { ...project, milestones: project.milestones.map((m) => m.id === id ? { ...m, done: !m.done } : m) };
    onUpdate(updated);
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onUpdate({ ...project, status: e.target.value as ProjectStatus });
  }

  function handleNotesBlur() {
    if (notes !== project.notes) {
      onUpdate({ ...project, notes });
    }
  }

  const linkedContacts = contacts.filter((c) => project.linkedContactIds.includes(c.id));

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "hsl(var(--fg))", letterSpacing: "-0.01em" }}>
              {project.name}
            </span>
            <span style={{
              fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.06em",
              textTransform: "uppercase", padding: "2px 8px", borderRadius: 999,
              background: cfg.bg, color: cfg.color,
            }}>
              {cfg.label}
            </span>
            <span style={{
              fontSize: 9, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 999,
              background: "hsl(var(--surface2))", border: "1px solid hsl(var(--border-soft))", color: "hsl(var(--fg-dim))",
            }}>
              {project.category}
            </span>
          </div>
          {project.description && (
            <p style={{ fontSize: 12, color: "hsl(var(--fg-muted))", marginTop: 5, lineHeight: 1.6 }}>
              {project.description}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{ background: "none", border: "none", color: "hsl(var(--fg-dim))", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-mono)", padding: "2px 4px" }}
          >
            {expanded ? "▲" : "▼"}
          </button>
          <button
            onClick={() => onDelete(project.id)}
            style={{ background: "none", border: "none", color: "hsl(var(--fg-dim))", cursor: "pointer", fontSize: 11, padding: "2px 4px" }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Milestones
            </span>
            <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-muted))", fontWeight: 600 }}>
              {done}/{total} · {pct}%
            </span>
          </div>
          <div style={{ height: 4, background: "hsl(var(--surface2))", borderRadius: 999 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: cfg.color, borderRadius: 999, transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <>
          {/* Milestones */}
          {project.milestones.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {project.milestones.map((m) => (
                <div
                  key={m.id}
                  style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "3px 0", cursor: "pointer" }}
                  onClick={() => toggleMilestone(m.id)}
                >
                  <div
                    className={`task-check ${m.done ? "checked" : ""}`}
                    style={{ marginTop: 2 }}
                  >
                    {m.done && (
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                        <polyline points="1.5,5 4,7.5 8.5,2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span style={{
                    fontSize: 12, color: m.done ? "hsl(var(--fg-dim))" : "hsl(var(--fg-muted))",
                    textDecoration: m.done ? "line-through" : "none", lineHeight: 1.5, flex: 1,
                    fontFamily: "var(--font-mono)",
                  }}>
                    {m.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(var(--fg-dim))", marginBottom: 5 }}>Notes</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add project notes..."
              style={{
                width: "100%", background: "hsl(var(--surface2))", border: "1px solid hsl(var(--border-soft))",
                borderRadius: 8, color: "hsl(var(--fg-muted))", fontSize: 12, fontFamily: "var(--font-mono)",
                padding: "8px 10px", outline: "none", resize: "vertical", minHeight: 64,
              }}
            />
          </div>

          {/* Footer controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={project.status}
              onChange={handleStatusChange}
              style={{
                background: "hsl(var(--surface2))", border: "1px solid hsl(var(--border-soft))",
                borderRadius: 6, color: cfg.color, fontSize: 10, fontFamily: "var(--font-mono)",
                fontWeight: 700, padding: "3px 8px", outline: "none", cursor: "pointer",
              }}
            >
              {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
            <span style={{ fontSize: 10, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", marginLeft: "auto" }}>
              {new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [contacts] = useState<Contact[]>(loadContacts);
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  function addProject(project: Project) {
    setProjects((prev) => [project, ...prev]);
  }

  function updateProject(project: Project) {
    setProjects((prev) => prev.map((p) => (p.id === project.id ? project : p)));
  }

  function deleteProject(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  const filtered = projects.filter((p) => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchStatus && matchCat;
  });

  const usedCategories = Array.from(new Set(projects.map((p) => p.category)));

  // Summary stats
  const stats = (Object.keys(STATUS_CONFIG) as ProjectStatus[]).map((s) => ({
    ...STATUS_CONFIG[s],
    id: s,
    count: projects.filter((p) => p.status === s).length,
  }));

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-sub">Research & thesis tracker · {projects.length} projects</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 999,
            background: "var(--red-hex)", border: "none",
            color: "#fff", fontSize: 12, fontFamily: "var(--font-mono)",
            fontWeight: 700, cursor: "pointer",
          }}
        >
          + New Project
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {stats.map((s) => (
          <div
            key={s.id}
            style={{
              padding: "8px 14px", borderRadius: 10,
              background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-soft))",
              display: "flex", flexDirection: "column", gap: 3, minWidth: 90,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
              <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "hsl(var(--fg-dim))" }}>
                {s.label}
              </span>
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)", color: "hsl(var(--fg))", lineHeight: 1 }}>
              {s.count}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        <button className={`filter-chip ${statusFilter === "all" ? "active" : ""}`} onClick={() => setStatusFilter("all")}>All</button>
        {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map((s) => (
          <button key={s} className={`filter-chip ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
            {STATUS_CONFIG[s].label}
          </button>
        ))}
        <div style={{ width: 1, background: "hsl(var(--border-soft))", margin: "0 4px" }} />
        {usedCategories.map((c) => (
          <button key={c} className={`filter-chip ${categoryFilter === c ? "active" : ""}`} onClick={() => setCategoryFilter(categoryFilter === c ? "all" : c)}>
            {c}
          </button>
        ))}
      </div>

      {/* Project list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          No projects match · <button onClick={() => setShowNew(true)} style={{ background: "none", border: "none", color: "var(--red-hex)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 12 }}>create one</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 0 }}>
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} contacts={contacts} onUpdate={updateProject} onDelete={deleteProject} />
          ))}
        </div>
      )}

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onAdd={addProject} />}
    </div>
  );
}
