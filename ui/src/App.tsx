import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

function CommentPopup({
  position,
  onSave,
  onCancel,
}: {
  position: { top: number; left: number };
  onSave: (text: string, author: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [name, setName] = useState(
    () => localStorage.getItem("cpr-reviewer") ?? "",
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const popup = popupRef.current;
    if (!popup) return;
    const rect = popup.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - 8) {
      popup.style.top = `${position.top - rect.height - 8}px`;
    }
  }, [position]);

  function submit() {
    if (!text.trim()) return;
    const author = name.trim();
    if (author) localStorage.setItem("cpr-reviewer", author);
    onSave(text.trim(), author);
  }

  return (
    <>
      <div className="comment-backdrop" onClick={onCancel} />
      <div
        ref={popupRef}
        className="comment-popup"
        style={{ top: position.top, left: position.left }}
      >
        <input
          className="comment-popup-name"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
        />
        <textarea
          ref={textareaRef}
          className="comment-popup-textarea"
          placeholder="Leave a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            if (e.key === "Escape") onCancel();
          }}
          rows={2}
        />
        <div className="comment-popup-actions">
          <span className="comment-popup-hint">⌘+Enter</span>
          <button
            className="comment-popup-submit"
            disabled={!text.trim()}
            onClick={submit}
          >
            Comment
          </button>
        </div>
      </div>
    </>
  );
}

function FinishReviewModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="finish-review-backdrop" onClick={onClose} />
      <div className="finish-review-modal">
        <div className="finish-review-check">✓</div>
        <h2 className="finish-review-title">Review complete</h2>
        <p className="finish-review-desc">
          Your notes are saved in the link below. Send it back to the developer
          so they can incorporate your feedback.
        </p>
        <div className="finish-review-url">
          <input
            ref={inputRef}
            readOnly
            value={url}
            onClick={() => inputRef.current?.select()}
          />
          <button
            className="finish-review-copy"
            onClick={() => {
              navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
        <button className="finish-review-done" onClick={onClose}>
          Done
        </button>
      </div>
    </>
  );
}

