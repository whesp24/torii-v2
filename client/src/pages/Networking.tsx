import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  linkedInUrl: string;
  tags: string[];
  note: string;
  stage: string;
  addedAt: string;
}

interface LinkedInFilters {
  keywords: string;
  title: string;
  company: string;
  location: string;
  industry: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { id: "not-contacted", label: "Not Contacted", color: "#525268" },
  { id: "reached-out",   label: "Reached Out",   color: "#F59E0B" },
  { id: "replied",       label: "Replied",        color: "#3B82F6" },
  { id: "meeting",       label: "Meeting Set",    color: "#A855F7" },
  { id: "connected",     label: "Connected",      color: "#22C55E" },
];

const INDUSTRIES = [
  "Finance", "Banking", "VC/PE", "Technology", "Consulting",
  "Hedge Fund", "Asset Mgmt", "Japan-Focused",
];

const LOCATIONS = ["Tokyo", "New York", "San Francisco", "London", "Singapore", "Hong Kong", "Any"];

const LOCATION_URNS: Record<string, string> = {
  "Tokyo": "104173657",
  "New York": "102571732",
  "San Francisco": "102277331",
  "London": "90009496",
  "Singapore": "102454443",
  "Hong Kong": "103291313",
};

const STORAGE_KEY = "torii-contacts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveContacts(contacts: Contact[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  } catch {}
}

