import Link from "next/link";
import AdminConsole from "./AdminConsole";

export default function AdminPage() {
  return (
    <main className="subpage admin-page">
      <nav className="subnav">
        <Link href="/">← Startseite</Link>
        <span className="eyebrow">Nur Spielleitung</span>
      </nav>
      <AdminConsole />
    </main>
  );
}
