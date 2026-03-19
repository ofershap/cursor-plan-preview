import { useState, useEffect, useRef, useCallback } from "react";
import type { ParsedPlan, Annotation, AnnotationType } from "./types";
import { encodeShareUrl, decodeShareUrl } from "./utils/sharing";
import "./app.css";

const ANNOTATION_COLORS: Record<AnnotationType, string> = {
  DELETION: "#ef4444",
  REPLACEMENT: "#f59e0b",
  INSERTION: "#22c55e",
  COMMENT: "#3b82f6",
  GLOBAL_COMMENT: "#8b5cf6",
};

const ANNOTATION_LABELS: Record<AnnotationType, string> = {
  DELETION: "Delete",
  REPLACEMENT: "Replace",
  INSERTION: "Insert",
  COMMENT: "Comment",
  GLOBAL_COMMENT: "Global Note",
};

function AnnotationToolbar({
  position,
  onSelect,
  onClose,
}: {
  position: { x: number; y: number };
  onSelect: (type: AnnotationType) => void;
  onClose: () => void;
}) {
  const types: AnnotationType[] = [
    "DELETION",
    "REPLACEMENT",
    "COMMENT",
    "INSERTION",
  ];
  return (
    <div
      className="annotation-toolbar"
      style={{ left: position.x, top: position.y - 48 }}
    >
      {types.map((t) => (
        <button
          key={t}
          className="toolbar-btn"
          style={{ borderColor: ANNOTATION_COLORS[t] }}
          onClick={() => onSelect(t)}
          title={ANNOTATION_LABELS[t]}
        >
          {t === "DELETION" && "✂"}
          {t === "REPLACEMENT" && "↔"}
          {t === "COMMENT" && "💬"}
          {t === "INSERTION" && "+"}
        </button>
      ))}
      <button className="toolbar-btn toolbar-close" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}

function AnnotationModal({
  type,
  originalText,
  onSave,
  onCancel,
}: {
  type: AnnotationType;
  originalText: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const needsText =
    type === "REPLACEMENT" || type === "COMMENT" || type === "INSERTION";

  if (!needsText) {
    onSave("");
    return null;
  }

  const placeholder =
    type === "REPLACEMENT"
      ? "Replace with..."
      : type === "INSERTION"
        ? "Insert text..."
        : "Add comment...";

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div
          className="modal-header"
          style={{ borderColor: ANNOTATION_COLORS[type] }}
        >
          <span>{ANNOTATION_LABELS[type]}</span>
          {originalText && (
            <span className="modal-original">
              "{originalText.slice(0, 60)}"
            </span>
          )}
        </div>
        <textarea
          autoFocus
          className="modal-textarea"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSave(text);
            if (e.key === "Escape") onCancel();
          }}
        />
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            style={{ background: ANNOTATION_COLORS[type] }}
            onClick={() => onSave(text)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function AnnotationSidebar({
  annotations,
  onRemove,
  onGlobalComment,
}: {
  annotations: Annotation[];
  onRemove: (id: string) => void;
  onGlobalComment: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">
          Vital Signs
          {annotations.length > 0 && (
            <span className="badge">{annotations.length}</span>
          )}
        </span>
        <button
          className="btn-ghost"
          onClick={onGlobalComment}
          title="Add global note"
        >
          + Note
        </button>
      </div>
      {annotations.length === 0 ? (
        <div className="sidebar-empty">
          <span>Select text to annotate</span>
        </div>
      ) : (
        <ul className="annotation-list">
          {annotations.map((a) => (
            <li
              key={a.id}
              className="annotation-item"
              style={{ borderLeftColor: ANNOTATION_COLORS[a.type] }}
            >
              <div className="annotation-type">{ANNOTATION_LABELS[a.type]}</div>
              {a.originalText && (
                <div className="annotation-original">
                  "{a.originalText.slice(0, 80)}"
                </div>
              )}
              {a.text && <div className="annotation-text">{a.text}</div>}
              <button
                className="annotation-remove"
                onClick={() => onRemove(a.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function PlanViewer({
  plan,
  annotations,
  onAnnotationCreate,
}: {
  plan: ParsedPlan;
  annotations: Annotation[];
  onAnnotationCreate: (
    annotation: Omit<Annotation, "id" | "createdAt">,
  ) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<{
    position: { x: number; y: number };
    selectedText: string;
  } | null>(null);
  const [modal, setModal] = useState<{
    type: AnnotationType;
    originalText: string;
  } | null>(null);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setToolbar(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setToolbar({
      position: {
        x: rect.left + rect.width / 2 - 80,
        y: rect.top + window.scrollY,
      },
      selectedText: sel.toString().trim(),
    });
  }, []);

  const handleAnnotationSelect = (type: AnnotationType) => {
    if (!toolbar) return;
    if (type === "DELETION") {
      onAnnotationCreate({ type, originalText: toolbar.selectedText });
      setToolbar(null);
      window.getSelection()?.removeAllRanges();
    } else {
      setModal({ type, originalText: toolbar.selectedText });
      setToolbar(null);
    }
  };

  const handleModalSave = (text: string) => {
    if (!modal) return;
    onAnnotationCreate({
      type: modal.type,
      originalText: modal.originalText,
      text,
    });
    setModal(null);
    window.getSelection()?.removeAllRanges();
  };

  const renderedBody = renderMarkdown(plan.body, annotations);

  return (
    <div className="viewer">
      <div className="plan-meta">
        <h1 className="plan-name">{plan.name}</h1>
        {plan.overview && <p className="plan-overview">{plan.overview}</p>}
        {plan.todos.length > 0 && (
          <div className="todos">
            <div className="todos-title">Tasks</div>
            {plan.todos.map((t) => (
              <div key={t.id} className={`todo todo-${t.status}`}>
                <span className="todo-status">
                  {t.status === "completed"
                    ? "✓"
                    : t.status === "in_progress"
                      ? "→"
                      : t.status === "cancelled"
                        ? "✕"
                        : "○"}
                </span>
                {t.content}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        ref={contentRef}
        className="plan-body"
        onMouseUp={handleMouseUp}
        dangerouslySetInnerHTML={{ __html: renderedBody }}
      />

      {toolbar && (
        <AnnotationToolbar
          position={toolbar.position}
          onSelect={handleAnnotationSelect}
          onClose={() => setToolbar(null)}
        />
      )}

      {modal && (
        <AnnotationModal
          type={modal.type}
          originalText={modal.originalText}
          onSave={handleModalSave}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}

function renderMarkdown(markdown: string, annotations: Annotation[]): string {
  const deletedTexts = new Set(
    annotations.filter((a) => a.type === "DELETION").map((a) => a.originalText),
  );
  const commentedTexts = new Map(
    annotations
      .filter((a) => a.type === "COMMENT")
      .map((a) => [a.originalText, a.text ?? ""]),
  );
  const replacedTexts = new Map(
    annotations
      .filter((a) => a.type === "REPLACEMENT")
      .map((a) => [a.originalText, a.text ?? ""]),
  );

  let html = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html
    .replace(/^#{6}\s+(.+)$/gm, "<h6>$1</h6>")
    .replace(/^#{5}\s+(.+)$/gm, "<h5>$1</h5>")
    .replace(/^#{4}\s+(.+)$/gm, "<h4>$1</h4>")
    .replace(/^#{3}\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^#{2}\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/^#{1}\s+(.+)$/gm, "<h1>$1</h1>")
    .replace(/^```[\w]*\n([\s\S]*?)^```/gm, "<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/^- \[x\] (.+)$/gm, '<li class="task done">✓ $1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="task">○ $1</li>')
    .replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
    .replace(/^&gt;\s+(.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^---$/gm, "<hr />")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>',
    )
    .replace(/\n\n/g, "</p><p>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");

  html = `<p>${html}</p>`;

  for (const text of deletedTexts) {
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(
      new RegExp(escaped, "g"),
      `<mark class="ann-delete">${text}</mark>`,
    );
  }

  for (const [text, comment] of commentedTexts) {
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(
      new RegExp(escaped, "g"),
      `<mark class="ann-comment" title="${comment}">${text}</mark>`,
    );
  }

  for (const [text, replacement] of replacedTexts) {
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(
      new RegExp(escaped, "g"),
      `<mark class="ann-replace">${text} → ${replacement}</mark>`,
    );
  }

  return html;
}

export default function App() {
  const [plan, setPlan] = useState<ParsedPlan | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sharedMode, setSharedMode] = useState(false);
  const [exportedPath, setExportedPath] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      decodeShareUrl(hash).then((result) => {
        if (result) {
          setPlan({
            ...result.plan,
            todos: [],
            isProject: false,
            filePath: "",
          });
          setAnnotations(result.annotations);
          setSharedMode(true);
          setLoading(false);
          history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          );
        } else {
          fetchPlan();
        }
      });
    } else {
      fetchPlan();
    }
  }, []);

  function fetchPlan() {
    fetch("/api/plan")
      .then((r) => r.json())
      .then((data: ParsedPlan) => {
        setPlan(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }

  const addAnnotation = useCallback(
    (ann: Omit<Annotation, "id" | "createdAt">) => {
      setAnnotations((prev) => [
        ...prev,
        { ...ann, id: crypto.randomUUID(), createdAt: Date.now() },
      ]);
    },
    [],
  );

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addGlobalComment = useCallback(() => {
    const text = prompt("Add a global note for the team:");
    if (text?.trim()) {
      addAnnotation({ type: "GLOBAL_COMMENT", originalText: "", text });
    }
  }, [addAnnotation]);

  const handleShare = async () => {
    if (!plan) return;
    const url = await encodeShareUrl(plan, annotations);
    setShareUrl(url);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportFeedback = async () => {
    if (!plan) return;
    try {
      const res = await fetch("/api/export-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annotations, planName: plan.name }),
      });
      const data = (await res.json()) as { path: string };
      setExportedPath(data.path);
    } catch {
      alert(
        "Could not export feedback. Make sure the local server is running.",
      );
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="heartbeat">♥</div>
        <span>Loading plan...</span>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="loading">
        <div className="error-icon">⚠</div>
        <span>No plan found. Open a plan file with:</span>
        <code>cursor-plan-preview serve &lt;file.plan.md&gt;</code>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <span className="logo">
            <span className="logo-icon">✚</span>
            <span className="logo-text">CPR</span>
          </span>
          <span className="header-subtitle">Cursor Plan Preview</span>
          {sharedMode && <span className="shared-badge">Shared Preview</span>}
        </div>
        <div className="header-actions">
          {annotations.length > 0 && !sharedMode && (
            <button className="btn-secondary" onClick={handleExportFeedback}>
              Export Feedback
            </button>
          )}
          <button className="btn-primary" onClick={handleShare}>
            {copied ? "Copied!" : "Share Plan"}
          </button>
        </div>
      </header>

      {exportedPath && (
        <div className="export-banner">
          Feedback exported to <code>{exportedPath}</code> — the agent will read
          it on the next prompt.
          <button onClick={() => setExportedPath(null)}>✕</button>
        </div>
      )}

      {shareUrl && (
        <div className="share-banner">
          <span>Share this link with your team:</span>
          <input
            readOnly
            value={shareUrl}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button onClick={() => setShareUrl(null)}>✕</button>
        </div>
      )}

      <div className="layout">
        <PlanViewer
          plan={plan}
          annotations={annotations}
          onAnnotationCreate={addAnnotation}
        />
        <AnnotationSidebar
          annotations={annotations}
          onRemove={removeAnnotation}
          onGlobalComment={addGlobalComment}
        />
      </div>
    </div>
  );
}
