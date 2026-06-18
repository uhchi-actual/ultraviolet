import Link from "next/link";

export function StaticUnavailable({
  feature,
  hint,
}: {
  feature: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-uv-border bg-uv-bg-surface/70 p-6">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-uv-purple-bright">
        Static demo
      </p>
      <h3 className="mt-2 font-display text-lg font-semibold text-uv-text-primary">
        {feature} needs the full local stack
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-uv-text-secondary">
        This GitHub Pages build runs entirely in your browser. {hint ??
          "Tree and catalog search work offline — no server required."}
      </p>
      <Link
        href="/tree"
        className="mt-4 inline-flex rounded-lg border border-uv-border-strong px-4 py-2 text-sm font-medium text-uv-text-primary transition-colors hover:border-uv-purple-bright"
      >
        Open Tree →
      </Link>
    </div>
  );
}
