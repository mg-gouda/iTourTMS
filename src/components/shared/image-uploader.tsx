"use client";

import { Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED = ".png,.jpg,.jpeg,.webp,.gif,.svg";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

interface ImageUploaderProps {
  /** Current image URL (if any) */
  value: string | null;
  /** Called when a new image is uploaded or removed */
  onChange: (url: string | null) => void;
  /** Upload folder — determines the subdirectory under /uploads/ */
  folder?: "b2c" | "hotels" | "blog" | "general";
  /** Label shown above the upload area */
  label?: string;
  /** Help text shown below */
  hint?: string;
  /** CSS class for the aspect ratio of the preview area */
  aspectClass?: string;
}

/**
 * Generic image uploader component.
 * Uploads to /api/upload/image and returns the public URL.
 */
export function ImageUploader({
  value,
  onChange,
  folder = "general",
  label,
  hint,
  aspectClass = "aspect-video",
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const displayUrl = preview || value;

  async function handleFile(file: File) {
    if (file.size > MAX_SIZE) {
      toast.error("File too large (max 5 MB)");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    try {
      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      onChange(json.url);
      toast.success("Image uploaded");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    setPreview(null);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}

      <div
        className={cn(
          "relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted/50 transition-colors hover:border-primary/50",
          dragOver && "border-primary bg-primary/5",
          aspectClass,
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        {uploading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {displayUrl ? (
          <img
            src={displayUrl}
            alt={label || "Upload"}
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Upload className="h-6 w-6" />
            <span className="text-xs">Click or drag to upload</span>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {displayUrl && (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          disabled={uploading}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Remove
        </Button>
      )}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
