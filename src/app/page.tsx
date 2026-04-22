"use client";

import { AlertCircle, Download, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AnalysisResults from "@/components/AnalysisResults";
import EditPanel from "@/components/EditPanel";
import ImageViewer from "@/components/ImageViewer";
import type { AnalysisResult } from "@/types";
import { exportMeasurementsPdf } from "@/utils/exportPdf";

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [calibrationValue, setCalibrationValue] = useState<string>("");
  const [calibrationTarget, setCalibrationTarget] =
    useState<string>("door_height");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [editHistory, setEditHistory] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationError, setAnnotationError] = useState<string | null>(null);
  const [showAnnotated, setShowAnnotated] = useState(false);

  const [activeEditTab, setActiveEditTab] = useState<"remove" | "add" | "material">("remove");
  const [editPrompt, setEditPrompt] = useState("");
  const [materialSurface, setMaterialSurface] =
    useState<"floor" | "walls" | "ceiling">("floor");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const originalImageUrlRef = useRef<string | null>(null);

  const currentImageUrl =
    editHistory.length > 0 ? editHistory[editHistory.length - 1] : originalImageUrl;
  const hasEdits = editHistory.length > 0;

  function handleFileSelect(file: File) {
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    const maxSize = 10 * 1024 * 1024;
    if (!validTypes.includes(file.type)) {
      setUploadError("Please upload a PNG, JPG, or WebP image");
      return;
    }
    if (file.size > maxSize) {
      setUploadError("File must be under 10MB");
      return;
    }

    if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
    editHistory.forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    if (annotatedImageUrl) URL.revokeObjectURL(annotatedImageUrl);

    setEditHistory([]);
    setAnalysisResult(null);
    setAnalysisError(null);
    setEditError(null);
    setAnnotatedImageUrl(null);
    setShowAnnotated(false);
    setAnnotationError(null);
    setEditPrompt("");
    setUploadError(null);

    setUploadedFile(file);
    setOriginalImageUrl(URL.createObjectURL(file));
  }

  function handleClearUploaded() {
    if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
    editHistory.forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    setUploadedFile(null);
    setOriginalImageUrl(null);
    setEditHistory([]);
    setAnalysisResult(null);
    setAnalysisError(null);
    setEditError(null);
    setEditPrompt("");
    setShowBeforeAfter(false);
  }

  function handleUndo() {
    setEditHistory((prev) => {
      const next = prev.slice(0, -1);
      const removed = prev[prev.length - 1];
      if (removed?.startsWith("blob:")) URL.revokeObjectURL(removed);
      return next;
    });
    setEditError(null);
  }

  function handleRestart() {
    editHistory.forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    setEditHistory([]);
    setEditError(null);
    setEditPrompt("");
    setShowBeforeAfter(false);
  }

  async function handleEdit() {
    if (!currentImageUrl || !editPrompt.trim()) return;
    setIsEditing(true);
    setEditError(null);

    try {
      let imageDataUrl: string;
      if (currentImageUrl.startsWith("blob:")) {
        const response = await fetch(currentImageUrl);
        const blob = await response.blob();
        imageDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        imageDataUrl = currentImageUrl;
      }

      const formData = new FormData();
      formData.append("imageData", imageDataUrl);
      formData.append("editType", activeEditTab);
      formData.append("editPrompt", editPrompt);
      formData.append("materialSurface", materialSurface);
      formData.append("analysisContext", JSON.stringify(analysisResult));

      const res = await fetch("/api/edit", { method: "POST", body: formData });
      let json: Record<string, unknown>;
      try {
        const text = await res.text();
        json = JSON.parse(text);
      } catch {
        throw new Error(
          "The server returned an unexpected response. Please try again.",
        );
      }

      if (!res.ok) {
        throw new Error(
          typeof json.error === "string"
            ? json.error
            : "Request failed. Please try again.",
        );
      }

      const result = json.result;
      if (!result || typeof result !== "object") {
        throw new Error("Edit failed");
      }

      const imageData =
        typeof (result as { imageData?: unknown }).imageData === "string"
          ? (result as { imageData: string }).imageData
          : null;
      if (!imageData) {
        throw new Error("Edit failed");
      }
      const mimeType =
        typeof (result as { mimeType?: unknown }).mimeType === "string"
          ? (result as { mimeType: string }).mimeType
          : "image/png";

      const byteString = atob(imageData);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i += 1) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeType });
      const newUrl = URL.createObjectURL(blob);

      setEditHistory((prev) => [...prev, newUrl]);
      setEditPrompt("");
      setShowBeforeAfter(false);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Edit failed. Please try again.");
    } finally {
      setIsEditing(false);
    }
  }

  async function handleAnnotate() {
    if (!originalImageUrl || !analysisResult) return;
    setIsAnnotating(true);
    setAnnotationError(null);

    try {
      let imageDataUrl: string;
      if (originalImageUrl.startsWith("blob:")) {
        const response = await fetch(originalImageUrl);
        const blob = await response.blob();
        imageDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        imageDataUrl = originalImageUrl;
      }

      const formData = new FormData();
      formData.append("imageData", imageDataUrl);
      formData.append("analysisContext", JSON.stringify(analysisResult));

      const res = await fetch("/api/annotate", {
        method: "POST",
        body: formData,
      });
      let json: Record<string, unknown>;
      try {
        const text = await res.text();
        json = JSON.parse(text);
      } catch {
        throw new Error(
          "The server returned an unexpected response. Please try again.",
        );
      }

      if (!res.ok) {
        throw new Error(
          typeof json.error === "string"
            ? json.error
            : "Request failed. Please try again.",
        );
      }

      const result = json.result;
      if (!result || typeof result !== "object") {
        throw new Error("Annotation failed");
      }

      const imageData =
        typeof (result as { imageData?: unknown }).imageData === "string"
          ? (result as { imageData: string }).imageData
          : null;
      if (!imageData) {
        throw new Error("Annotation failed");
      }
      const mimeType =
        typeof (result as { mimeType?: unknown }).mimeType === "string"
          ? (result as { mimeType: string }).mimeType
          : "image/png";

      const byteString = atob(imageData);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i += 1) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], {
        type: mimeType,
      });
      const newUrl = URL.createObjectURL(blob);

      if (annotatedImageUrl) URL.revokeObjectURL(annotatedImageUrl);
      setAnnotatedImageUrl(newUrl);
      setShowAnnotated(true);
    } catch (err: unknown) {
      setAnnotationError(err instanceof Error ? err.message : "Annotation failed.");
    } finally {
      setIsAnnotating(false);
    }
  }

  async function handleAnalyze() {
    if (!uploadedFile) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append("image", uploadedFile);
    formData.append("calibrationValue", calibrationValue);
    formData.append("calibrationTarget", calibrationTarget);

    try {
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      let json: Record<string, unknown>;
      try {
        const text = await res.text();
        json = JSON.parse(text);
      } catch {
        throw new Error(
          "The server returned an unexpected response. Please try again.",
        );
      }

      if (!res.ok) {
        throw new Error(
          typeof json.error === "string"
            ? json.error
            : "Request failed. Please try again.",
        );
      }

      setAnalysisResult(json.result as AnalysisResult);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: unknown) {
      setAnalysisError(
        err instanceof Error ? err.message : "Analysis failed. Please try again.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  useEffect(() => {
    originalImageUrlRef.current = originalImageUrl;
  }, [originalImageUrl]);

  useEffect(() => {
    if (!uploadError) return;
    const timeoutId = setTimeout(() => setUploadError(null), 3000);
    return () => clearTimeout(timeoutId);
  }, [uploadError]);

  useEffect(() => {
    return () => {
      editHistory.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
      if (annotatedImageUrl) URL.revokeObjectURL(annotatedImageUrl);
    };
  }, [editHistory, annotatedImageUrl]);

  useEffect(() => {
    return () => {
      const url = originalImageUrlRef.current;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-[60px]">
      <div className="mx-auto w-full max-w-2xl px-6 md:max-w-3xl">
        <section className="pt-12">
          <span className="inline-block font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--color-accent)] border border-[var(--color-accent-dim)] rounded-sm px-2.5 py-1 animate-fadeUp delay-100">
            SPATIAL INTELLIGENCE · INTERIOR ANALYSIS
          </span>
          <h1 className="mt-4 font-display font-bold leading-tight text-[2.2rem] md:text-[2.8rem] text-[var(--color-text)] animate-fadeUp delay-200">
            Interior
            <br />
            <span style={{ color: "var(--color-accent)" }}>Analyzer</span>
          </h1>
          <p className="mt-4 font-mono text-sm text-[var(--color-muted)] leading-relaxed animate-fadeUp delay-300">
            Upload a room photo. Get dimensions, object detection, and AI-powered
            design edits.
          </p>
          <div className="mt-6 w-8 h-px bg-[var(--color-accent)] opacity-50 animate-fadeUp delay-400" />
        </section>

        <section className="mt-8">
          <div
            className={`border border-dashed rounded-xl transition-colors duration-200 ${
              isDragOver
                ? "border-[var(--color-accent)] bg-[var(--color-accent-glow)]"
                : "border-[var(--color-border-hover)] bg-[var(--color-surface)]"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileSelect(file);
            }}
          >
            {!uploadedFile || !originalImageUrl ? (
              <div className="min-h-[220px] p-8 md:min-h-[420px] flex flex-col items-center justify-center gap-4">
                <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
                  <rect
                    x="4"
                    y="4"
                    width="32"
                    height="32"
                    rx="8"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeOpacity="0.5"
                    strokeWidth="1.5"
                  />
                  <line x1="20" y1="27" x2="20" y2="14" stroke="var(--color-accent)" strokeWidth="1.5" />
                  <polyline
                    points="14,19 20,13 26,19"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="1.5"
                  />
                  <line x1="12" y1="29" x2="28" y2="29" stroke="var(--color-accent)" strokeWidth="1.5" />
                </svg>
                <p className="font-display font-semibold text-lg text-[var(--color-text)]">
                  Drop room photo here
                </p>
                <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide">
                  PNG · JPG · WebP — up to 10 MB
                </p>
                <button
                  type="button"
                  className="border border-[var(--color-accent)] text-[var(--color-accent)] font-mono text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 rounded-sm cursor-pointer hover:bg-[var(--color-accent)] hover:text-[var(--color-bg)] transition-colors duration-200"
                  onClick={() => fileInputRef.current?.click()}
                >
                  SELECT FILE
                </button>
              </div>
            ) : (
              <>
                <img
                  src={originalImageUrl}
                  alt="Uploaded room"
                  className="w-full max-h-[300px] object-contain rounded-lg md:max-h-[500px]"
                />
                <div className="bg-[var(--color-surface-2)] border-t border-[var(--color-border)] px-4 py-3 flex items-center justify-between rounded-b-xl">
                  <span className="font-mono text-xs text-[var(--color-muted)]">
                    {uploadedFile.name}
                  </span>
                  <button
                    type="button"
                    className="font-mono text-xs text-[var(--color-error)] opacity-70 hover:opacity-100 cursor-pointer"
                    onClick={handleClearUploaded}
                  >
                    × CLEAR
                  </button>
                </div>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />

          {uploadError && (
            <p className="mt-2 font-mono text-xs text-[var(--color-error)]">{uploadError}</p>
          )}
        </section>

        {uploadedFile && (
          <>
            <section className="mt-4">
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 animate-fadeUp">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--color-accent)]">
                  CALIBRATION — OPTIONAL
                </span>
                <span className="font-mono text-[10px] text-[var(--color-muted-2)]">
                  Improves measurement accuracy
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-2 block">
                    REFERENCE ELEMENT
                  </label>
                  <select
                    value={calibrationTarget}
                    onChange={(e) => setCalibrationTarget(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 font-mono text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
                  >
                    <option value="door_height">Door height</option>
                    <option value="ceiling_height">Ceiling height</option>
                    <option value="room_length">Room length</option>
                    <option value="window_width">Window width</option>
                  </select>
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-2 block">
                    KNOWN MEASUREMENT
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. 2.1"
                      value={calibrationValue}
                      onChange={(e) => setCalibrationValue(e.target.value)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 pr-12 font-mono text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[var(--color-muted)]">
                      meters
                    </span>
                  </div>
                </div>
              </div>
              </div>
            </section>

            <section className="mt-5">
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={handleAnalyze}
                className={`w-full h-[52px] rounded-xl font-mono text-sm uppercase tracking-[0.1em] font-semibold flex items-center justify-center gap-3 transition-all duration-150 ${
                  isAnalyzing
                    ? "bg-[var(--color-accent-dim)] border border-[var(--color-accent)] text-[var(--color-accent)] cursor-not-allowed"
                    : "bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-90 cursor-pointer"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 rounded-full animate-spin border-[var(--color-accent-dim)] border-t-[var(--color-accent)]" />
                    ANALYZING...
                  </>
                ) : (
                  <>
                    <ScanLine size={16} />
                    ANALYZE ROOM
                  </>
                )}
              </button>
              {!isAnalyzing && (
                <p className="mt-3 font-mono text-[10px] text-[var(--color-muted-2)] tracking-wide">
                  Analysis uses Gemini 2.5 Flash · typically 10–20 seconds
                </p>
              )}
              {analysisError && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3 animate-fadeIn">
                  <AlertCircle size={14} className="text-[var(--color-error)]" />
                  <p className="font-mono text-xs text-[var(--color-error)]">
                    {analysisError}
                  </p>
                </div>
              )}
            </section>

            {isAnalyzing && !analysisResult && (
              <div className="mt-8 space-y-3 animate-fadeIn">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-32 w-full" />
                <div className="skeleton h-24 w-full" />
              </div>
            )}

            {analysisResult && (
              <div ref={resultsRef} className="mt-8 animate-fadeUp">
                <AnalysisResults result={analysisResult} />
              </div>
            )}

            {analysisResult && originalImageUrl && currentImageUrl && (
              <div className="mt-6 animate-fadeUp">
                <ImageViewer
                  originalUrl={originalImageUrl}
                  currentUrl={currentImageUrl}
                  hasEdits={hasEdits}
                  showBeforeAfter={showBeforeAfter}
                  onToggleBeforeAfter={() => setShowBeforeAfter((prev) => !prev)}
                  isEditing={isEditing}
                  annotatedImageUrl={annotatedImageUrl}
                  showAnnotated={showAnnotated}
                  isAnnotating={isAnnotating}
                  onToggleAnnotated={() => setShowAnnotated((prev) => !prev)}
                  annotationError={annotationError}
                  onAnnotate={handleAnnotate}
                />
                <div className="mt-4">
                  <EditPanel
                    activeTab={activeEditTab}
                    onTabChange={setActiveEditTab}
                    editPrompt={editPrompt}
                    onEditPromptChange={setEditPrompt}
                    materialSurface={materialSurface}
                    onMaterialSurfaceChange={setMaterialSurface}
                    onApply={handleEdit}
                    isEditing={isEditing}
                    hasEdits={hasEdits}
                    onUndo={handleUndo}
                    onRestart={handleRestart}
                    editError={editError}
                  />
                </div>
              </div>
            )}

            {analysisResult && (
              <div className="mt-5 animate-fadeUp pb-16">
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-muted)] px-3">
                    EXPORT
                  </span>
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    exportMeasurementsPdf(
                      analysisResult,
                      uploadedFile?.name?.replace(/\.[^/.]+$/, "") || "room",
                    )
                  }
                  className="w-full border border-[var(--color-border-hover)] text-[var(--color-muted)] font-mono text-[11px] uppercase tracking-widest py-3.5 rounded-xl flex items-center justify-center gap-2 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors duration-200"
                >
                  <Download size={13} />
                  DOWNLOAD MEASUREMENT REPORT · PDF
                </button>

                <p className="mt-3 font-mono text-[10px] text-[var(--color-muted-2)] text-center tracking-wide">
                  Includes room dimensions, floor area, and all detected objects
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
