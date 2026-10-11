/**
 * The standard content page: a left-aligned title block over a rule, then the
 * content. The same shape as Solon's, so moving between the two keeps the edge.
 */
export function PageLayout({
  kicker,
  title,
  lede,
  children,
}: {
  kicker?: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="section-shell py-section-tight">
      <header className="border-b border-border-subtle pb-12">
        {kicker && <div className="kicker">{kicker}</div>}
        <h1 className={`headline-caps max-w-4xl text-4xl sm:text-5xl lg:text-6xl ${kicker ? "mt-5" : ""}`}>{title}</h1>
        {lede && <p className="mt-6 max-w-2xl text-lg text-fg-secondary">{lede}</p>}
      </header>
      <div className="mt-16">{children}</div>
    </main>
  );
}
