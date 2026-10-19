"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Camera, CloudUpload, FolderOpen, UserRound, X } from "lucide-react";

import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function FileDropzone({
  label,
  hint,
  onFile,
  className,
  variant = "card",
  previewUrl,
}: {
  label: string;
  hint?: string;
  onFile?: (file: File | null) => void;
  className?: string;
  /** "card" = dashed rectangle (logos, ID docs); "avatar" = circular profile photo */
  variant?: "card" | "avatar";
  /** An image already stored on the server — standing in for the placeholder
   * until the caller's own file replaces it. It is not removable from here:
   * the X only undoes a file this component just picked. */
  previewUrl?: string | null;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(previewUrl ?? null);
  const [fileName, setFileName] = useState<string | null>(null);

  const accept = (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    onFile?.(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setFileName(null);
    onFile?.(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // The browser only ever hands a paste event to whichever element (or its
  // ancestor) currently has focus — not to whatever the mouse happens to be
  // over — so the card itself and the explicit paste field below are both
  // made focusable, and this one handler (bound once, on the card) catches
  // a paste from either since the event bubbles up to it.
  const handlePaste = (e: React.ClipboardEvent) => {
    const image = Array.from(e.clipboardData.items).find((item) =>
      item.type.startsWith("image/"),
    );
    const file = image?.getAsFile();
    if (file) {
      e.preventDefault();
      accept(file);
    }
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="sr-only"
      onChange={(e) => accept(e.target.files?.[0])}
      tabIndex={-1}
    />
  );

  if (variant === "avatar") {
    return (
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={label}
        className={cn(
          "group relative mx-auto flex size-28 items-center justify-center rounded-full transition-[translate,scale] duration-200 ease-smooth hover:-translate-y-0.5",
          className,
        )}
      >
        {input}
        <span
          className={cn(
            "flex size-full items-center justify-center overflow-hidden rounded-full border-2",
            preview
              ? "border-primary/30"
              : "border-dashed border-border group-hover:border-primary/50",
          )}
        >
          {preview ? (
            <Image
              src={preview}
              alt=""
              width={112}
              height={112}
              className="size-full object-cover"
              unoptimized
            />
          ) : (
            <span className="flex size-full items-center justify-center bg-surface-container-low text-muted-foreground">
              <UserRound className="size-10" />
            </span>
          )}
        </span>

        {preview ? (
          fileName ? (
            <span
              role="button"
              aria-label={t.common.delete}
              onClick={clear}
              className="absolute top-0 end-0 flex size-7 items-center justify-center rounded-full bg-card text-muted-foreground ring-2 ring-background hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="size-3.5" />
            </span>
          ) : null
        ) : (
          <span className="absolute bottom-0 end-0 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
            <Camera className="size-4" />
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        accept(e.dataTransfer.files[0]);
      }}
      onPaste={handlePaste}
      tabIndex={0}
      className={cn(
        "relative flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center transition-[border-color,background-color] duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        dragging
          ? "border-primary bg-berry-soft/30 scale-[1.01]"
          : "border-border hover:border-primary/50 hover:bg-surface-container-low",
        className,
      )}
    >
      {input}

      {preview ? (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full cursor-pointer flex-col items-center gap-2"
          >
            <Image
              src={preview}
              alt=""
              width={72}
              height={72}
              className="size-18 rounded-xl object-cover shadow-soft"
              unoptimized
            />
            <p className="max-w-full truncate text-xs font-semibold">
              {fileName ?? label}
            </p>
          </button>
          {fileName && (
            <span
              role="button"
              aria-label={t.common.delete}
              onClick={clear}
              className="absolute top-2 end-2 flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="size-3.5" />
            </span>
          )}
        </>
      ) : (
        <>
          <span className="flex size-11 items-center justify-center rounded-full bg-berry-soft text-berry-soft-foreground">
            <CloudUpload className="size-5" />
          </span>
          <p className="text-sm font-semibold">{label}</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-foreground transition-colors duration-200 hover:bg-surface-container"
          >
            <FolderOpen className="size-3.5" />
            {t.common.browseDevice}
          </button>
          <div
            tabIndex={0}
            className="w-full max-w-56 rounded-lg border border-dashed border-border/70 bg-surface-container-low/60 px-3 py-2 text-xs text-muted-foreground transition-colors duration-200 focus-visible:border-primary/50 focus-visible:outline-none"
          >
            {t.common.orPasteImage}
          </div>
          <p className="text-xs text-muted-foreground">
            {hint ?? t.auth.dropzoneHint}
          </p>
        </>
      )}
    </div>
  );
}
