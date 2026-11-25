"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
} from "lucide-react";

export interface DocumentPreviewPayload {
  url: string;
  title?: string;
  fileType?: "image" | "pdf" | "auto";
}

const EVENT_NAME = "bharatedge:open-document-preview";

/**
 * Global dispatcher to trigger an in-app document or image preview modal anywhere in the app
 * without prop drilling or lifting modal state.
 */
export function openDocumentPreview(
  url: string,
  title?: string,
  fileType: "image" | "pdf" | "auto" = "auto"
) {
  if (typeof window === "undefined" || !url) return;
  window.dispatchEvent(
    new CustomEvent<DocumentPreviewPayload>(EVENT_NAME, {
      detail: { url, title, fileType },
    })
  );
}

/**
 * Hook providing the openPreview function
 */
export function useDocumentPreview() {
  const openPreview = useCallback(
    (url: string, title?: string, fileType: "image" | "pdf" | "auto" = "auto") => {
      openDocumentPreview(url, title, fileType);
    },
    []
  );

  return { openPreview };
}

function detectIsPdf(url: string, title?: string): boolean {
  const cleanUrl = url.toLowerCase().split("?")[0];
  const cleanTitle = (title || "").toLowerCase();
  return (
    cleanUrl.endsWith(".pdf") ||
    cleanTitle.endsWith(".pdf") ||
    cleanUrl.includes("application/pdf") ||
    cleanTitle.includes(".pdf")
  );
}

