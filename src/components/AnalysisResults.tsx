import type { AnalysisResult } from "@/types";

type AnalysisResultsProps = {
  result: AnalysisResult;
};

function getConfidenceStyles(confidence: "low" | "medium" | "high") {
  if (confidence === "high") {
    return "border-[var(--color-success)]/20 bg-[var(--color-success)]/10 text-[var(--color-success)]";
  }
  if (confidence === "medium") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-400";
  }
  return "border-red-500/20 bg-red-500/10 text-red-400";
}

function getDotStyles(confidence: "low" | "medium" | "high") {
  if (confidence === "high") return "bg-[var(--color-success)]";
  if (confidence === "medium") return "bg-amber-400";
  return "bg-red-400";
}

export default function AnalysisResults({ result }: AnalysisResultsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-5">
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--color-muted)] px-3">
          ANALYSIS RESULTS
        </span>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="flex justify-between items-start gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
              ROOM TYPE
            </p>
            <p className="font-display font-semibold text-xl text-[var(--color-text)] mt-1">
              {result.roomType}
            </p>
          </div>
          <span
            className={`font-mono text-[10px] uppercase tracking-widest border rounded-sm px-2 py-1 shrink-0 ${
              result.overallConfidence === "high"
                ? "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20"
                : result.overallConfidence === "medium"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            {result.overallConfidence} confidence
          </span>
        </div>

        <div className="border-t border-[var(--color-border)] my-4" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-muted-2)] mb-1">
              LENGTH
            </p>
            <p className="font-display font-semibold text-lg text-[var(--color-text)]">
              {result.dimensions.length}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-muted-2)] mb-1">
              WIDTH
            </p>
            <p className="font-display font-semibold text-lg text-[var(--color-text)]">
              {result.dimensions.width}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-muted-2)] mb-1">
              HEIGHT
            </p>
            <p className="font-display font-semibold text-lg text-[var(--color-text)]">
              {result.dimensions.height}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-muted-2)] mb-1">
              FLOOR AREA
            </p>
            <p className="font-display font-semibold text-lg text-[var(--color-text)]">
              {result.dimensions.floorArea}
            </p>
          </div>
        </div>

        {result.notes && (
          <div className="bg-[var(--color-surface-2)] rounded-lg px-4 py-3 mt-4">
            <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-muted-2)] mb-1">
              NOTE
            </p>
            <p className="font-mono text-xs text-[var(--color-muted)] leading-relaxed">
              {result.notes}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-3">
          DETECTED OBJECTS ({result.detectedObjects.length})
        </p>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="bg-[var(--color-surface-2)] px-4 py-2.5 grid grid-cols-3 border-b border-[var(--color-border)] font-mono text-[9px] uppercase tracking-widest text-[var(--color-muted-2)]">
            <span>OBJECT</span>
            <span>EST. SIZE</span>
            <span>CONFIDENCE</span>
          </div>
          {result.detectedObjects.map((object, index) => (
            <div
              key={`${object.name}-${index}`}
              className="px-4 py-3 grid grid-cols-3 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)] transition-colors"
            >
              <span className="font-mono text-xs text-[var(--color-text)]">
                {object.name}
              </span>
              <span className="font-mono text-xs text-[var(--color-muted)]">
                {object.estimatedSize}
              </span>
              <span className="flex items-center gap-1.5 font-mono text-xs text-[var(--color-muted)]">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    object.confidence === "high"
                      ? "bg-[var(--color-success)]"
                      : object.confidence === "medium"
                        ? "bg-amber-400"
                        : "bg-red-400"
                  }`}
                />
                {object.confidence}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