function buildLinkedInURL(filters: LinkedInFilters): string {
  const params = new URLSearchParams();
  if (filters.keywords) params.set("keywords", filters.keywords);
  if (filters.title) params.set("title", filters.title);
  if (filters.company) params.set("currentCompany", filters.company);
  if (filters.location && filters.location !== "Any") {
    const urn = LOCATION_URNS[filters.location];
    if (urn) params.set("geoUrn", `["${urn}"]`);
  }
  if (filters.industry) params.set("industry", filters.industry);
  params.set("origin", "FACETED_SEARCH");
  return `https://www.linkedin.com/search/results/people/?${params.toString()}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Add Contact Modal ────────────────────────────────────────────────────────

interface AddContactModalProps {
  onClose: () => void;
  onAdd: (contact: Contact) => void;
}

function AddContactModal({ onClose, onAdd }: AddContactModalProps) {
  const [form, setForm] = useState({
    name: "", title: "", company: "", location: "",
    linkedInUrl: "", tags: "", note: "", stage: "not-contacted",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const contact: Contact = {
      id: uid(),
      name: form.name.trim(),
      title: form.title.trim(),
      company: form.company.trim(),
      location: form.location.trim(),
      linkedInUrl: form.linkedInUrl.trim(),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      note: form.note.trim(),
      stage: form.stage,
      addedAt: new Date().toISOString(),
    };
    onAdd(contact);
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "hsl(var(--surface2))",
    border: "1px solid hsl(var(--border-soft))",
    borderRadius: 8,
    color: "hsl(var(--fg))",
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    padding: "7px 12px",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontFamily: "var(--font-mono)",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "hsl(var(--fg-dim))",
    display: "block",
    marginBottom: 5,
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--fg))", fontFamily: "var(--font-mono)" }}>
            Add Contact
          </span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 12px" }}>
            {[
              { field: "name", label: "Name *", placeholder: "Full name" },
              { field: "title", label: "Title", placeholder: "e.g. VP Finance" },
              { field: "company", label: "Company", placeholder: "e.g. Goldman Sachs" },
              { field: "location", label: "Location", placeholder: "e.g. Tokyo" },
            ].map(({ field, label, placeholder }) => (
              <div key={field}>
                <label style={labelStyle}>{label}</label>
                <input
                  style={inputStyle}
                  placeholder={placeholder}
                  value={(form as any)[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>LinkedIn URL</label>
            <input
              style={inputStyle}
              placeholder="https://linkedin.com/in/..."
              value={form.linkedInUrl}
              onChange={(e) => setForm((f) => ({ ...f, linkedInUrl: e.target.value }))}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>Tags (comma-separated)</label>
            <input
              style={inputStyle}
              placeholder="e.g. VC, Japan, Mentor"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>Pipeline Stage</label>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={form.stage}
              onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: 64 }}
              placeholder="Add notes..."
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "7px 16px", borderRadius: 8,
                background: "hsl(var(--surface2))", border: "1px solid hsl(var(--border-soft))",
                color: "hsl(var(--fg-muted))", fontSize: 12, fontFamily: "var(--font-mono)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "7px 16px", borderRadius: 8,
                background: "var(--red-hex)", border: "none",
                color: "#fff", fontSize: 12, fontFamily: "var(--font-mono)",
                fontWeight: 700, cursor: "pointer",
              }}
            >
              Add Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Contact Card ─────────────────────────────────────────────────────────────

interface ContactCardProps {
  contact: Contact;
  onUpdate: (contact: Contact) => void;
  onDelete: (id: string) => void;
}

function ContactCard({ contact, onUpdate, onDelete }: ContactCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(contact.note);

  const stage = PIPELINE_STAGES.find((s) => s.id === contact.stage);

  function handleStageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onUpdate({ ...contact, stage: e.target.value });
  }

  function handleNoteBlur() {
    if (note !== contact.note) {
      onUpdate({ ...contact, note });
    }
  }

  return (
    <div className="contact-card">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div className="contact-avatar">{getInitials(contact.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--fg))", lineHeight: 1 }}>
              {contact.name}
            </span>
            {contact.linkedInUrl && (
              <a
                href={contact.linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link-btn"
                style={{ padding: "2px 8px", fontSize: 9 }}
              >
                in
              </a>
            )}
            <button
              onClick={() => onDelete(contact.id)}
              style={{
                marginLeft: "auto", background: "none", border: "none",
                color: "hsl(var(--fg-dim))", cursor: "pointer", fontSize: 11,
                padding: "0 2px", lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
          {contact.title && (
            <div style={{ fontSize: 11, color: "hsl(var(--fg-muted))", marginTop: 2 }}>
              {contact.title}{contact.company ? ` · ${contact.company}` : ""}
            </div>
          )}
          {contact.location && (
            <div style={{ fontSize: 10, color: "hsl(var(--fg-dim))", marginTop: 1, fontFamily: "var(--font-mono)" }}>
              {contact.location}
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      {contact.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          {contact.tags.map((tag) => (
            <span
              key={tag}
              style={{
                padding: "2px 8px", borderRadius: 999, fontSize: 9,
                fontFamily: "var(--font-mono)", fontWeight: 600,
                background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-soft))",
                color: "hsl(var(--fg-muted))",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Stage + expand */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <select
          value={contact.stage}
          onChange={handleStageChange}
          style={{
            background: "hsl(var(--surface2))", border: "1px solid hsl(var(--border-soft))",
            borderRadius: 6, color: stage?.color ?? "hsl(var(--fg-muted))",
            fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700,
            padding: "3px 8px", outline: "none", cursor: "pointer",
          }}
        >
          {PIPELINE_STAGES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            marginLeft: "auto", background: "none", border: "none",
            color: "hsl(var(--fg-dim))", cursor: "pointer",
            fontSize: 10, fontFamily: "var(--font-mono)",
          }}
        >
          {expanded ? "▲ less" : "▼ notes"}
        </button>
      </div>

      {/* Notes */}
      {expanded && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={handleNoteBlur}
          placeholder="Add notes..."
          style={{
            marginTop: 8, width: "100%",
            background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-soft))",
            borderRadius: 6, color: "hsl(var(--fg-muted))",
            fontSize: 11, fontFamily: "var(--font-mono)",
            padding: "6px 8px", outline: "none", resize: "vertical", minHeight: 56,
          }}
        />
      )}
    </div>
  );
}

// ─── LinkedIn Finder ──────────────────────────────────────────────────────────

function LinkedInFinder() {
  const [filters, setFilters] = useState<LinkedInFilters>({
    keywords: "", title: "", company: "", location: "Any", industry: "",
  });

  const url = buildLinkedInURL(filters);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "hsl(var(--surface2))",
    border: "1px solid hsl(var(--border-soft))",
    borderRadius: 8,
    color: "hsl(var(--fg))",
    fontSize: 11,
    fontFamily: "var(--font-mono)",
    padding: "6px 10px",
    outline: "none",
  };

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(var(--fg-dim))" }}>
          LinkedIn Search Finder
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="link-btn"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Open in LinkedIn
        </a>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <div>
          <label style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", display: "block", marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>Keywords</label>
          <input style={inputStyle} placeholder="finance analyst" value={filters.keywords} onChange={(e) => setFilters((f) => ({ ...f, keywords: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", display: "block", marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>Title</label>
          <input style={inputStyle} placeholder="VP, Director" value={filters.title} onChange={(e) => setFilters((f) => ({ ...f, title: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", display: "block", marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>Company</label>
          <input style={inputStyle} placeholder="Goldman, Softbank" value={filters.company} onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", display: "block", marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>Location</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={filters.location} onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}>
            {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", display: "block", marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>Industry</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={filters.industry} onChange={(e) => setFilters((f) => ({ ...f, industry: e.target.value }))}>
            <option value="">Any</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  stage: typeof PIPELINE_STAGES[0];
  contacts: Contact[];
  onUpdate: (contact: Contact) => void;
  onDelete: (id: string) => void;
}

function KanbanColumn({ stage, contacts, onUpdate, onDelete }: KanbanColumnProps) {
  return (
    <div style={{
      minWidth: 220, maxWidth: 260, flex: "0 0 240px",
      background: "hsl(var(--surface))",
      border: "1px solid hsl(var(--border-soft))",
      borderRadius: 12, padding: "10px 8px",
      display: "flex", flexDirection: "column", gap: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "0 4px" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: stage.color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase", color: "hsl(var(--fg-muted))" }}>
          {stage.label}
        </span>
        <span style={{
          marginLeft: "auto", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700,
          background: "hsl(var(--surface2))", border: "1px solid hsl(var(--border-soft))",
          borderRadius: 999, padding: "1px 7px", color: "hsl(var(--fg-dim))",
        }}>
          {contacts.length}
        </span>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {contacts.map((c) => (
          <ContactCard key={c.id} contact={c} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
        {contacts.length === 0 && (
          <div style={{ fontSize: 10, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", textAlign: "center", padding: "20px 8px" }}>
            No contacts
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Networking() {
  const [contacts, setContacts] = useState<Contact[]>(loadContacts);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  useEffect(() => {
    saveContacts(contacts);
  }, [contacts]);

  function addContact(contact: Contact) {
    setContacts((prev) => [contact, ...prev]);
  }

  function updateContact(contact: Contact) {
    setContacts((prev) => prev.map((c) => (c.id === contact.id ? contact : c)));
  }

  function deleteContact(id: string) {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q));
    const matchStage = stageFilter === "all" || c.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const contactsByStage = PIPELINE_STAGES.reduce<Record<string, Contact[]>>((acc, s) => {
    acc[s.id] = filtered.filter((c) => c.stage === s.id);
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Network</h1>
          <p className="page-sub">Contact pipeline · {contacts.length} contacts tracked</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 999,
            background: "var(--red-hex)", border: "none",
            color: "#fff", fontSize: 12, fontFamily: "var(--font-mono)",
            fontWeight: 700, cursor: "pointer",
          }}
        >
          + Add Contact
        </button>
      </div>

      {/* Pipeline summary stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {PIPELINE_STAGES.map((s) => {
          const count = contacts.filter((c) => c.stage === s.id).length;
          return (
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
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* LinkedIn Finder */}
      <LinkedInFinder />

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {/* Search */}
        <input
          className="search-input-field"
          style={{ flex: 1, minWidth: 160, maxWidth: 280 }}
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Stage filter chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            className={`filter-chip ${stageFilter === "all" ? "active" : ""}`}
            onClick={() => setStageFilter("all")}
          >
            All
          </button>
          {PIPELINE_STAGES.map((s) => (
            <button
              key={s.id}
              className={`filter-chip ${stageFilter === s.id ? "active" : ""}`}
              onClick={() => setStageFilter(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", background: "hsl(var(--surface2))", borderRadius: 8, padding: 2, border: "1px solid hsl(var(--border-soft))", marginLeft: "auto" }}>
          {(["kanban", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: view === v ? "hsl(var(--surface))" : "transparent",
                color: view === v ? "hsl(var(--fg))" : "hsl(var(--fg-dim))",
                transition: "all 0.12s",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Views */}
      {view === "kanban" ? (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
          {PIPELINE_STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              contacts={contactsByStage[stage.id] ?? []}
              onUpdate={updateContact}
              onDelete={deleteContact}
            />
          ))}
        </div>
      ) : (
        <div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              No contacts match
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
              {filtered.map((c) => (
                <ContactCard key={c.id} contact={c} onUpdate={updateContact} onDelete={deleteContact} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <AddContactModal onClose={() => setShowAdd(false)} onAdd={addContact} />
      )}
    </div>
  );
}
