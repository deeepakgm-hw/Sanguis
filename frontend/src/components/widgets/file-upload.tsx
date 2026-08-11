"use client";

import React, { useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFileUpload } from "@/hooks/use-file-upload";
import {
  UploadCloud,
  File as FileIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  RotateCcw,
} from "lucide-react";

interface FileUploadWidgetProps {
  /** Label shown on the drop zone. */
  label?: string;
  /**
   * Client-side MIME type allowlist. This is a UX pre-filter ONLY —
   * the actual security boundary is the server-side magic-number check
   * in backend/src/middlewares/security/fileUpload.ts.
   */
  allowedTypes?: string[];
  /**
   * Client-side max file size in MB. This is a UX pre-filter ONLY —
   * the server enforces its own multer limit independently.
   */
  maxSizeMB?: number;
  /** The API endpoint to POST the file to. Defaults to "/files/upload". */
  endpoint?: string;
  /** Callback fired with the full server response data on successful upload. */
  onUploadSuccess?: (data: any) => void;
  /** Callback fired with the error message on upload failure. */
  onUploadError?: (error: string) => void;
  /** Additional className to merge onto the outer container. */
  className?: string;
}

/**
 * Reusable drag-and-drop file upload widget with progress feedback.
 *
 * Wired to the existing POST /api/v1/files/upload endpoint via the
 * useFileUpload hook. No backend changes required — this widget
 * consumes the existing upload controller and magic-number middleware responses.
 *
 * Follows the same prop-simplicity pattern as StatCard/MapView/ActivityFeed.
 */
export function FileUploadWidget({
  label = "Drag & drop your files here or click to browse",
  allowedTypes = ["image/png", "image/jpeg", "image/gif", "application/pdf"],
  maxSizeMB = 5,
  endpoint = "/files/upload",
  onUploadSuccess,
  onUploadError,
  className,
}: FileUploadWidgetProps) {
  const { status, progress, file, error, result, upload, reset } = useFileUpload({
    endpoint,
    allowedTypes,
    maxSizeMB,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFile = useCallback(
    async (selectedFile: File) => {
      try {
        await upload(selectedFile);
        onUploadSuccess?.(result);
      } catch {
        // Error is captured in the hook state
      }
    },
    [upload, onUploadSuccess, result]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
      }
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        processFile(e.target.files[0]);
      }
    },
    [processFile]
  );

  const handleCancel = useCallback(() => {
    reset();
    if (inputRef.current) inputRef.current.value = "";
  }, [reset]);

  const handleRetry = useCallback(() => {
    if (file) {
      processFile(file);
    }
  }, [file, processFile]);

  // Notify parent of errors via callback
  React.useEffect(() => {
    if (status === "error" && error) {
      onUploadError?.(error);
    }
  }, [status, error, onUploadError]);

  // Notify parent of success via callback
  React.useEffect(() => {
    if (status === "success" && result) {
      onUploadSuccess?.(result);
    }
  }, [status, result, onUploadSuccess]);

  return (
    <Card className={className}>
      <div className="p-4 w-full">
        <input
          ref={inputRef}
          type="file"
          id="file-upload-widget-input"
          className="hidden"
          accept={allowedTypes.join(",")}
          onChange={handleFileInput}
          disabled={status === "uploading"}
        />

        {/* Drop zone — shown when idle */}
        {status === "idle" && (
          <label
            htmlFor="file-upload-widget-input"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center w-full min-h-[180px] p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
              dragActive
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border/80 bg-muted/30 hover:bg-muted/50"
            }`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <div className="p-3 mb-3 rounded-full bg-primary/10 text-primary">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="mb-2 text-sm text-foreground font-semibold text-center">
                {label}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Supports: {allowedTypes.map((t) => t.split("/")[1]?.toUpperCase() ?? t).join(", ")}{" "}
                (Max: {maxSizeMB}MB)
              </p>
            </div>
          </label>
        )}

        {/* Upload state — shown when uploading, success, or error */}
        {status !== "idle" && (
          <div className="flex items-center gap-4 w-full p-4 rounded-xl border border-border/80 bg-muted/40">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <FileIcon className="w-6 h-6" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-foreground mb-1">
                {file?.name}
              </p>

              {status === "uploading" && (
                <div className="w-full">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                      Uploading...
                    </span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <div className="w-full bg-muted border border-border/50 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {status === "success" && (
                <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Upload complete!
                </p>
              )}

              {status === "error" && (
                <p className="text-xs text-destructive font-medium flex items-center gap-1 truncate">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {status === "error" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full h-8 w-8 p-0"
                  onClick={handleRetry}
                  aria-label="Retry upload"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full h-8 w-8 p-0"
                onClick={handleCancel}
                disabled={status === "uploading"}
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
