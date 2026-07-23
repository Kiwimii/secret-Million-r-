import Link from "next/link";

const players = [
  { name: "Schubi", status: "Aktiv", detail: "Gewinnerpool · Ermittler", badge: "badge-active" },
  { name: "Lars", status: "Aktiv", detail: "Gewinnerpool · Rolle geheim", badge: "badge-active" },
  { name: "Danny", status: "Abgereist", detail: "Keine Stimme · keine Challenge", badge: "badge-departed" },
  { name: "Masl", status: "Ausgeschieden", detail: "Stimmt weiter ab", badge: "badge-eliminated" },
  { name: "Rene", status: "Aktiv", detail: "Gewinnerpool · Ermittler", badge: "badge-active" },
];

export default function AdminPage() {
  return (
    <main className="subpage">
      <nav className="subnav">
        <Link href="/">← Startseite</Link>
        <span className="eyebrow">Nur Spielleitung</span>
      </nav>

      <header className="page-title">
        <p className="section-label">Kontrollzentrum</p>
        <h1>Runde 1 vorbereiten.</h1>
        <p>Kein kritischer Schritt wird automatisch veröffentlicht. Rollenwechsel, Ausscheiden und Ergebnisse brauchen deine Bestätigung.</p>
      </header>

      <section className="metric-row">
        <div className="metric"><span className="hint">Verbunden</span><strong>11 / 12</strong></div>
        <div className="metric"><span className="hint">Gewinnerpool</span><strong>10</strong></div>
        <div className="metric"><span className="hint">Abgereist</span><strong>1</strong></div>
        <div className="metric"><span className="hint">Aktuelle Phase</span><strong>Lobby</strong></div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <p className="section-label">Spielerstatus</p>
          <h2>Teilnehmer verwalten</h2>
          <div className="player-list">
            {players.map((player) => (
              <div className="player-row" key={player.name}>
                <span className="mini-avatar">{player.name.slice(0, 1)}</span>
                <div><p>{player.name}</p><small>{player.detail}</small></div>
                <span className={`badge ${player.badge}`}>{player.status}</span>
                <button className="button button-secondary" type="button">Verwalten</button>
              </div>
            ))}
          </div>
          <div className="warning">
            Verlässt der aktuelle Millionär das Spiel, wird der Ablauf automatisch blockiert, bis du einen gültigen Nachfolger bestimmt hast.
          </div>
        </article>

        <aside className="panel">
          <p className="section-label">Rundensteuerung</p>
          <h2>Nächste Schritte</h2>
          <ol className="phase-list">
            <li className="done">Spiel angelegt</li>
            <li className="current">Spieler bestätigen</li>
            <li>Start-Millionär bestimmen</li>
            <li>Mission auswählen</li>
            <li>Rollen freigeben</li>
            <li>Challenge starten</li>
          </ol>
          <button className="button button-primary" type="button" style={{ width: "100%", marginTop: 24 }}>Vorbereitung prüfen</button>
        </aside>
      </section>
    </main>
  );
}
