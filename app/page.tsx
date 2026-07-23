import Link from "next/link";

const rounds = [
  ["01", "Operation Umkehrschub", "Freitagabend"],
  ["02", "Der Fall des weißen Königs", "Samstagmorgen"],
  ["03", "Protokoll Aquarius", "Samstagmittag"],
  ["04", "Die Midas-Klammer", "Samstagabend"],
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-noise" />
        <nav className="topbar">
          <span className="brand-mark">SM</span>
          <span className="eyebrow">Blaue Adria · Geheimakte 2026</span>
          <span className="status-dot">Testversion bereit</span>
        </nav>

        <div className="hero-content">
          <p className="kicker">
            Einer trägt das Vermögen. Alle anderen jagen ihn.
          </p>
          <h1>
            Secret <span>Millionär</span>
          </h1>
          <p className="lead">
            Vier Runden. Geheime Rollen. Verdeckte Missionen. Eine falsche
            Anschuldigung reicht, um aus dem Gewinnerpool zu fliegen.
          </p>

          <div className="actions">
            <Link className="button button-primary" href="/demo">
              Browser-Test starten
            </Link>
            <Link className="button button-secondary" href="/join">
              Spiel beitreten
            </Link>
            <Link className="button button-secondary" href="/admin">
              Spielleitung öffnen
            </Link>
          </div>
        </div>

        <div className="gold-token" aria-hidden="true">
          <span>€</span>
        </div>
      </section>

      <section className="briefing">
        <div>
          <p className="section-label">Einsatzplan</p>
          <h2>Das Wochenende folgt einem kontrollierten Ablauf.</h2>
        </div>
        <p>
          Der Spielleiter gibt jede Phase manuell frei. Rollen, Missionen,
          Vorteile, Stimmen und Punktestände bleiben getrennt und werden nur
          den berechtigten Personen angezeigt.
        </p>
      </section>

      <section className="round-grid">
        {rounds.map(([number, title, time]) => (
          <article className="round-card" key={number}>
            <span className="round-number">{number}</span>
            <p>{time}</p>
            <h3>{title}</h3>
            <span className="locked">Noch gesperrt</span>
          </article>
        ))}
      </section>
    </main>
  );
}
