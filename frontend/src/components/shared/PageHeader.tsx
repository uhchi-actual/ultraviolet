interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="mb-8">
      {eyebrow ? (
        <p className="uv-gradient-text mb-2 font-mono text-xs uppercase tracking-[0.2em]">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-display text-3xl font-bold tracking-tight text-uv-text-primary sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-3 max-w-2xl text-uv-text-secondary">{description}</p>
      ) : null}
    </header>
  );
}
