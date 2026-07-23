"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/demo?view=host");
  }, [router]);

  return (
    <main className="subpage">
      <header className="page-title">
        <p className="section-label">Spielleitung</p>
        <h1>Kontrollzentrum wird geöffnet.</h1>
        <p>
          Sollte die Weiterleitung nicht automatisch starten, öffne die
          Spielleiteransicht direkt.
        </p>
        <Link className="button button-primary" href="/demo?view=host">
          Spielleitung öffnen
        </Link>
      </header>
    </main>
  );
}
