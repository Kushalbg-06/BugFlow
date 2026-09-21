export default function AiActionModal({ title, icon, isOpen, onClose, children }) {
    if (!isOpen) return null;
  
    return (
      <>
        <div className="ai-modal-backdrop" onClick={onClose} />
        <div className="ai-modal-container">
          <div className="ai-modal-content">
            <div className="ai-modal-header">
              <div className="ai-modal-title">
                <span className="ai-modal-icon">{icon}</span> {title}
              </div>
              <button className="ai-modal-close" onClick={onClose}>×</button>
            </div>
            <div className="ai-modal-body">{children}</div>
          </div>
        </div>
  
        <style jsx>{`
          .ai-modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
          }
          .ai-modal-container {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 16px;
          }
          .ai-modal-content {
            background: white;
            border-radius: 16px;
            width: 100%;
            max-width: 640px;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
          .ai-modal-header {
            padding: 18px 20px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            background: white;
            z-index: 10;
            border-radius: 16px 16px 0 0;
          }
          .ai-modal-title {
            font-weight: 700;
            font-size: 16px;
            color: #4b2fd6;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .ai-modal-icon { font-size: 18px; }
          .ai-modal-close {
            background: none;
            border: none;
            font-size: 26px;
            color: #ccc;
            cursor: pointer;
            width: 32px;
            height: 32px;
          }
          .ai-modal-close:hover { color: #999; }
          .ai-modal-body { padding: 20px; }
        `}</style>
      </>
    );
  }                                                                                                                                          