import { AlertCircle, Ruler } from "lucide-react";

type ImageViewerProps = {
  originalUrl: string;
  currentUrl: string;
  hasEdits: boolean;
  showBeforeAfter: boolean;
  onToggleBeforeAfter: () => void;
  isEditing: boolean;
  annotatedImageUrl: string | null;
  showAnnotated: boolean;
  isAnnotating: boolean;
  onToggleAnnotated: () => void;
  annotationError: string | null;
  onAnnotate: () => void;
};

export default function ImageViewer({
  originalUrl,
  currentUrl,
  hasEdits,
  showBeforeAfter,
  onToggleBeforeAfter,
  isEditing,
  annotatedImageUrl,
  showAnnotated,
  isAnnotating,
  onToggleAnnotated,
  annotationError,
  onAnnotate,
}: ImageViewerProps) {
  const displayUrl = showBeforeAfter
    ? originalUrl
    : showAnnotated && annotatedImageUrl
      ? annotatedImageUrl
      : currentUrl;

  const statusLabel =
    showAnnotated && annotatedImageUrl
      ? "DIMENSIONS"
      : showBeforeAfter
        ? "ORIGINAL"
        : hasEdits
          ? "EDITED"
          : null;

  return (
    <>
      <div className="relative rounded-xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]">
        <img
          src={displayUrl}
          alt="Room view"
          className="w-full max-h-[260px] md:max-h-[420px] object-contain block"
        />

        {statusLabel && (
          <div className="absolute top-3 left-3 bg-[var(--color-surface-3)]/90 font-mono text-[9px] uppercase tracking-widest text-[var(--color-muted)] px-2 py-1 rounded">
            {statusLabel}
          </div>
        )}

        <div className="absolute top-3 right-3 flex gap-2">
          {hasEdits && (
            <button
              type="button"
              onClick={onToggleBeforeAfter}
              className="bg-[var(--color-surface-3)]/90 backdrop-blur-sm border border-[var(--color-border-hover)] rounded-lg px-3 py-1.5 cursor-pointer font-mono text-[10px] uppercase tracking-widest text-[var(--color-accent)] hover:bg-[var(--color-surface-2)] transition-all duration-200"
            >
              {showBeforeAfter ? "AFTER ↗" : "BEFORE ↙"}
            </button>
          )}

          <button
            type="button"
            onClick={onAnnotate}
            disabled={isAnnotating}
            className={`
              backdrop-blur-sm border rounded-lg px-3 py-1.5 
              font-mono text-[10px] uppercase tracking-widest
              transition-all duration-200 flex items-center gap-1.5
              ${
                isAnnotating
                  ? "bg-[var(--color-surface-3)]/90 border-[var(--color-border-hover)] text-[var(--color-muted)] cursor-not-allowed"
                  : "bg-[var(--color-surface-3)]/90 border-[var(--color-border-hover)] text-[var(--color-accent)] hover:bg-[var(--color-surface-2)]"
              }
            `}
          >
            {isAnnotating ? (
              <>
                <span className="w-3 h-3 border border-[var(--color-accent-dim)] border-t-[var(--color-accent)] rounded-full animate-spin" />
                Annotating...
              </>
            ) : (
              <>
                <Ruler size={10} />
                {showAnnotated ? "Re-annotate" : "Annotate"}
              </>
            )}
          </button>

          {annotatedImageUrl && !isAnnotating && (
            <button
              type="button"
              onClick={onToggleAnnotated}
              className="bg-[var(--color-surface-3)]/90 backdrop-blur-sm border border-[var(--color-border-hover)] rounded-lg px-3 py-1.5 cursor-pointer font-mono text-[10px] uppercase tracking-widest text-[var(--color-accent)] hover:bg-[var(--color-surface-2)] transition-all duration-200"
            >
              {showAnnotated ? "Hide Dimensions" : "Show Dimensions"}
            </button>
          )}
        </div>

        {isEditing && (
          <div className="absolute inset-0 bg-[var(--color-bg)]/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 rounded-full animate-spin border-[var(--color-accent-dim)] border-t-[var(--color-accent)]" />
            <p className="font-mono text-xs text-[var(--color-muted)]">
              APPLYING EDIT...
            </p>
          </div>
        )}
      </div>

      {annotationError && (
        <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertCircle size={14} className="text-[var(--color-error)] shrink-0" />
          <p className="font-mono text-xs text-[var(--color-error)]">
            {annotationError}
          </p>
        </div>
      )}
    </>
  );
}
