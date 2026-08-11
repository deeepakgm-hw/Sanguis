"use client";

import React, { useRef, useState } from "react";
import { api } from "@/lib/api";
import { UploadCloud, File, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onUploadSuccess?: (fileData: any) => void;
  onUploadError?: (error: string) => void;
  allowedTypes?: string[];
  maxSizeMB?: number;
  endpoint?: string;
  label?: string;
}

export function FileUpload({
  onUploadSuccess,
  onUploadError,
  allowedTypes = ["image/png", "image/jpeg", "image/gif", "application/pdf"],
  maxSizeMB = 5,
  endpoint = "/files/upload",
  label = "Drag & drop your files here or click to browse",
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (selectedFile: File): boolean => {
    if (!allowedTypes.includes(selectedFile.type)) {
      setErrorMessage("File type not supported.");
      setStatus("error");
      onUploadError?.("File type not supported.");
      return false;
    }
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      setErrorMessage(`File exceeds the limit of ${maxSizeMB}MB.`);
      setStatus("error");
      onUploadError?.(`File exceeds the limit of ${maxSizeMB}MB.`);
      return false;
    }
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        uploadFile(droppedFile);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        uploadFile(selectedFile);
      }
    }
  };

  const uploadFile = async (selectedFile: File) => {
    setStatus("uploading");
    setProgress(0);
    setErrorMessage("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await api.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percent = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setProgress(percent);
        },
      });

      setStatus("success");
      onUploadSuccess?.(response.data);
    } catch (err: any) {
      setStatus("error");
      const msg = err.response?.data?.message || "Upload failed. Please check the network connection.";
      setErrorMessage(msg);
      onUploadError?.(msg);
    }
  };

  const cancelUpload = () => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setErrorMessage("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        id="file-upload-input"
        className="hidden"
        accept={allowedTypes.join(",")}
        onChange={handleFileInput}
        disabled={status === "uploading"}
      />

      {status === "idle" && (
        <label
          htmlFor="file-upload-input"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center w-full min-h-[180px] p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            dragActive
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border/80 bg-muted/30 hover:bg-muted/50"
          } glass`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <div className="p-3 mb-3 rounded-full bg-primary/10 text-primary">
              <UploadCloud className="w-7 h-7" />
            </div>
            <p className="mb-2 text-sm text-foreground font-semibold text-center">
              {label}
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Supports: {allowedTypes.map((t) => t.split("/")[1].toUpperCase()).join(", ")} (Max: {maxSizeMB}MB)
            </p>
          </div>
        </label>
      )}

      {status !== "idle" && (
        <div className="flex items-center gap-4 w-full p-4 rounded-xl border border-border/80 bg-muted/40 glass">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <File className="w-6 h-6" />
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
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errorMessage}
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full shrink-0"
            onClick={cancelUpload}
            disabled={status === "uploading"}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
