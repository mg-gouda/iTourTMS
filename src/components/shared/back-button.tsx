"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1 text-muted-foreground transition-colors duration-200 hover:text-foreground"
      onClick={() => router.back()}
    >
      <ArrowLeft className="size-3.5" />
      Back
    </Button>
  );
}
