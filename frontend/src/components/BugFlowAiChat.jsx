import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "../api";

const SUGGESTED_QUESTIONS = [
  "Find similar issues",
  "What should I investigate?",
  "What happened in similar bugs?",
];

export default function BugFlowAiChat({ issueId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async (question) => {
    const text = (question ?? input).trim();
    if (!text || loading) return;

    setError("");
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/rag/chat", {
        issue_id: Number(issueId),
        question: text,
        conversation_history: history,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.answer, retrieved: res.data.retrieved, hasHistorical: res.data.has_historical_context },
      ]);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="bugflow-ai-fab" onClick={() => setOpen((v) => !v)} aria-label="Open BugFlow AI assistant">🤖</button>

      {open && (
        <div className="bugflow-ai-panel">
          <div className="bugflow-ai-header">
            <span>🤖 BugFlow AI</span>
            <button className="bugflow-ai-close" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="bugflow-ai-subheader">Analyzing BUG-{issueId}</div>

          <div className="bugflow-ai-messages">
            {messages.length === 0 && (
              <div className="bugflow-ai-welcome">
                <p>Hi! I can help you understand this issue using the issue context and historical BugFlow knowledge.</p>
                <div className="bugflow-ai-suggestions">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button key={q} className="bugflow-ai-suggestion" onClick={() => send(q)}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`bugflow-ai-message ${m.role}`}>
                <div className={`bugflow-ai-bubble ${m.role}`}>
                  {m.role === "assistant" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  ) : (
                    m.content
                  )}
                </div>
                {m.role === "assistant" && m.hasHistorical && m.retrieved?.length > 0 && (
                  <div className="bugflow-ai-refs">
                    <span className="bugflow-ai-refs-label">Historical references:</span>
                    {m.retrieved.map((r, idx) => <span key={idx} className="bugflow-ai-ref-pill">BUG-{r.issue_id}</span>)}
                  </div>
                )}
                {m.role === "assistant" && !m.hasHistorical && (
                  <div className="bugflow-ai-refs muted">No relevant historical information found.</div>
                )}
              </div>
            ))}

            {loading && (
              <div className="bugflow-ai-message assistant">
                <div className="bugflow-ai-bubble assistant loading">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            {error && <div className="bugflow-ai-error">{error}</div>}
            <div ref={messagesEndRef} />
          </div>

          <form className="bugflow-ai-input-row" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input type="text" placeholder="Ask about this issue..." value={input} onChange={(e) => setInput(e.target.value)} disabled={loading} />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Send">➤</button>
          </form>
        </div>
      )}

      <style jsx>{`
        .bugflow-ai-fab {
          position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
          border-radius: 50%; background: #5b3df5; color: white; border: none;
          font-size: 24px; cursor: pointer; box-shadow: 0 4px 14px rgba(91, 61, 245, 0.35);
          z-index: 999; display: flex; align-items: center; justify-content: center;
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .bugflow-ai-fab:hover { background: #4c2dd4; transform: translateY(-2px); }

        .bugflow-ai-panel {
          position: fixed;
          bottom: 92px;
          right: 24px;
          width: min(440px, calc(100vw - 24px));
          height: min(640px, 80vh);
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
          display: flex;
          flex-direction: column;
          z-index: 999;
          overflow: hidden;
        }

        .bugflow-ai-header {
          background: #5b3df5; color: white; padding: 16px 18px; font-weight: 700;
          font-size: 15px; display: flex; justify-content: space-between; align-items: center;
          flex-shrink: 0;
        }
        .bugflow-ai-close { background: none; border: none; color: white; font-size: 20px; cursor: pointer; line-height: 1; }

        .bugflow-ai-subheader {
          padding: 9px 18px; font-size: 11px; font-weight: 700; color: #5b3df5;
          background: #f5f1ff; text-transform: uppercase; letter-spacing: 0.4px;
          flex-shrink: 0;
        }

        .bugflow-ai-messages {
          flex: 1; overflow-y: auto; padding: 16px 18px;
          display: flex; flex-direction: column; gap: 14px;
        }

        .bugflow-ai-welcome p { font-size: 13.5px; color: #555; line-height: 1.55; margin: 0 0 14px 0; }
        .bugflow-ai-suggestions { display: flex; flex-direction: column; gap: 8px; }
        .bugflow-ai-suggestion {
          text-align: left; background: #f5f1ff; border: 1px solid #e2dbfc; color: #4c2dd4;
          border-radius: 8px; padding: 10px 12px; font-size: 13px; font-weight: 600; cursor: pointer;
        }
        .bugflow-ai-suggestion:hover { background: #ede9fe; }

        .bugflow-ai-message { display: flex; flex-direction: column; }
        .bugflow-ai-message.user { align-items: flex-end; }
        .bugflow-ai-message.assistant { align-items: flex-start; }

        .bugflow-ai-bubble {
          max-width: 92%;
          padding: 11px 14px;
          border-radius: 12px;
          font-size: 13.5px;
          line-height: 1.6;
          word-wrap: break-word;
        }
        .bugflow-ai-bubble.user {
          background: #5b3df5; color: white; border-bottom-right-radius: 3px;
          white-space: pre-wrap;
        }
        .bugflow-ai-bubble.assistant {
          background: #f5f5f7; color: #333; border-bottom-left-radius: 3px;
        }
        .bugflow-ai-bubble.loading {
          display: flex; gap: 4px; align-items: center; padding: 14px;
        }
        .typing-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #b3aef0;
          animation: bfBounce 1.2s infinite ease-in-out;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .typing-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes bfBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }

        /* Markdown content rendered inside the assistant bubble by react-markdown
           isn't scoped by styled-jsx (it's created by the library, not written
           literally in this file), so these need :global(). */
        :global(.bugflow-ai-bubble.assistant p) { margin: 0 0 8px 0; }
        :global(.bugflow-ai-bubble.assistant p:last-child) { margin-bottom: 0; }
        :global(.bugflow-ai-bubble.assistant strong) { font-weight: 700; color: #1f1f1f; }
        :global(.bugflow-ai-bubble.assistant em) { font-style: italic; }
        :global(.bugflow-ai-bubble.assistant ul),
        :global(.bugflow-ai-bubble.assistant ol) { margin: 4px 0 10px 0; padding-left: 20px; }
        :global(.bugflow-ai-bubble.assistant li) { margin-bottom: 5px; }
        :global(.bugflow-ai-bubble.assistant li:last-child) { margin-bottom: 0; }
        :global(.bugflow-ai-bubble.assistant h1),
        :global(.bugflow-ai-bubble.assistant h2),
        :global(.bugflow-ai-bubble.assistant h3),
        :global(.bugflow-ai-bubble.assistant h4) {
          font-size: 13.5px; font-weight: 700; color: #4c2dd4;
          margin: 12px 0 6px 0;
        }
        :global(.bugflow-ai-bubble.assistant h1:first-child),
        :global(.bugflow-ai-bubble.assistant h2:first-child),
        :global(.bugflow-ai-bubble.assistant h3:first-child) { margin-top: 0; }
        :global(.bugflow-ai-bubble.assistant code) {
          background: #ece9fe; color: #4c2dd4; padding: 1px 6px;
          border-radius: 4px; font-size: 12px; font-family: monospace;
        }
        :global(.bugflow-ai-bubble.assistant pre) {
          background: #2b2b33; color: #e8e8ec; padding: 10px 12px;
          border-radius: 8px; overflow-x: auto; font-size: 12px; margin: 8px 0;
        }
        :global(.bugflow-ai-bubble.assistant pre code) { background: none; color: inherit; padding: 0; }
        :global(.bugflow-ai-bubble.assistant a) { color: #5b3df5; text-decoration: underline; }
        :global(.bugflow-ai-bubble.assistant blockquote) {
          border-left: 3px solid #ddd6fe; padding-left: 10px; color: #666; margin: 8px 0;
        }
        :global(.bugflow-ai-bubble.assistant hr) { border: none; border-top: 1px solid #eee; margin: 10px 0; }

        .bugflow-ai-refs { margin-top: 6px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 11px; }
        .bugflow-ai-refs.muted { color: #999; font-style: italic; }
        .bugflow-ai-refs-label { color: #999; }
        .bugflow-ai-ref-pill { background: #ede9fe; color: #5b3df5; border-radius: 6px; padding: 2px 7px; font-weight: 700; }

        .bugflow-ai-error { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 8px; padding: 9px 11px; font-size: 12.5px; }

        .bugflow-ai-input-row { display: flex; gap: 8px; padding: 13px 16px; border-top: 1px solid #eee; flex-shrink: 0; }
        .bugflow-ai-input-row input { flex: 1; padding: 10px 13px; border: 1px solid #e5e7eb; border-radius: 9px; font-size: 13.5px; font-family: inherit; }
        .bugflow-ai-input-row input:focus { outline: none; border-color: #b8abfa; }
        .bugflow-ai-input-row button {
          background: #5b3df5; color: white; border: none; border-radius: 9px;
          width: 40px; font-size: 15px; cursor: pointer; flex-shrink: 0;
        }
        .bugflow-ai-input-row button:hover:not(:disabled) { background: #4c2dd4; }
        .bugflow-ai-input-row button:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 480px) {
          .bugflow-ai-panel { right: 12px; left: 12px; width: auto; bottom: 84px; height: 75vh; }
        }
      `}</style>
    </>
  );
}