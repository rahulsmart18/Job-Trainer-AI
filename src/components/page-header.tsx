import Link from "next/link";

type Props = {
  /** Breadcrumb label for the current page (omit on the dashboard itself). */
  crumb?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

export function PageHeader({ crumb, title, subtitle, children }: Props) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted">
          <Link href="/dashboard" className="transition hover:text-foreground">
            Dashboard
          </Link>
          {crumb && (
            <>
              <span aria-hidden="true">/</span>
              <span className="font-medium text-foreground">{crumb}</span>
            </>
          )}
        </nav>
        <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2.5">{children}</div>}
    </div>
  );
}
