import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Eraser,
  Layers,
  Mic,
  Plus,
  RotateCcw,
  Undo2,
  Wand2,
} from "lucide-react";

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

declare var SpeechRecognition: SpeechRecognitionConstructor;

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

function useVoiceInput(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [onTranscript]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return { isListening, isSupported, startListening, stopListening };
}

type EditPanelProps = {
  activeTab: "remove" | "add" | "material";
  onTabChange: (tab: "remove" | "add" | "material") => void;
  editPrompt: string;
  onEditPromptChange: (val: string) => void;
  materialSurface: "floor" | "walls" | "ceiling";
  onMaterialSurfaceChange: (val: "floor" | "walls" | "ceiling") => void;
  onApply: () => void;
  isEditing: boolean;
  hasEdits: boolean;
  onUndo: () => void;
  onRestart: () => void;
  editError: string | null;
};

export default function EditPanel({
  activeTab,
  onTabChange,
  editPrompt,
  onEditPromptChange,
  materialSurface,
  onMaterialSurfaceChange,
  onApply,
  isEditing,
  hasEdits,
  onUndo,
  onRestart,
  editError,
}: EditPanelProps) {
  const disabled = isEditing || editPrompt.trim() === "";
  const { isListening, isSupported, startListening, stopListening } =
    useVoiceInput((transcript) => {
      onEditPromptChange(transcript);
    });

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const tabClass = (tab: "remove" | "add" | "material") =>
    `-mb-px flex flex-1 items-center justify-center gap-2 py-3 font-mono text-[10px] uppercase tracking-widest transition-colors ${
      activeTab === tab
        ? "border-b-2 border-[var(--color-accent)] bg-[var(--color-accent-glow)] text-[var(--color-accent)]"
        : "bg-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]"
    }`;

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
      <div className="border-b border-[var(--color-border)] flex">
        <button type="button" className={tabClass("remove")} onClick={() => onTabChange("remove")}>
          <Eraser size={12} />
          <span className="hidden sm:inline">REMOVE</span>
        </button>
        <button type="button" className={tabClass("add")} onClick={() => onTabChange("add")}>
          <Plus size={12} />
          <span className="hidden sm:inline">ADD</span>
        </button>
        <button type="button" className={tabClass("material")} onClick={() => onTabChange("material")}>
          <Layers size={12} />
          <span className="hidden sm:inline">MATERIAL</span>
        </button>
      </div>

      <div className="p-5">
        <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-2 block">
          {activeTab === "remove"
            ? "DESCRIBE OBJECT TO REMOVE"
            : activeTab === "add"
              ? "DESCRIBE OBJECT TO ADD"
              : "DESCRIBE NEW FINISH"}
        </label>

        {activeTab === "material" && (
          <div className="flex gap-2 mb-4">
            {(["floor", "walls", "ceiling"] as const).map((surface) => (
              <button
                key={surface}
                type="button"
                onClick={() => onMaterialSurfaceChange(surface)}
                className={`font-mono text-[10px] uppercase tracking-widest px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  materialSurface === surface
                    ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-glow)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)]"
                }`}
              >
                {surface}
              </button>
            ))}
          </div>
        )}

        <div className="relative">
          <input
            value={editPrompt}
            onChange={(e) => onEditPromptChange(e.target.value)}
            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-4 py-3 pr-12 font-mono text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none placeholder:text-[var(--color-muted-2)]"
            placeholder={
              activeTab === "remove"
                ? "e.g. remove the sofa, remove the ceiling fan..."
                : activeTab === "add"
                  ? "e.g. add a bookshelf on the left wall..."
                  : "e.g. herringbone oak parquet, polished concrete..."
            }
          />

          <button
            type="button"
            onClick={handleMicClick}
            disabled={!isSupported}
            className={`
              absolute right-3 top-1/2 -translate-y-1/2
              w-7 h-7 rounded-md flex items-center justify-center
              transition-all duration-200
              ${
                isListening
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  : isSupported
                    ? "text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-glow)]"
                    : "text-[var(--color-muted-2)] cursor-not-allowed opacity-40"
              }
            `}
            title={
              !isSupported
                ? "Voice input not supported in this browser"
                : isListening
                  ? "Click to stop listening"
                  : "Click to speak"
            }
          >
            {isListening ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
            ) : (
              <Mic size={14} />
            )}
          </button>
        </div>

        {isListening && (
          <p className="mt-1.5 font-mono text-[10px] text-red-400 animate-pulse-soft tracking-wide">
            Listening... speak now
          </p>
        )}

        {!isSupported && (
          <p className="mt-1.5 font-mono text-[10px] text-[var(--color-muted-2)] tracking-wide">
            Voice not available — use Chrome or Safari
          </p>
        )}

        <button
          type="button"
          disabled={disabled}
          onClick={onApply}
          className={`mt-5 w-full h-[48px] rounded-xl font-mono text-sm uppercase tracking-[0.1em] font-semibold flex items-center justify-center gap-2 ${
            isEditing
              ? "bg-[var(--color-accent-dim)] border border-[var(--color-accent)] text-[var(--color-accent)] cursor-not-allowed"
              : disabled
                ? "bg-[var(--color-accent-dim)] border border-[var(--color-accent)] text-[var(--color-accent)] cursor-not-allowed"
                : "bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-90 cursor-pointer"
          }`}
        >
          {isEditing ? (
            <>
              <div className="w-4 h-4 border-2 rounded-full animate-spin border-[var(--color-accent-dim)] border-t-[var(--color-accent)]" />
              PROCESSING...
            </>
          ) : (
            <>
              <Wand2 size={14} />
              APPLY EDIT
            </>
          )}
        </button>

        {editError && (
          <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 flex items-center gap-2">
            <AlertCircle size={14} className="text-[var(--color-error)]" />
            <p className="font-mono text-xs text-[var(--color-error)]">{editError}</p>
          </div>
        )}

        {hasEdits && (
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={isEditing}
              onClick={onUndo}
              className="flex-1 py-2.5 rounded-lg border font-mono text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors duration-200 cursor-pointer border-[var(--color-border-hover)] text-[var(--color-muted)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]"
            >
              <Undo2 size={12} />
              UNDO LAST
            </button>
            <button
              type="button"
              disabled={isEditing}
              onClick={onRestart}
              className="flex-1 py-2.5 rounded-lg border font-mono text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors duration-200 cursor-pointer border-[var(--color-border-hover)] text-[var(--color-muted)] hover:border-red-500/30 hover:text-red-400"
            >
              <RotateCcw size={12} />
              RESTART
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
