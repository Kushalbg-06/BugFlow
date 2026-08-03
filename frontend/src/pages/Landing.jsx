import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("reveal-visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, delay = 0, className = "" }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

const FEATURES = [
  { icon: "◉", title: "Kanban issue board", text: "Drag work through Open, In Progress, In Review, and Resolved with enforced, sensible transitions." },
  { icon: "✦", title: "AI-assisted reporting", text: "Turn a vague bug description into structured steps, expected vs. actual result, and category automatically." },
  { icon: "⚠", title: "Duplicate detection", text: "Get warned live if the bug you're filing looks like one that's already been reported." },
  { icon: "◷", title: "Sprint planning", text: "Group issues into time-boxed sprints and track resolution progress per sprint." },
  { icon: "💬", title: "Comments & activity", text: "Every status change, comment, and attachment is logged to a full audit trail per issue." },
  { icon: "📎", title: "Attachments", text: "Drop in screenshots or logs directly on the issue — no separate tool needed." },
];

const STEPS = [
  { n: "01", title: "Create a project", text: "Spin up a workspace for each product or team in seconds." },
  { n: "02", title: "Report a bug", text: "Describe what happened — AI drafts the structured report for you." },
  { n: "03", title: "Track it to resolution", text: "Move it through the board, comment, attach evidence, done." },
];

const STATS = [
  { value: "100%", label: "Audit trail coverage" },
  { value: "0", label: "Spreadsheets needed" },
];

export default function Landing() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const nav = document.querySelector(".landing-nav");
    const onScroll = () => {
      if (nav) nav.classList.toggle("scrolled", window.scrollY > 8);
      setShowTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <div className="sidebar-logo" style={{ width: 30, height: 30, fontSize: 14 }}>B</div>
          BugFlow
        </div>
        <div className="landing-nav-actions">
          <Link to="/login">Sign in</Link>
          <Link to="/register" className="btn-nav-cta">Get started</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />

        <div className="landing-hero-copy reveal reveal-visible">
          <div className="landing-tag">✦ ISSUE TRACKING REIMAGINED</div>
          <h1>Track bugs, ship faster, <span>stay aligned.</span></h1>
          <p>
            BugFlow helps engineering, QA, and product teams turn chaos into clarity.
            Manage projects, organize issues, track progress, and generate structured bug
            reports — all from one workspace.
          </p>
          <div className="landing-hero-actions">
            <Link to="/register" className="btn btn-glow">✦ Start for free</Link>
            <Link to="/login" className="btn-nav-cta btn-nav-cta-lg">Sign in</Link>
          </div>
        </div>

        <div className="landing-card reveal reveal-visible" style={{ transitionDelay: "150ms" }}>
          <div className="landing-card-item">
            <h4>Why BugFlow?</h4>
            <p>Because every bug deserves fast resolution, clear ownership, and fewer distractions.</p>
          </div>
          <div className="landing-card-item">
            <h4>The problem we solve</h4>
            <p>Unstructured tracking, unclear handoffs, and slow triage lead to wasted time.</p>
          </div>
          <div className="landing-card-item">
            <h4>How it helps</h4>
            <p>Centralize bugs, prioritize what matters with AI, and give teams one place to move forward.</p>
          </div>
        </div>
      </section>

      <section className="landing-stats">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 80} className="stat-block">
            <div className="stat-block-value">{s.value}</div>
            <div className="stat-block-label">{s.label}</div>
          </Reveal>
        ))}
      </section>

      <section className="landing-section">
        <Reveal className="landing-section-header">
          <div className="landing-tag">FEATURES</div>
          <h2>Everything a bug's lifecycle needs</h2>
          <p>One workspace, from first report to resolved and archived.</p>
        </Reveal>

        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 70} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h4>{f.title}</h4>
              <p>{f.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section-tint">
        <Reveal className="landing-section-header">
          <div className="landing-tag">HOW IT WORKS</div>
          <h2>Three steps to a cleaner backlog</h2>
        </Reveal>

        <div className="steps-row">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 100} className="step-card">
              <div className="step-number">{s.n}</div>
              <h4>{s.title}</h4>
              <p>{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <Reveal className="landing-cta-inner">
          <h2>Ready to stop losing bugs in spreadsheets?</h2>
          <p>Create your workspace in under a minute — no credit card, no setup.</p>
          <Link to="/register" className="btn btn-glow" style={{ background: "white", color: "var(--maroon)" }}>
            ✦ Start for free
          </Link>
        </Reveal>
      </section>

      <footer className="landing-footer">
        <div>BugFlow · Bug Lifecycle Management</div>
        <div style={{ display: "flex", gap: 18 }}>
          <Link to="/login">Sign in</Link>
          <Link to="/register">Get started</Link>
        </div>
      </footer>

      <button
        className={`scroll-top-btn ${showTop ? "visible" : ""}`}
        onClick={scrollToTop}
        aria-label="Scroll to top"
      >
        ↑
      </button>
    </div>
  );
}