function AnnotationSidebar({
  annotations,
  onRemove,
  onGlobalComment,
  onHoverNote,
}: {
  annotations: Annotation[];
  onRemove: (id: string) => void;
  onGlobalComment: () => void;
  onHoverNote: (originalText: string | null) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">
          Review Notes
          {annotations.length > 0 && (
            <span className="badge">{annotations.length}</span>
          )}
        </span>
        <button
          className="btn-ghost"
          onClick={onGlobalComment}
          title="Add note not tied to specific text"
        >
          + Note
        </button>
      </div>
      {annotations.length === 0 ? (
        <div className="sidebar-empty">
          <span>Click any block to add a comment</span>
        </div>
      ) : (
        <ul className="annotation-list">
          {annotations.map((a) => (
            <li
              key={a.id}
              className="annotation-item"
              style={{ borderLeftColor: ANNOTATION_COLORS[a.type] }}
              onMouseEnter={() => onHoverNote(a.originalText || null)}
              onMouseLeave={() => onHoverNote(null)}
            >
              {a.author && <div className="annotation-author">{a.author}</div>}
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

const BLOCK_SELECTOR = "p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, .todos";

function PlanViewer({
  plan,
  annotations,
  onAnnotationCreate,
  highlightedText,
}: {
  plan: ParsedPlan;
  annotations: Annotation[];
  onAnnotationCreate: (
    annotation: Omit<Annotation, "id" | "createdAt">,
  ) => void;
  highlightedText: string | null;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const [commentTarget, setCommentTarget] = useState<{
    element: HTMLElement;
    text: string;
    position: { top: number; left: number };
  } | null>(null);

  useEffect(() => {
    const container = contentRef.current;
    const meta = metaRef.current;
    if (!container && !meta) return;

    function findBlock(target: EventTarget | null): HTMLElement | null {
      if (!(target instanceof HTMLElement)) return null;
      const el = target.closest(BLOCK_SELECTOR);
      if (!el || !(el instanceof HTMLElement)) return null;
      if (container?.contains(el) || meta?.contains(el)) return el;
      return null;
    }

    function onMouseOver(e: MouseEvent) {
      const block = findBlock(e.target);
      if (block) block.classList.add("block-hover");
    }

    function onMouseOut(e: MouseEvent) {
      const block = findBlock(e.target);
      if (block) block.classList.remove("block-hover");
    }

    function onClick(e: MouseEvent) {
      const block = findBlock(e.target);
      if (!block) return;
      if ((e.target as HTMLElement).closest(".comment-popup")) return;
      const blockText = block.textContent?.trim() ?? "";
      if (!blockText) return;
      const rect = block.getBoundingClientRect();
      setCommentTarget({
        element: block,
        text: blockText,
        position: { top: rect.bottom + 4, left: rect.left },
      });
    }

    const targets = [container, meta].filter(Boolean) as HTMLElement[];
    targets.forEach((t) => {
      t.addEventListener("mouseover", onMouseOver);
      t.addEventListener("mouseout", onMouseOut);
      t.addEventListener("click", onClick);
    });

    return () => {
      targets.forEach((t) => {
        t.removeEventListener("mouseover", onMouseOver);
        t.removeEventListener("mouseout", onMouseOut);
        t.removeEventListener("click", onClick);
      });
    };
  }, []);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const prev = container.querySelector(".sidebar-highlight");
    if (prev) prev.classList.remove("sidebar-highlight");
    if (!highlightedText) return;
    const marks = container.querySelectorAll("mark");
    for (const mark of marks) {
      if (mark.textContent?.includes(highlightedText.slice(0, 40))) {
        mark.classList.add("sidebar-highlight");
        mark.scrollIntoView({ behavior: "smooth", block: "center" });
        break;
      }
    }
  }, [highlightedText]);

  const handleCommentSave = useCallback(
    (text: string, author: string) => {
      if (!commentTarget) return;
      onAnnotationCreate({
        type: "COMMENT",
        originalText: commentTarget.text.slice(0, 120),
        text,
        ...(author ? { author } : {}),
      });
      setCommentTarget(null);
    },
    [commentTarget, onAnnotationCreate],
  );

  const renderedBody = renderMarkdown(plan.body, annotations);

  return (
    <div className="viewer">
      <div className="plan-meta" ref={metaRef}>
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
        dangerouslySetInnerHTML={{ __html: renderedBody }}
      />

      {commentTarget && (
        <CommentPopup
          position={commentTarget.position}
          onSave={handleCommentSave}
          onCancel={() => setCommentTarget(null)}
        />
      )}
    </div>
  );
}

function preprocessCursorMarkdown(md: string): string {
  let result = md;

  result = result.replace(
    /```(\d+:\d+:.+?)\n([\s\S]*?)```/g,
    (_match, info: string, code: string) => {
      const parts = info.split(":");
      if (parts.length >= 3) {
        const startLine = parts[0];
        const endLine = parts[1];
        const filePath = parts.slice(2).join(":");
        const lineRange =
          startLine === endLine ? `L${startLine}` : `L${startLine}-${endLine}`;
        return `<div class="code-ref-file">${filePath} (${lineRange})</div>\n\n\`\`\`\n${code}\`\`\``;
      }
      return _match;
    },
  );

  result = result.replace(
    /`\[([^\]]+)\]\(([^)]+)\)`/g,
    (_match, text: string, href: string) => `[${text}](${href})`,
  );

  return result;
}

function renderMarkdown(markdown: string, annotations: Annotation[]): string {
  const processed = preprocessCursorMarkdown(markdown);
  let html = marked.parse(processed) as string;

  for (const ann of annotations) {
    if (!ann.originalText) continue;
    const escaped = ann.originalText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped);
    const authorTag = ann.author
      ? `<span class="ann-author">${ann.author}</span> `
      : "";
    const noteHtml = ann.text
      ? `<span class="ann-note" style="border-left-color: ${ANNOTATION_COLORS[ann.type]}">${authorTag}${ann.text}</span>`
      : "";

    switch (ann.type) {
      case "DELETION":
        html = html.replace(
          re,
          `<mark class="ann-delete">${ann.originalText}</mark>${noteHtml}`,
        );
        break;
      case "COMMENT":
        html = html.replace(
          re,
          `<mark class="ann-comment">${ann.originalText}</mark>${noteHtml}`,
        );
        break;
      case "REPLACEMENT":
        html = html.replace(
          re,
          `<mark class="ann-replace">${ann.originalText} \u2192 ${ann.text ?? ""}</mark>`,
        );
        break;
      case "INSERTION":
        html = html.replace(
          re,
          `<mark class="ann-insert">${ann.originalText}</mark>${noteHtml}`,
        );
        break;
    }
  }

  return html;
}

function ProductMockup() {
  return (
    <div className="mockup">
      <div className="mockup-chrome">
        <div className="mockup-dots">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <span className="mockup-title">CPR</span>
      </div>
      <div className="mockup-body">
        <div className="mockup-content">
          <div className="mockup-heading">Refactor auth middleware</div>
          <div className="mockup-line" />
          <div className="mockup-line mockup-line-short" />
          <div className="mockup-line mockup-line-highlight-delete">
            Remove legacy session checks
          </div>
          <div className="mockup-line" />
          <div className="mockup-line mockup-line-highlight-comment">
            Add rate limiting per user
          </div>
          <div className="mockup-line mockup-line-short" />
          <div className="mockup-line" />
        </div>
        <div className="mockup-sidebar">
          <div className="mockup-sidebar-title">
            Annotations <span className="mockup-badge">2</span>
          </div>
          <div className="mockup-ann mockup-ann-delete">
            <span className="mockup-ann-label">Delete</span>
            <span className="mockup-ann-text">
              &ldquo;Remove legacy session checks&rdquo;
            </span>
          </div>
          <div className="mockup-ann mockup-ann-comment">
            <span className="mockup-ann-label">Comment</span>
            <span className="mockup-ann-text">
              &ldquo;Should we use a token bucket here?&rdquo;
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("cpr-theme");
      if (stored === "light" || stored === "dark") return stored;
    }
    return "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("cpr-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggleTheme };
}

function ThemeToggle({
  theme,
  toggleTheme,
}: {
  theme: "dark" | "light";
  toggleTheme: () => void;
}) {
  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? "☀" : "🌙"}
    </button>
  );
}

function LandingPage({
  theme,
  toggleTheme,
}: {
  theme: "dark" | "light";
  toggleTheme: () => void;
}) {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <a href="/" className="nav-left">
            <span className="logo-icon">✚</span>
            <span className="logo-text">CPR</span>
          </a>
          <div className="nav-right">
            <a
              href="https://github.com/ofershap/cursor-plan-preview"
              className="nav-link"
              target="_blank"
              rel="noopener"
            >
              GitHub
            </a>
            <span className="nav-separator">|</span>
            <a
              href="https://www.npmjs.com/package/cursor-plan-preview"
              className="nav-link"
              target="_blank"
              rel="noopener"
            >
              npm
            </a>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        </div>
      </nav>

      <div className="landing-hero">
        <div className="landing-badge">For Cursor IDE</div>
        <h1 className="landing-headline">
          Review agent plans.
          <br />
          <span className="headline-dim">Before they build.</span>
        </h1>
        <p className="landing-sub">
          Visual plan review for Cursor. Annotate inline, share with your team,
          get feedback back to the agent. No backend, no accounts.
        </p>
        <div className="landing-ctas">
          <div className="landing-install">
            <code>npx cursor-plan-preview --setup</code>
          </div>
          <div className="landing-cta-row">
            <a
              href="https://github.com/ofershap/cursor-plan-preview"
              className="landing-cta-primary"
              target="_blank"
              rel="noopener"
            >
              View on GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/cursor-plan-preview"
              className="landing-cta-secondary"
              target="_blank"
              rel="noopener"
            >
              npm package
            </a>
          </div>
        </div>
      </div>

      <ProductMockup />

      <div className="landing-problem-solution">
        <div className="ps-card">
          <h3 className="ps-label">The Problem</h3>
          <p>
            Cursor's plan mode generates a detailed implementation plan. You
            approve it, the agent starts building. Your teammates find out when
            the PR lands. There's no review step. No "can you check if this
            makes sense?" moment. No way to mark specific sections.
          </p>
        </div>
        <div className="ps-card">
          <h3 className="ps-label ps-label-green">The Solution</h3>
          <p>
            Select the exact parts of the plan you want to change. Mark for
            deletion, add a comment, or suggest a replacement. Share with your
            team via a single URL. Feedback flows back to your agent
            automatically.
          </p>
        </div>
      </div>

      <div className="landing-features">
        <div className="feature-card">
          <div className="feature-card-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h4>Runs locally.</h4>
          <p>
            No cloud. No network requests. Plans never leave your machine. CPR
            runs a local server that opens your browser.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <h4>Share privately.</h4>
          <p>
            Plans and annotations compress into the URL itself. Share a link. No
            accounts, no database, no third parties.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </div>
          <h4>One command.</h4>
          <p>
            Run <code>npx cursor-plan-preview --setup</code> and you're done.
            Hooks into Cursor's afterFileEdit. Zero config.
          </p>
        </div>
      </div>

      <div className="landing-how">
        <h2>How it works</h2>
        <div className="landing-steps">
          <div className="step">
            <div className="step-num">1</div>
            <div className="step-content">
              <h4>Agent saves a plan</h4>
              <p>
                Cursor's plan mode writes a <code>.plan.md</code> file. CPR's
                hook detects the save and opens it in your browser.
              </p>
            </div>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <div className="step-content">
              <h4>You annotate and share</h4>
              <p>
                Select text, choose an action (delete, comment, replace). Click
                Share to get a URL with everything compressed in it.
              </p>
            </div>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <div className="step-content">
              <h4>Team reviews, agent adapts</h4>
              <p>
                Your teammate opens the link, adds their feedback. Export
                annotations and the agent reads them before building.
              </p>
            </div>
          </div>
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
  const { theme, toggleTheme } = useTheme();
  const [plan, setPlan] = useState<ParsedPlan | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [highlightedText, setHighlightedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharedMode, setSharedMode] = useState(false);
  const [exportedPath, setExportedPath] = useState<string | null>(null);
  const [finishReviewUrl, setFinishReviewUrl] = useState<string | null>(null);
  const hasSharedRef = useRef(false);
  const initialAnnotationCount = useRef(0);

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
          initialAnnotationCount.current = result.annotations.length;
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

  const hasNewNotes = useMemo(
    () => annotations.length > initialAnnotationCount.current,
    [annotations],
  );

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (hasNewNotes && !hasSharedRef.current) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasNewNotes]);

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
      const author = localStorage.getItem("cpr-reviewer") ?? "";
      addAnnotation({
        type: "GLOBAL_COMMENT",
        originalText: "",
        text,
        ...(author ? { author } : {}),
      });
    }
  }, [addAnnotation]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const handleShare = async () => {
    if (!plan) return;
    const url = await encodeShareUrl(plan, annotations);
    hasSharedRef.current = true;
    if (sharedMode) {
      await navigator.clipboard.writeText(url);
      setFinishReviewUrl(url);
    } else {
      await navigator.clipboard.writeText(url);
      window.open(url, "_blank");
      showToast("Link copied to clipboard — share it with your team");
    }
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
    return <LandingPage theme={theme} toggleTheme={toggleTheme} />;
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
              Send to Cursor
            </button>
          )}
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <button className="btn-primary" onClick={handleShare}>
            {sharedMode ? "Finish Review" : "Share Plan"}
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

      {sharedMode && (
        <div className="reviewer-banner">
          You're reviewing <strong>{plan.name}</strong>. Add your notes below,
          then click <strong>Finish Review</strong> to send it back.
        </div>
      )}

      {finishReviewUrl && (
        <FinishReviewModal
          url={finishReviewUrl}
          onClose={() => setFinishReviewUrl(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      <div className="layout">
        <PlanViewer
          plan={plan}
          annotations={annotations}
          onAnnotationCreate={addAnnotation}
          highlightedText={highlightedText}
        />
        <AnnotationSidebar
          annotations={annotations}
          onRemove={removeAnnotation}
          onGlobalComment={addGlobalComment}
          onHoverNote={setHighlightedText}
        />
      </div>
    </div>
  );
}
