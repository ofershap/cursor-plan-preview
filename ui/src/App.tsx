import { useState, useEffect, useRef, useCallback } from "react";
import { marked } from "marked";
import type { ParsedPlan, Annotation, AnnotationType } from "./types";
import { encodeShareUrl, decodeShareUrl } from "./utils/sharing";
import "./app.css";

marked.setOptions({ breaks: true, gfm: true });

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

  useEffect(() => {
    if (!needsText) onSave("");
  }, [needsText, onSave]);

  if (!needsText) return null;

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

  const handleModalSave = useCallback(
    (text: string) => {
      setModal((current) => {
        if (!current) return null;
        onAnnotationCreate({
          type: current.type,
          originalText: current.originalText,
          text,
        });
        window.getSelection()?.removeAllRanges();
        return null;
      });
    },
    [onAnnotationCreate],
  );

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
  let html = marked.parse(markdown) as string;

  for (const ann of annotations) {
    if (!ann.originalText) continue;
    const escaped = ann.originalText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped);

    switch (ann.type) {
      case "DELETION":
        html = html.replace(
          re,
          `<mark class="ann-delete">${ann.originalText}</mark>`,
        );
        break;
      case "COMMENT":
        html = html.replace(
          re,
          `<mark class="ann-comment" title="${(ann.text ?? "").replace(/"/g, "&quot;")}">${ann.originalText}</mark>`,
        );
        break;
      case "REPLACEMENT":
        html = html.replace(
          re,
          `<mark class="ann-replace">${ann.originalText} \u2192 ${ann.text ?? ""}</mark>`,
        );
        break;
    }
  }

  return html;
}

function LandingPage() {
  return (
    <div className="landing">
      <div className="landing-hero">
        <div className="landing-logo">
          <span className="logo-icon">✚</span>
          <span className="logo-text">CPR</span>
        </div>
        <h1 className="landing-title">Cursor Plan Preview</h1>
        <p className="landing-tagline">
          Your agent writes a plan. Your team should see it before it builds.
        </p>
        <div className="landing-install">
          <code>npx cursor-plan-preview --setup</code>
        </div>
        <a
          href="https://github.com/ofershap/cursor-plan-preview"
          className="landing-cta"
          target="_blank"
          rel="noopener"
        >
          View on GitHub
        </a>
      </div>

      <div className="landing-steps">
        <div className="step">
          <div className="step-num">1</div>
          <div className="step-content">
            <h3>Agent saves a plan</h3>
            <p>
              Cursor's plan mode generates a .plan.md file. CPR hooks into the
              save and opens it in your browser.
            </p>
          </div>
        </div>
        <div className="step">
          <div className="step-num">2</div>
          <div className="step-content">
            <h3>You annotate and share</h3>
            <p>
              Highlight text, add comments, suggest replacements. Click Share to
              get a URL with everything encoded in it.
            </p>
          </div>
        </div>
        <div className="step">
          <div className="step-num">3</div>
          <div className="step-content">
            <h3>Team reviews, agent adapts</h3>
            <p>
              Your teammate opens the link, adds feedback, shares back. Export
              the annotations and the agent reads them before building.
            </p>
          </div>
        </div>
      </div>

      <div className="landing-features">
        <div className="feature">
          <span className="feature-icon">🔒</span>
          <span>
            No server. Plan data lives only in the URL hash, never sent
            anywhere.
          </span>
        </div>
        <div className="feature">
          <span className="feature-icon">⚡</span>
          <span>One command install. Works with existing Cursor hooks.</span>
        </div>
        <div className="feature">
          <span className="feature-icon">🔗</span>
          <span>
            Share via any channel. Slack, email, DM. No accounts needed.
          </span>
        </div>
      </div>

      <div className="landing-footer">
        <a
          href="https://github.com/ofershap/cursor-plan-preview"
          target="_blank"
          rel="noopener"
        >
          GitHub
        </a>
        <span className="landing-dot">·</span>
        <a
          href="https://www.npmjs.com/package/cursor-plan-preview"
          target="_blank"
          rel="noopener"
        >
          npm
        </a>
        <span className="landing-dot">·</span>
        <span className="landing-by">
          by{" "}
          <a href="https://github.com/ofershap" target="_blank" rel="noopener">
            ofershap
          </a>
        </span>
      </div>
    </div>
  );
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
    const isGhPages = window.location.hostname.includes("github.io");
    if (isGhPages) {
      setLoading(false);
      return;
    }
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
    return <LandingPage />;
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
