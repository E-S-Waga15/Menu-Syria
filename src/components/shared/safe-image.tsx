import Image, { type ImageProps } from "next/image";

import { cn } from "@/lib/utils";

function validImageSrc(src: ImageProps["src"]): boolean {
  if (typeof src === "string") return src.trim().length > 0;
  if (typeof src !== "object" || src === null || !("src" in src)) {
    return false;
  }
  return typeof src.src === "string" && src.src.trim().length > 0;
}

export function SafeImage({
  src,
  alt,
  className,
  fallbackClassName,
  quality = 90,
  ...props
}: ImageProps & { fallbackClassName?: string }) {
  if (!validImageSrc(src)) {
    return (
      <span
        aria-hidden
        className={cn(
          "block bg-surface-container",
          fallbackClassName,
          className,
        )}
      />
    );
  }

  return (
    <Image src={src} alt={alt} className={className} quality={quality} {...props} />
  );
}