function detectIsImage(url: string, title?: string): boolean {
  const cleanUrl = url.toLowerCase().split("?")[0];
  const cleanTitle = (title || "").toLowerCase();
  return (
    cleanUrl.endsWith(".png") ||
    cleanUrl.endsWith(".jpg") ||
    cleanUrl.endsWith(".jpeg") ||
    cleanUrl.endsWith(".webp") ||
    cleanUrl.endsWith(".svg") ||
    cleanUrl.endsWith(".gif") ||
    cleanUrl.startsWith("data:image/") ||
    cleanTitle.endsWith(".png") ||
    cleanTitle.endsWith(".jpg") ||
    cleanTitle.endsWith(".jpeg") ||
    cleanTitle.endsWith(".webp") ||
    cleanTitle.endsWith(".svg")
  );
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  title?: string;
  fileType?: "image" | "pdf" | "auto";
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  fileUrl,
  title = "Document Preview",
  fileType = "auto",
}: DocumentPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<"image" | "pdf">("image");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine initial viewMode whenever fileUrl/fileType/title changes
  useEffect(() => {
    if (!fileUrl) return;
    setZoom(1);
    setRotation(0);
    setHasError(false);

    if (fileType === "pdf") {
      setViewMode("pdf");
    } else if (fileType === "image") {
      setViewMode("image");
    } else {
      // Auto detect
      if (detectIsPdf(fileUrl, title)) {
        setViewMode("pdf");
      } else if (detectIsImage(fileUrl, title)) {
        setViewMode("image");
      } else {
        // Fallback: If URL contains "screenshot" or "proof" or "photo" default to image, else pdf
        const lower = (fileUrl + " " + title).toLowerCase();
        if (
          lower.includes("screenshot") ||
          lower.includes("proof") ||
          lower.includes("photo") ||
          lower.includes("avatar") ||
          lower.includes("image")
        ) {
          setViewMode("image");
        } else {
          setViewMode("pdf");
        }
      }
    }
  }, [fileUrl, fileType, title, isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen || !fileUrl) return null;

  const displayTitle = title || "Document Preview";

  // Derive a friendly filename for downloading
  let downloadFilename = displayTitle;
  if (!downloadFilename.includes(".")) {
    downloadFilename += viewMode === "pdf" ? ".pdf" : ".png";
  }

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-5xl h-[88vh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200/80 bg-slate-50/90 backdrop-blur flex items-center justify-between gap-3 shrink-0">
            {/* Title & Type Icon */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ACCAD5]/30 to-[#F0944D]/30 border border-slate-200 flex items-center justify-center shrink-0 text-slate-700 shadow-2xs">
                {viewMode === "pdf" ? (
                  <FileText className="h-4 w-4 text-rose-600" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-sky-600" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {displayTitle}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                    {viewMode === "pdf" ? "PDF Document" : "Image / Proof"}
                  </span>
                  {/* Mode switcher pills if user wants to toggle */}
                  <button
                    type="button"
                    onClick={() => setViewMode(viewMode === "pdf" ? "image" : "pdf")}
                    className="text-[10px] text-slate-400 hover:text-[#C66318] underline transition-colors cursor-pointer"
                  >
                    Switch to {viewMode === "pdf" ? "Image View" : "PDF Viewer"}
                  </button>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Image zoom & rotate controls */}
              {viewMode === "image" && !hasError && (
                <div className="hidden sm:flex items-center gap-1 mr-2 px-2 py-1 rounded-xl bg-slate-200/50 border border-slate-200/60 text-slate-600 text-xs">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                    title="Zoom Out"
                    className="p-1 hover:text-slate-900 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-1 text-[11px] font-mono select-none">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                    title="Zoom In"
                    className="p-1 hover:text-slate-900 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRotate}
                    title="Rotate 90°"
                    className="p-1 hover:text-slate-900 transition-colors cursor-pointer ml-1"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    title="Reset Zoom"
                    className="p-1 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Download Button */}
              <a
                href={fileUrl}
                download={downloadFilename}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                title={`Download ${displayTitle}`}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>

              {/* External open fallback */}
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Open raw file in browser tab"
              >
                <ExternalLink className="h-4 w-4" />
              </a>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 w-full bg-slate-950/5 relative overflow-auto flex items-center justify-center p-3 sm:p-6 select-none">
            {hasError ? (
              <div className="text-center p-8 max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <FileText className="h-10 w-10 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">Preview Unavailable</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The file format could not be rendered directly in the embedded previewer.
                  You can download the file or open it in your browser.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <a
                    href={fileUrl}
                    download={downloadFilename}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F0944D] hover:bg-[#D97D38] text-white text-xs font-semibold shadow-xs transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download File
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setHasError(false);
                      setViewMode(viewMode === "pdf" ? "image" : "pdf");
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Try Alternate Viewer
                  </button>
                </div>
              </div>
            ) : viewMode === "pdf" ? (
              <div className="w-full h-full rounded-xl sm:rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-inner relative flex flex-col">
                <iframe
                  src={`${fileUrl}#toolbar=1&navpanes=0`}
                  title={displayTitle}
                  className="w-full h-full border-0 rounded-xl"
                  onError={() => setHasError(true)}
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                <img
                  src={fileUrl}
                  alt={displayTitle}
                  onError={() => setHasError(true)}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: "transform 0.15s ease-out",
                  }}
                  className="max-h-[72vh] max-w-full w-auto object-contain rounded-xl shadow-md border border-slate-200/50 bg-white"
                />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

/**
 * Global component that mounts once in RootLayout and responds to
 * bharatedge:open-document-preview events.
 */
export function GlobalDocumentPreviewModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [previewData, setPreviewData] = useState<DocumentPreviewPayload>({
    url: "",
    title: "",
    fileType: "auto",
  });

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<DocumentPreviewPayload>;
      if (customEvent.detail && customEvent.detail.url) {
        setPreviewData(customEvent.detail);
        setIsOpen(true);
      }
    };

    window.addEventListener(EVENT_NAME, handleOpen as EventListener);
    return () => window.removeEventListener(EVENT_NAME, handleOpen as EventListener);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <DocumentPreviewModal
      isOpen={isOpen}
      onClose={handleClose}
      fileUrl={previewData.url}
      title={previewData.title}
      fileType={previewData.fileType}
    />
  );
}
