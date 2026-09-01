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

const QUICK_FEATURES = [
  { icon: "⚡", title: "Lightning Fast", text: "Create, assign and resolve issues in seconds.", tint: "purple" },
  { icon: "👥", title: "Team Collaboration", text: "Keep your team in sync with comments and updates.", tint: "pink" },
  { icon: "📈", title: "Powerful Insights", text: "Get real-time reports and analytics.", tint: "amber" },
  { icon: "🛡", title: "Secure & Reliable", text: "Your data is secure with enterprise-grade protection.", tint: "green" },
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

const AVATAR_COLORS = ["#6d5ce8", "#e8623f", "#1f9d55", "#d4a017"];

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

  const scrollToId = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <div className="sidebar-logo" style={{ width: 45, height: 45 }}>
          <img src="/bugflow-logo.png" alt="BugFlow" />
          </div>BugFlow
          </div>

        <div className="landing-nav-links">
          <a href="#features" onClick={scrollToId("features")}>Features</a>
          <a href="#how-it-works" onClick={scrollToId("how-it-works")}>How It Works</a>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </div>

        <div className="landing-nav-actions">
          <button className="theme-toggle-btn" aria-label="Toggle theme" type="button">☀</button>
          <Link to="/login" className="btn-nav-login">Login</Link>
          <Link to="/register" className="btn-nav-solid">Get Started</Link>
        </div>
      </nav>

      <section className="landing-hero-v2">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />

        <div className="landing-hero-copy reveal reveal-visible">
          <h1 className="hero-headline">
            Track. Manage.<br />
            Resolve. <span>Faster.</span>
          </h1>
          <p>
            BugFlow helps teams track issues, manage projects,
            and ship high-quality software with ease.
          </p>
          <div className="landing-hero-actions">
            <Link to="/register" className="btn btn-glow">Get Started Free →</Link>
            <a href="#how-it-works" onClick={scrollToId("how-it-works")} className="btn-view-demo">
              View Demo ▶
            </a>
          </div>
          <div className="hero-social-proof">
            <div className="avatar-stack">
              {AVATAR_COLORS.map((c, i) => (
                <span key={i} className="avatar-stack-item" style={{ background: c, zIndex: AVATAR_COLORS.length - i }} />
              ))}
              <span className="avatar-stack-item avatar-stack-more">+2k</span>
            </div>
            <span>Join 2,000+ teams already using BugFlow</span>
          </div>
        </div>

        <div className="hero-preview-wrap reveal reveal-visible" style={{ transitionDelay: "150ms" }}>
          <div className="hero-preview-dots" />
          <div className="mini-app-shell">
            <div className="mini-sidebar">
              <div className="mini-sidebar-brand">
                <span className="mini-logo">B</span> BugFlow
              </div>
              <div className="mini-nav-link active">▦ Dashboard</div>
              <div className="mini-nav-link">▥ Projects</div>
              <div className="mini-nav-link">◉ Issues</div>
              <div className="mini-nav-link">◷ Sprints</div>
              <div className="mini-nav-link">📊 Reports</div>
              <div className="mini-nav-link">⚙ Settings</div>
            </div>
            <div className="mini-main">
              <div className="mini-topbar">
                <span className="mini-search">🔍 Search issues, projects...</span>
                <span className="mini-bell">🔔</span>
                <span className="mini-user">kushal <span className="mini-avatar">K</span></span>
              </div>
              <div className="mini-content">
                <div className="mini-page-title">
                  Dashboard <span className="mini-cta-btn">+ Create Issue</span>
                </div>
                <div className="mini-stat-row">
                  <div className="mini-stat"><span>2</span>Total Projects</div>
                  <div className="mini-stat"><span>16</span>Total Issues</div>
                  <div className="mini-stat mini-stat-open"><span>12</span>Open Issues</div>
                  <div className="mini-stat mini-stat-progress"><span>3</span>In Progress</div>
                  <div className="mini-stat mini-stat-resolved"><span>1</span>Resolved</div>
                </div>
                <div className="mini-panel-row">
                  <div className="mini-panel">
                    <div className="mini-panel-title">Recent Issues <span>View All</span></div>
                    <div className="mini-list-row"><strong>Login page not working</strong><span>Open • Critical</span></div>
                    <div className="mini-list-row"><strong>API response delay</strong><span>Open • High</span></div>
                    <div className="mini-list-row"><strong>Unable to upload file</strong><span>Open • Medium</span></div>
                    <div className="mini-list-row"><strong>Dashboard loading slow</strong><span>In Progress • Low</span></div>
                  </div>
                  <div className="mini-panel">
                    <div className="mini-panel-title">Projects Overview <span>View All</span></div>
                    <div className="mini-progress-row">
                      <span>E-Commerce Platform</span>
                      <div className="mini-progress-track"><div className="mini-progress-fill" style={{ width: "60%" }} /></div>
                      <span className="mini-progress-label">12 / 20 issues</span>
                    </div>
                    <div className="mini-progress-row">
                      <span>Hospital Management System</span>
                      <div className="mini-progress-track"><div className="mini-progress-fill" style={{ width: "53%" }} /></div>
                      <span className="mini-progress-label">8 / 15 issues</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick feature strip */}
      <section className="quick-feature-strip">
        {QUICK_FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 60} className={`quick-feature-card tint-${f.tint}`}>
            <div className="quick-feature-icon">{f.icon}</div>
            <div>
              <h4>{f.title}</h4>
              <p>{f.text}</p>
            </div>
          </Reveal>
        ))}
      </section>

     

      <section className="landing-section" id="features">
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

      <section className="landing-section landing-section-tint" id="how-it-works">
        <Reveal className="landing-section-header">
          <div className="landing-tag"><h1>HOW IT WORKS</h1></div>
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
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
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