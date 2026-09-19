import { useEffect, useState } from "react";
import api from "../api";
import AppShell from "../components/AppShell";
import SprintHealthModal from "../components/SprintHealthModal";

const inputStyle = {
  padding: "10px 12px",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "14px",
  width: "100%",
  boxSizing: "border-box",
};

const apiMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;

  return typeof detail === "string"
    ? detail
    : fallback;
};

export default function Sprints() {
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [issues, setIssues] = useState([]);

  /* ==============================
     CREATE FORM
  ============================== */

  const [form, setForm] = useState({
    name: "",
    project_id: "",
    start_date: "",
    end_date: "",
  });

  /* ==============================
     FILTER
  ============================== */

  const [projectFilter, setProjectFilter] = useState("");

  /* ==============================
     ERROR
  ============================== */

  const [actionError, setActionError] = useState("");

  /* ==============================
     DETAILS
  ============================== */

  const [expandedId, setExpandedId] = useState(null);

  /* ==============================
     EDIT
  ============================== */

  const [editingId, setEditingId] = useState(null);

  const [editForm, setEditForm] = useState({
    name: "",
    project_id: "",
    start_date: "",
    end_date: "",
  });

  /* ==============================
     AI HEALTH MODAL
  ============================== */

  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [selectedSprintForHealth, setSelectedSprintForHealth] = useState(null);

  /* ==============================
     LOAD DATA
  ============================== */

  const load = async () => {
    try {
      const [projectsRes, sprintsRes, issuesRes] =
        await Promise.all([
          api.get("/projects"),
          api.get("/sprints"),
          api.get("/issues"),
        ]);

      setProjects(projectsRes.data);
      setSprints(sprintsRes.data);
      setIssues(issuesRes.data);

      if (
        projectsRes.data.length > 0 &&
        !form.project_id
      ) {
        setForm((prev) => ({
          ...prev,
          project_id: projectsRes.data[0].id,
        }));
      }
    } catch (err) {
      console.error("Failed to load sprint data:", err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ==============================
     CREATE SPRINT
  ============================== */

  const handleSubmit = async (e) => {
    e.preventDefault();

    setActionError("");

    try {
      await api.post("/sprints", {
        ...form,
        project_id: Number(form.project_id),
      });

      setForm((prev) => ({
        ...prev,
        name: "",
        start_date: "",
        end_date: "",
      }));

      await load();

    } catch (err) {
      console.error("Create sprint error:", err);

      const status = err.response?.status;

      const detail = err.response?.data?.detail;

      if (status === 403) {
        setActionError(
          detail ||
            "Permission denied - You do not have permission to create a sprint."
        );

      } else if (status === 401) {
        setActionError(
          "You are not authorized. Please login again."
        );

      } else {
        setActionError(
          typeof detail === "string"
            ? detail
            : "Unable to create sprint. Please try again."
        );
      }
    }
  };

  /* ==============================
     EDIT SPRINT
  ============================== */

  const startEdit = (sprint) => {
    setEditingId(sprint.id);

    setActionError("");

    setEditForm({
      name: sprint.name,
      project_id: sprint.project_id,
      start_date: sprint.start_date || "",
      end_date: sprint.end_date || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async (sprintId) => {
    setActionError("");

    try {
      await api.put(`/sprints/${sprintId}`, {
        ...editForm,
        project_id: Number(editForm.project_id),
      });

      setEditingId(null);

      await load();

    } catch (err) {
      console.error("Update sprint error:", err);

      const status = err.response?.status;

      const detail = err.response?.data?.detail;

      if (status === 403) {
        setActionError(
          detail ||
            "Permission denied - You do not have permission to update this sprint."
        );
      } else {
        setActionError(
          apiMessage(
            err,
            "Unable to update sprint. Please try again."
          )
        );
      }
    }
  };

  /* ==============================
     DELETE SPRINT
  ============================== */

  const handleDelete = async (sprintId) => {
    const confirmed = window.confirm(
      "Delete this sprint? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setActionError("");

    try {
      await api.delete(`/sprints/${sprintId}`);

      await load();

    } catch (err) {
      console.error("Delete sprint error:", err);

      const status = err.response?.status;

      const detail = err.response?.data?.detail;

      if (status === 403) {
        setActionError(
          detail ||
            "Permission denied - You do not have permission to delete this sprint."
        );
      } else {
        setActionError(
          apiMessage(
            err,
            "Unable to delete sprint. Please try again."
          )
        );
      }
    }
  };

  /* ==============================
     HELPERS
  ============================== */

  const projectName = (projectId) => {
    const project = projects.find(
      (p) => p.id === projectId
    );

    return project?.name || "Unknown Project";
  };

  const issuesInSprint = (sprintId) => {
    return issues.filter(
      (issue) => issue.sprint_id === sprintId
    );
  };

  const formatDate = (date) => {
    if (!date) {
      return "?";
    }

    const dt = new Date(date);

    if (Number.isNaN(dt.getTime())) {
      return date;
    }

    return dt.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* ==============================
     PROJECT FILTER
  ============================== */

  const visibleSprints = projectFilter
    ? sprints.filter(
        (sprint) =>
          String(sprint.project_id) ===
          String(projectFilter)
      )
    : sprints;

  /* ==============================
     UI
  ============================== */

  return (
    <AppShell>

      <div className="page">

        {/* =================================
            PAGE HEADER
        ================================= */}

        <div className="sprint-page-header">

          <div>
            <h2>Sprints</h2>

            <p className="page-subtitle">
              Plan and organize work into time-boxed
              sprints.
            </p>
          </div>

        </div>

        {/* =================================
            ERROR MESSAGE
        ================================= */}

        {actionError && (
          <div className="sprint-error">

            <div className="sprint-error-icon">
              !
            </div>

            <div className="sprint-error-content">

              <div className="sprint-error-title">
                Action Not Allowed
              </div>

              <div className="sprint-error-message">
                {actionError}
              </div>

            </div>

            <button
              type="button"
              className="sprint-error-close"
              onClick={() =>
                setActionError("")
              }
            >
              ×
            </button>

          </div>
        )}

        {/* =================================
            CREATE SPRINT CARD
        ================================= */}

        <div className="sprint-create-card">

          {/* LEFT CONTENT */}

          <div className="sprint-create-left">

            <div className="sprint-create-header">

              <div className="sprint-create-icon">
                🗓
              </div>

              <h3>
                Create New Sprint
              </h3>

            </div>

            <form
              id="create-sprint-form"
              onSubmit={handleSubmit}
              className="sprint-create-form"
            >

              {/* PROJECT + NAME */}

              <div className="sprint-form-row">

                <div className="sprint-form-field">

                  <label>
                    Select Project
                  </label>

                  <select
                    value={form.project_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        project_id:
                          e.target.value,
                      })
                    }
                    required
                  >

                    <option value="">
                      Select a project
                    </option>

                    {projects.map((project) => (
                      <option
                        key={project.id}
                        value={project.id}
                      >
                        {project.name}
                      </option>
                    ))}

                  </select>

                </div>

                <div className="sprint-form-field">

                  <label>
                    Sprint Name
                  </label>

                  <input
                    type="text"
                    placeholder="e.g., Sprint 3 - Bug Fixes"
                    value={form.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value,
                      })
                    }
                    required
                  />

                </div>

              </div>

              {/* START + END DATE */}

              <div className="sprint-form-row">

                <div className="sprint-form-field">

                  <label>
                    Start Date
                  </label>

                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        start_date:
                          e.target.value,
                      })
                    }
                  />

                </div>

                <div className="sprint-form-field">

                  <label>
                    End Date
                  </label>

                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        end_date:
                          e.target.value,
                      })
                    }
                  />

                </div>

              </div>

            </form>

          </div>

          {/* =================================
              RIGHT SIDE
          ================================= */}

          <div className="sprint-create-right">

            {/* CALENDAR */}

            <div
              className="sprint-calendar"
              aria-hidden="true"
            >

              <div className="calendar-body">

                <div className="calendar-binding binding-one" />

                <div className="calendar-binding binding-two" />

                <div className="calendar-header" />

                <div className="calendar-days">

                  {Array.from({
                    length: 12,
                  }).map((_, index) => (
                    <span key={index} />
                  ))}

                </div>

              </div>

              <div className="calendar-clock">

                <div className="clock-hour" />

                <div className="clock-minute" />

              </div>

            </div>

            {/* CREATE BUTTON */}

            <button
              className="btn sprint-create-btn"
              type="submit"
              form="create-sprint-form"
              disabled={projects.length === 0}
            >
              Create Sprint
            </button>

          </div>

        </div>

        {/* =================================
            ALL SPRINTS HEADER
        ================================= */}

        <div className="sprint-list-header">

          <h3>
            All Sprints
          </h3>

          {/* ONLY PROJECT FILTER */}

          <div className="sprint-filter-wrapper">

            <select
              className="sprint-project-filter"
              value={projectFilter}
              onChange={(e) =>
                setProjectFilter(
                  e.target.value
                )
              }
            >

              <option value="">
                All Projects
              </option>

              {projects.map((project) => (
                <option
                  key={project.id}
                  value={project.id}
                >
                  {project.name}
                </option>
              ))}

            </select>

          </div>

        </div>

        {/* =================================
            SPRINT GRID
        ================================= */}

        <div className="sprint-grid">

          {visibleSprints.map((sprint) => {

            const sprintIssues =
              issuesInSprint(sprint.id);

            const total =
              sprintIssues.length;

            const completed =
              sprintIssues.filter(
                (issue) =>
                  issue.status === "resolved"
              ).length;

            const inProgress =
              sprintIssues.filter(
                (issue) =>
                  issue.status ===
                    "in_progress" ||
                  issue.status ===
                    "in_review"
              ).length;

            const todo =
              sprintIssues.filter(
                (issue) =>
                  issue.status === "open"
              ).length;

            const progress =
              total > 0
                ? Math.round(
                    (completed / total) *
                      100
                  )
                : 0;

            const isComplete =
              total > 0 &&
              completed === total;

            const isExpanded =
              expandedId === sprint.id;

            const isEditing =
              editingId === sprint.id;

            /* =================================
               EDIT CARD
            ================================= */

            if (isEditing) {
              return (
                <div
                  className="sprint-card"
                  key={sprint.id}
                >

                  <div className="sprint-edit-form">

                    <h4>
                      Edit Sprint
                    </h4>

                    <select
                      value={
                        editForm.project_id
                      }
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          project_id:
                            e.target.value,
                        })
                      }
                      style={inputStyle}
                    >

                      {projects.map(
                        (project) => (
                          <option
                            key={project.id}
                            value={project.id}
                          >
                            {project.name}
                          </option>
                        )
                      )}

                    </select>

                    <input
                      type="text"
                      value={
                        editForm.name
                      }
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          name: e.target.value,
                        })
                      }
                      style={inputStyle}
                    />

                    <div className="edit-date-row">

                      <input
                        type="date"
                        value={
                          editForm.start_date
                        }
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            start_date:
                              e.target.value,
                          })
                        }
                        style={inputStyle}
                      />

                      <input
                        type="date"
                        value={
                          editForm.end_date
                        }
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            end_date:
                              e.target.value,
                          })
                        }
                        style={inputStyle}
                      />

                    </div>

                    <div className="edit-actions">

                      <button
                        className="btn btn-sm"
                        type="button"
                        onClick={() =>
                          handleUpdate(
                            sprint.id
                          )
                        }
                      >
                        Save
                      </button>

                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        onClick={
                          cancelEdit
                        }
                      >
                        Cancel
                      </button>

                    </div>

                  </div>

                </div>
              );
            }

            /* =================================
               NORMAL SPRINT CARD
            ================================= */

            return (
              <div
                className="sprint-card"
                key={sprint.id}
              >

                {/* CARD HEADER */}

                <div className="sprint-card-top">

                  <div className="sprint-card-info">

                    <h4 className="sprint-card-title">
                      {sprint.name}
                    </h4>

                    <p className="sprint-card-project">
                      {projectName(
                        sprint.project_id
                      )}
                    </p>

                  </div>

                  <span
                    className={`sprint-status-badge ${
                      isComplete
                        ? "complete"
                        : "active"
                    }`}
                  >
                    {isComplete
                      ? "✓ Completed"
                      : "◷ In Progress"}
                  </span>

                </div>

                {/* DATES */}

                {sprint.start_date && (
                  <p className="sprint-card-dates">
                    📅{" "}
                    {formatDate(
                      sprint.start_date
                    )}
                    {" → "}
                    {formatDate(
                      sprint.end_date
                    )}
                  </p>
                )}

                {/* PROGRESS */}

                <div className="sprint-progress-block">

                  <div className="sprint-progress-label">

                    <span>
                      Progress
                    </span>

                    <span>
                      {progress}%
                    </span>

                  </div>

                  <div className="sprint-progress-track">

                    <div
                      className="sprint-progress-fill"
                      style={{
                        width: `${progress}%`,
                        background:
                          isComplete
                            ? "linear-gradient(90deg,#22c55e,#16a34a)"
                            : "linear-gradient(90deg,var(--brand-700),var(--brand-500))",
                      }}
                    />

                  </div>

                </div>

                {/* STATISTICS */}

                <div className="sprint-stat-row">

                  {/* TOTAL */}

                  <div className="sprint-stat-box">

                    <div className="sprint-stat-icon">
                      📋
                    </div>

                    <div>

                      <div className="sprint-stat-label">
                        Total Issues
                      </div>

                      <div className="sprint-stat-value">
                        {total}
                      </div>

                    </div>

                  </div>

                  {/* COMPLETED */}

                  <div className="sprint-stat-box">

                    <div
                      className="sprint-stat-icon"
                      style={{
                        background:
                          "var(--resolved-bg)",
                      }}
                    >
                      ✓
                    </div>

                    <div>

                      <div className="sprint-stat-label">
                        Completed
                      </div>

                      <div className="sprint-stat-value">
                        {completed}
                      </div>

                    </div>

                  </div>

                  {/* IN PROGRESS */}

                  <div className="sprint-stat-box">

                    <div
                      className="sprint-stat-icon"
                      style={{
                        background:
                          "var(--progress-bg)",
                      }}
                    >
                      ↻
                    </div>

                    <div>

                      <div className="sprint-stat-label">
                        In Progress
                      </div>

                      <div className="sprint-stat-value">
                        {inProgress}
                      </div>

                    </div>

                  </div>

                  {/* TODO */}

                  <div className="sprint-stat-box">

                    <div className="sprint-stat-icon">
                      ▤
                    </div>

                    <div>

                      <div className="sprint-stat-label">
                        To Do
                      </div>

                      <div className="sprint-stat-value">
                        {todo}
                      </div>

                    </div>

                  </div>

                </div>

                {/* AI HEALTH BUTTON */}

                <div className="sprint-card-ai-section">
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={() => {
                      setSelectedSprintForHealth(sprint);
                      setHealthModalOpen(true);
                    }}
                    style={{
                      background: "linear-gradient(135deg, #eee9ff, #f5f3ff)",
                      borderColor: "var(--brand-500)",
                      color: "var(--brand-700)",
                      fontWeight: 600,
                    }}
                  >
                    ✨ AI Health
                  </button>
                </div>

                {/* ISSUE DETAILS */}

                {isExpanded && (
                  <div className="sprint-issue-list">

                    {sprintIssues.length ===
                      0 && (
                      <p className="hint">
                        No issues in this
                        sprint yet.
                      </p>
                    )}

                    {sprintIssues.map(
                      (issue) => (
                        <div
                          className="sprint-issue-row"
                          key={issue.id}
                        >

                          <span>
                            {issue.title}
                          </span>

                          <span className="sprint-issue-status">
                            {issue.status.replace(
                              "_",
                              " "
                            )}
                          </span>

                        </div>
                      )
                    )}

                  </div>
                )}

                {/* CARD ACTIONS */}

                <div className="sprint-card-actions">

                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={() =>
                      setExpandedId(
                        isExpanded
                          ? null
                          : sprint.id
                      )
                    }
                  >
                    {isExpanded
                      ? "Hide Details"
                      : "View Details"}
                  </button>

                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={() =>
                      startEdit(sprint)
                    }
                  >
                    Edit Sprint
                  </button>

                  <button
                    className="btn btn-danger btn-sm"
                    type="button"
                    onClick={() =>
                      handleDelete(
                        sprint.id
                      )
                    }
                  >
                    Delete
                  </button>

                </div>

              </div>
            );
          })}

          {/* EMPTY */}

          {visibleSprints.length ===
            0 && (
            <p className="hint sprint-empty">
              No sprints found for this
              project.
            </p>
          )}

        </div>

      </div>

      {/* =====================================
          AI HEALTH MODAL
      ===================================== */}

      <SprintHealthModal
        sprint={selectedSprintForHealth}
        isOpen={healthModalOpen}
        onClose={() => {
          setHealthModalOpen(false);
          setSelectedSprintForHealth(null);
        }}
      />

      {/* =====================================
          CSS
      ===================================== */}

      <style jsx>{`

        /* ===============================
           PAGE HEADER
        =============================== */

        .sprint-page-header {
          margin-bottom: 24px;
        }

        /* ===============================
           ERROR
        =============================== */

        .sprint-error {
          width: 100%;
          box-sizing: border-box;

          display: flex;
          align-items: center;

          gap: 12px;

          padding: 13px 16px;

          margin-bottom: 18px;

          background: #fff1f2;

          border: 1px solid #fecdd3;

          border-left: 4px solid #ef4444;

          border-radius: 9px;

          color: #991b1b;
        }

        .sprint-error-icon {
          width: 28px;
          height: 28px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #fee2e2;

          color: #dc2626;

          font-weight: 800;

          font-size: 15px;
        }

        .sprint-error-content {
          min-width: 0;
        }

        .sprint-error-title {
          font-size: 13px;

          font-weight: 700;

          margin-bottom: 2px;
        }

        .sprint-error-message {
          font-size: 12px;

          color: #b91c1c;
        }

        .sprint-error-close {
          margin-left: auto;

          border: none;

          background: transparent;

          color: #991b1b;

          font-size: 22px;

          cursor: pointer;

          padding: 2px 7px;

          border-radius: 5px;
        }

        .sprint-error-close:hover {
          background: #fee2e2;
        }

        /* ===============================
           CREATE CARD
        =============================== */

        .sprint-create-card {
          display: grid;

          grid-template-columns:
            minmax(0, 1fr)
            270px;

          gap: 38px;

          align-items: center;

          min-height: 285px;

          padding: 26px 28px;

          box-sizing: border-box;

          margin-bottom: 34px;

          background: #ffffff;

          border: 1px solid var(--border);

          border-radius: 14px;

          box-shadow: var(--shadow-sm);
        }

        .sprint-create-left {
          min-width: 0;
        }

        .sprint-create-header {
          display: flex;

          align-items: center;

          gap: 14px;

          margin-bottom: 25px;
        }

        .sprint-create-header h3 {
          margin: 0;

          font-size: 18px;

          font-weight: 700;

          color: var(--text);
        }

        .sprint-create-icon {
          width: 44px;
          height: 44px;

          flex-shrink: 0;

          display: flex;

          align-items: center;

          justify-content: center;

          border-radius: 11px;

          background: #eee9ff;

          color: var(--brand-700);

          font-size: 20px;
        }

        /* ===============================
           FORM
        =============================== */

        .sprint-create-form {
          display: flex;

          flex-direction: column;

          gap: 22px;

          width: 100%;
        }

        .sprint-form-row {
          display: grid;

          grid-template-columns:
            minmax(0, 1fr)
            minmax(0, 1fr);

          gap: 22px;
        }

        .sprint-form-field {
          display: flex;

          flex-direction: column;

          gap: 8px;

          min-width: 0;
        }

        .sprint-form-field label {
          font-size: 12px;

          font-weight: 600;

          color: var(--text);
        }

        .sprint-form-field input,
        .sprint-form-field select {
          width: 100%;

          height: 44px;

          box-sizing: border-box;

          padding: 0 13px;

          border: 1px solid var(--border);

          border-radius: 8px;

          background: #ffffff;

          color: var(--text);

          font-size: 14px;

          outline: none;
        }

        .sprint-form-field input:focus,
        .sprint-form-field select:focus {
          border-color: var(--brand-500);

          box-shadow:
            0 0 0 3px
            rgba(79, 50, 205, 0.08);
        }

        /* ===============================
           RIGHT SIDE
        =============================== */

        .sprint-create-right {
          height: 100%;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          gap: 22px;
        }

        /* ===============================
           CALENDAR
        =============================== */

        .sprint-calendar {
          position: relative;

          width: 190px;

          height: 145px;
        }

        .calendar-body {
          position: absolute;

          left: 24px;

          top: 22px;

          width: 130px;

          height: 95px;

          border: 4px solid #5140d8;

          border-radius: 9px;

          background:
            linear-gradient(
              #e9e4ff 0 28%,
              #ffffff 28%
            );

          transform: rotate(-3deg);
        }

        .calendar-binding {
          position: absolute;

          top: -19px;

          width: 10px;

          height: 28px;

          border-radius: 7px;

          background: #5140d8;
        }

        .binding-one {
          left: 27px;
        }

        .binding-two {
          right: 27px;
        }

        .calendar-header {
          position: absolute;

          left: 0;

          top: 24px;

          width: 100%;

          height: 3px;

          background: #5140d8;

          opacity: 0.25;
        }

        .calendar-days {
          position: absolute;

          left: 19px;

          top: 48px;

          display: grid;

          grid-template-columns:
            repeat(4, 13px);

          gap: 7px;
        }

        .calendar-days span {
          width: 13px;

          height: 9px;

          border-radius: 2px;

          background: #ddd7ff;
        }

        /* ===============================
           CLOCK
        =============================== */

        .calendar-clock {
          position: absolute;

          right: 2px;

          bottom: 3px;

          width: 45px;

          height: 45px;

          border: 4px solid #5140d8;

          border-radius: 50%;

          background: #ffffff;
        }

        .clock-hour {
          position: absolute;

          left: 20px;

          top: 9px;

          width: 3px;

          height: 14px;

          background: #5140d8;

          border-radius: 3px;
        }

        .clock-minute {
          position: absolute;

          left: 20px;

          top: 21px;

          width: 11px;

          height: 3px;

          background: #5140d8;

          transform: rotate(25deg);

          transform-origin: left center;

          border-radius: 3px;
        }

        /* ===============================
           CREATE BUTTON
        =============================== */

        .sprint-create-btn {
          width: 220px;

          height: 44px;

          border-radius: 8px;

          white-space: nowrap;
        }

        /* ===============================
           ALL SPRINTS HEADER
        =============================== */

        .sprint-list-header {
          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 20px;

          margin-bottom: 16px;
        }

        .sprint-list-header h3 {
          margin: 0;

          font-size: 20px;

          font-weight: 700;
        }

        /* ===============================
           PROJECT FILTER
        =============================== */

        .sprint-filter-wrapper {
          display: flex;

          align-items: center;
        }

        .sprint-project-filter {
          width: 220px;

          height: 42px;

          padding: 0 12px;

          border: 1px solid var(--border);

          border-radius: 8px;

          background: #ffffff;

          color: var(--text);

          font-size: 13px;

          outline: none;

          cursor: pointer;
        }

        .sprint-project-filter:focus {
          border-color: var(--brand-500);

          box-shadow:
            0 0 0 3px
            rgba(79, 50, 205, 0.08);
        }

        /* ===============================
           SPRINT GRID
        =============================== */

        .sprint-grid {
          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 20px;

          align-items: stretch;
        }

        /* ===============================
           SPRINT CARD
        =============================== */

        .sprint-card {
          min-width: 0;

          padding: 18px;

          background: #ffffff;

          border: 1px solid var(--border);

          border-radius: 12px;

          box-shadow: var(--shadow-sm);
        }

        .sprint-card-top {
          display: flex;

          align-items: flex-start;

          justify-content: space-between;

          gap: 12px;

          margin-bottom: 8px;
        }

        .sprint-card-info {
          min-width: 0;
        }

        .sprint-card-title {
          margin: 0 0 3px;

          font-size: 15px;

          line-height: 1.35;

          font-weight: 700;

          color: var(--brand-700);
        }

        .sprint-card-project {
          margin: 0;

          font-size: 12.5px;

          color: var(--text-muted);
        }

        /* ===============================
           STATUS
        =============================== */

        .sprint-status-badge {
          flex-shrink: 0;

          padding: 5px 10px;

          border-radius: 20px;

          font-size: 11px;

          font-weight: 700;

          white-space: nowrap;
        }

        .sprint-status-badge.active {
          background: var(--progress-bg);

          color: var(--progress);
        }

        .sprint-status-badge.complete {
          background: var(--resolved-bg);

          color: var(--resolved);
        }

        /* ===============================
           DATES
        =============================== */

        .sprint-card-dates {
          margin: 5px 0 16px;

          font-size: 12.5px;

          color: var(--text-muted);
        }

        /* ===============================
           PROGRESS
        =============================== */

        .sprint-progress-block {
          margin-bottom: 16px;
        }

        .sprint-progress-label {
          display: flex;

          align-items: center;

          justify-content: space-between;

          margin-bottom: 7px;

          font-size: 12px;

          font-weight: 600;
        }

        .sprint-progress-track {
          width: 100%;

          height: 6px;

          background: #eceaf7;

          border-radius: 99px;

          overflow: hidden;
        }

        .sprint-progress-fill {
          height: 100%;

          border-radius: inherit;

          transition: width 0.3s ease;
        }

        /* ===============================
           STATISTICS
        =============================== */

        .sprint-stat-row {
          display: grid;

          grid-template-columns:
            repeat(4, minmax(0, 1fr));

          gap: 8px;

          margin-bottom: 16px;
        }

        .sprint-stat-box {
          min-width: 0;

          display: flex;

          align-items: center;

          gap: 7px;

          padding: 8px;

          background: var(--bg-page);

          border-radius: 8px;
        }

        .sprint-stat-icon {
          width: 27px;

          height: 27px;

          flex-shrink: 0;

          display: flex;

          align-items: center;

          justify-content: center;

          border-radius: 7px;

          background: var(--bg-muted);

          font-size: 12px;
        }

        .sprint-stat-label {
          font-size: 10px;

          color: var(--text-muted);

          white-space: nowrap;
        }

        .sprint-stat-value {
          font-size: 14px;

          font-weight: 700;
        }

        /* ===============================
           AI SECTION
        =============================== */

        .sprint-card-ai-section {
          margin-bottom: 12px;
        }

        .sprint-card-ai-section button {
          width: 100%;
        }

        /* ===============================
           ACTIONS
        =============================== */

        .sprint-card-actions {
          display: grid;

          grid-template-columns:
            1.1fr 1fr 0.9fr;

          gap: 8px;
        }

        .sprint-card-actions button {
          width: 100%;
        }

        /* ===============================
           ISSUE LIST
        =============================== */

        .sprint-issue-list {
          display: flex;

          flex-direction: column;

          gap: 6px;

          max-height: 180px;

          overflow-y: auto;

          padding-top: 12px;

          margin-bottom: 14px;

          border-top:
            1px solid var(--border);
        }

        .sprint-issue-row {
          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 10px;

          padding: 6px 0;

          font-size: 12.5px;
        }

        .sprint-issue-status {
          flex-shrink: 0;

          color: var(--text-muted);

          text-transform: capitalize;
        }

        /* ===============================
           EDIT FORM
        =============================== */

        .sprint-edit-form {
          display: flex;

          flex-direction: column;

          gap: 12px;
        }

        .sprint-edit-form h4 {
          margin: 0;

          color: var(--brand-700);

          font-size: 16px;
        }

        .edit-date-row {
          display: flex;

          gap: 8px;
        }

        .edit-actions {
          display: flex;

          gap: 8px;
        }

        /* ===============================
           EMPTY
        =============================== */

        .sprint-empty {
          grid-column: 1 / -1;

          margin: 10px 0;
        }

        /* ===============================
           TABLET
        =============================== */

        @media (max-width: 1050px) {

          .sprint-create-card {
            grid-template-columns: 1fr;
          }

          .sprint-create-right {
            height: auto;

            flex-direction: row;

            justify-content: flex-end;
          }

          .sprint-grid {
            grid-template-columns: 1fr;
          }

        }

        /* ===============================
           MOBILE
        =============================== */

        @media (max-width: 700px) {

          .sprint-form-row {
            grid-template-columns: 1fr;
          }

          .sprint-create-card {
            padding: 20px;
          }

          .sprint-create-right {
            flex-direction: column;

            align-items: center;
          }

          .sprint-project-filter {
            width: 180px;
          }

          .sprint-list-header {
            align-items: flex-start;

            flex-direction: column;
          }

        }

        /* ===============================
           SMALL MOBILE
        =============================== */

        @media (max-width: 500px) {

          .sprint-stat-row {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .sprint-card-actions {
            grid-template-columns: 1fr;
          }

          .edit-date-row {
            flex-direction: column;
          }

          .sprint-error {
            align-items: flex-start;
          }

        }

      `}</style>

    </AppShell>
  );
}