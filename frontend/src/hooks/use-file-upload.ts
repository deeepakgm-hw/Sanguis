import { useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface UploadResult {
  /** The full response data from the server on success. */
  data: any;
}

interface UseFileUploadOptions {
  /** The API endpoint to POST the file to. Defaults to "/files/upload". */
  endpoint?: string;
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
}

interface UseFileUploadReturn {
  /** Current upload status. */
  status: UploadStatus;
  /** Upload progress percentage (0–100). */
  progress: number;
  /** The selected/dropped file, if any. */
  file: File | null;
  /** Error message from either client-side validation or server rejection. */
  error: string | null;
  /** Server response data on success. */
  result: any | null;
  /** Trigger upload for a given file. Performs client-side pre-checks first. */
  upload: (file: File) => Promise<void>;
  /** Reset all state back to idle. */
  reset: () => void;
}

/**
 * Reusable hook encapsulating file upload logic with progress tracking.
 *
 * Uses the existing authenticated axios instance from `@/lib/api` —
 * the JWT is automatically attached via the request interceptor defined there.
 * No new HTTP client or auth-attachment pattern is introduced.
 */
export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    endpoint = "/files/upload",
    allowedTypes,
    maxSizeMB,
  } = options;

  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("idle");
    setProgress(0);
    setFile(null);
    setError(null);
    setResult(null);
  }, []);

  const upload = useCallback(
    async (selectedFile: File) => {
      // -------------------------------------------------------------------
      // CLIENT-SIDE PRE-FILTERING (UX only — NOT a security boundary).
      // The actual security gate is the server-side magic-number validation
      // in backend/src/middlewares/security/fileUpload.ts which inspects
      // file bytes, not the client-provided MIME type or extension.
      // -------------------------------------------------------------------
      if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setStatus("error");
        setError(`File type "${selectedFile.type || "unknown"}" is not supported.`);
        return;
      }
      if (maxSizeMB && selectedFile.size > maxSizeMB * 1024 * 1024) {
        setFile(selectedFile);
        setStatus("error");
        setError(`File exceeds the ${maxSizeMB}MB limit.`);
        return;
      }

      setFile(selectedFile);
      setStatus("uploading");
      setProgress(0);
      setError(null);
      setResult(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await api.post(endpoint, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          signal: controller.signal,
          onUploadProgress: (progressEvent) => {
            const percent = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setProgress(percent);
          },
        });

        setStatus("success");
        setProgress(100);
        setResult(response.data);
      } catch (err: any) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
          // Upload was intentionally cancelled via reset() — don't surface as error
          return;
        }
        setStatus("error");
        // Surface the server's specific rejection message (e.g. magic-number mismatch)
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Upload failed. Please check your network connection and try again.";
        setError(msg);
      } finally {
        abortControllerRef.current = null;
      }
    },
    [endpoint, allowedTypes, maxSizeMB]
  );

  return { status, progress, file, error, result, upload, reset };
}
