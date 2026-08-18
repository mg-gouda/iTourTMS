import { ImageIcon } from "lucide-react";
import Image from "next/image";

interface HelpScreenshotProps {
  src: string;
  alt: string;
  caption?: string;
}

/**
 * A figure in the manual.
 *
 * `object-contain` inside a fixed-ratio box, never `object-cover`: a cover fit
 * crops whatever does not fit the container, which on a 1440x900 screenshot in
 * a short box meant the reader saw the top strip and nothing else. Contain
 * letterboxes instead, so a screenshot of an unexpected shape loses nothing —
 * it just sits in a little empty space.
 */
export function HelpScreenshot({ src, alt, caption }: HelpScreenshotProps) {
  return (
    <figure className="bg-muted/30 my-4 overflow-hidden rounded-xl border">
      {src ? (
        // Opens the original, because UI text shrunk to article width is not
        // always readable and a manual you have to squint at is not a manual.
        <a href={src} target="_blank" rel="noreferrer" className="block">
          <div className="relative aspect-[16/10] w-full">
            <Image
              src={src}
              alt={alt}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 900px"
            />
          </div>
        </a>
      ) : (
        <div className="text-muted-foreground flex h-[180px] flex-col items-center justify-center gap-2">
          <ImageIcon className="h-8 w-8 opacity-40" />
          <span className="text-xs">{alt}</span>
        </div>
      )}
      {caption && (
        <figcaption className="text-muted-foreground border-t px-4 py-2 text-center text-xs">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
