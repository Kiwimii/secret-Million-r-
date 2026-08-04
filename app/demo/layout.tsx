export default function DemoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div data-meta-game-version="persistent-dashboard-v2">{children}</div>;
}
