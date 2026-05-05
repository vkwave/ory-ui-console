"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface JsonViewerProps {
  data: unknown;
  maxHeight?: string;
}

export function JsonViewer({ data, maxHeight = "400px" }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        className="glass-control absolute right-2 top-2 text-xs"
        onClick={copy}
      >
        {copied ? "Copied!" : "Copy"}
      </Button>
      <pre
        className="overflow-auto rounded-xl border border-border/50 bg-muted/35 p-4 text-xs"
        style={{ maxHeight }}
      >
        {text}
      </pre>
    </div>
  );
}
