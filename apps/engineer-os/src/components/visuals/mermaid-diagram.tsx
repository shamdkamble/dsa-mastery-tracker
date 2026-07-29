"use client";

import { useEffect, useId, useState } from "react";

export function MermaidDiagram({ code, title }: { code: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          fontFamily: "inherit",
          themeVariables: {
            primaryColor: "#312e81",
            primaryTextColor: "#e4e4e7",
            primaryBorderColor: "#6366f1",
            lineColor: "#71717a",
            secondaryColor: "#164e63",
            tertiaryColor: "#1e1b4b",
            background: "#09090b",
            mainBkg: "#1e1b4b",
            nodeBorder: "#6366f1",
            clusterBkg: "#18181b",
            titleColor: "#f4f4f5",
            edgeLabelBackground: "#18181b",
          },
        });
        const { svg: out } = await mermaid.render(`mmd-${id}-${Date.now()}`, code);
        if (!cancelled) {
          setSvg(out);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Diagram render failed");
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      {title && <div className="mb-3 text-sm font-medium text-zinc-200">{title}</div>}
      {error && (
        <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-amber-200/90">{code}</pre>
      )}
      {svg ? (
        <div
          className="mermaid-wrap flex justify-center overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        !error && <div className="py-8 text-center text-sm text-zinc-500">Rendering diagram…</div>
      )}
    </div>
  );
}
