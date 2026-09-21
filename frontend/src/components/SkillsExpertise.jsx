import { useEffect, useState } from "react";
import api from "../api";

const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];

export default function SkillsExpertise() {
  const [skills, setSkills] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coreInput, setCoreInput] = useState("");
  const [domainInput, setDomainInput] = useState("");

  useEffect(() => {
    api.get("/users/me/skills").then((res) => {
      setSkills(res.data);
      setDraft(res.data);
    });
  }, []);

  const addTag = (field, value, clearInput) => {
    if (!value.trim() || draft[field].includes(value.trim())) return;
    setDraft({ ...draft, [field]: [...draft[field], value.trim()] });
    clearInput("");
  };

  const removeTag = (field, tag) => {
    setDraft({ ...draft, [field]: draft[field].filter((t) => t !== tag) });
  };

  const startEdit = () => {
    setDraft(skills);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(skills);
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put("/users/me/skills", draft);
      setSkills(res.data);
      setEditing(false);
    } catch (err) {
      console.error("Error updating skills:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!skills) {
    return (
      <div className="panel">
        <div className="profile-card-title">🎯 Skills & Expertise</div>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading skills...</p>
      </div>
    );
  }

  const view = editing ? draft : skills;
  const tagStyle = (bg, color) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: bg,
    color: color,
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    marginRight: 6,
    marginBottom: 6,
  });

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div className="profile-card-title" style={{ marginBottom: 0 }}>🎯 Skills & Expertise</div>
        {!editing ? (
          <button className="btn btn-outline btn-sm" type="button" onClick={startEdit}>
            ✏ Edit
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-outline btn-sm" type="button" onClick={cancelEdit} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-sm" type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13,color: "var(--text-muted)", marginBottom: 6 }}>Core Skills</div>
        <div>
          {view.core_skills.length === 0 && !editing && (
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>No skills added yet.</span>
          )}
          {view.core_skills.map((s) => (
            <span key={s} style={tagStyle("#eef1ff", "#4f46e5")}>
              {s}
              {editing && (
                <span onClick={() => removeTag("core_skills", s)} style={{ cursor: "pointer", fontWeight: 700 }}>
                  ×
                </span>
              )}
            </span>
          ))}
        </div>
        {editing && (
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input
              value={coreInput}
              onChange={(e) => setCoreInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("core_skills", coreInput, setCoreInput))}
              placeholder="Add a skill and press Enter"
              style={{ padding: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, flex: 1 }}
            />
          </div>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Domain Expertise</div>
        <div>
          {view.domain_expertise.length === 0 && !editing && (
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>No domains added yet.</span>
          )}
          {view.domain_expertise.map((s) => (
            <span key={s} style={tagStyle("#f5eeff", "#7c3aed")}>
              {s}
              {editing && (
                <span onClick={() => removeTag("domain_expertise", s)} style={{ cursor: "pointer", fontWeight: 700 }}>
                  ×
                </span>
              )}
            </span>
          ))}
        </div>
        {editing && (
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("domain_expertise", domainInput, setDomainInput))}
              placeholder="Add a domain and press Enter"
              style={{ padding: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, flex: 1 }}
            />
          </div>
        )}
      </div>

      <div className="profile-info-row">
        <span className="profile-info-label">Experience Level</span>
        {editing ? (
          <select
            value={draft.experience_level || ""}
            onChange={(e) => setDraft({ ...draft, experience_level: e.target.value })}
            style={{ padding: 6, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }}
          >
            <option value="">—</option>
            {EXPERIENCE_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
        ) : (
          <span className="profile-info-value">{skills.experience_level || "—"}</span>
        )}
      </div>
      <div className="profile-info-row">
        <span className="profile-info-label">Total Experience</span>
        {editing ? (
          <input
            type="number"
            step="0.1"
            min="0"
            value={draft.total_experience_years ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, total_experience_years: e.target.value === "" ? null : parseFloat(e.target.value) })
            }
            style={{ padding: 6, border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, width: 80 }}
          />
        ) : (
          <span className="profile-info-value">
            {skills.total_experience_years ? `${skills.total_experience_years} years` : "—"}
          </span>
        )}
      </div>
    </div>
  );
}