export default function AuthSide() {
  return (
    <div className="auth-side">
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />
      <div className="auth-blob auth-blob-3" />
      <div className="auth-particles">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="auth-particle" style={{ "--i": i }} />
        ))}
      </div>

      <div className="auth-side-content">
        <div className="tag">SMART ISSUE MANAGEMENT</div>
        <h1>Track bugs.<br /><span>Build better.</span></h1>
        <p>Manage projects, organize issues, track progress and generate structured bug reports from one workspace.</p>
      </div>
    </div>
  );
}