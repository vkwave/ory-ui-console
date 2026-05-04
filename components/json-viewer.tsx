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
        className="absolute top-2 right-2 text-xs"
        onClick={copy}
      >
        {copied ? "Copied!" : "Copy"}
      </Button>
      <pre
        className="bg-muted rounded p-4 text-xs overflow-auto"
        style={{ maxHeight }}
      >
        {text}
      </pre>
    </div>
  );
}
