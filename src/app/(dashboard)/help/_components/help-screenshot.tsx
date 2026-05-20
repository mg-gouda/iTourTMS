import { ImageIcon } from "lucide-react";
import Image from "next/image";

interface HelpScreenshotProps {
  src: string;
  alt: string;
  caption?: string;
}

export function HelpScreenshot({ src, alt, caption }: HelpScreenshotProps) {
  return (
    <figure className="my-4 overflow-hidden rounded-xl border bg-muted/30">
      <div className="relative min-h-[180px] w-full">
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover object-top"
            sizes="(max-width: 768px) 100vw, 800px"
          />
        ) : (
          <div className="flex h-[180px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="h-8 w-8 opacity-40" />
            <span className="text-xs">{alt}</span>
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
