import Link from "next/link";

export default function JoinPage() {
  return (
    <main className="subpage">
      <nav className="subnav">
        <Link href="/">← Zurück zur Geheimakte</Link>
        <span className="eyebrow">Sicherer Beitritt</span>
      </nav>

      <header className="page-title">
        <p className="section-label">Spielerprofil</p>
        <h1>Identität anlegen.</h1>
        <p>
          Der Beitritt erfolgt später über den WhatsApp-Link und einen persönlichen PIN. Der
          Spielleiter bestätigt jedes Profil, bevor geheime Informationen freigegeben werden.
        </p>
      </header>

      <section className="join-grid">
        <article className="panel avatar-drop">
          <div>
            <div className="avatar-circle">＋</div>
            <strong>Profilfoto aufnehmen</strong>
            <p className="hint">Kamera, Bilddatei oder neutraler Avatar. Maximal 5 MB.</p>
          </div>
        </article>

        <form className="panel form-grid">
          <div className="field">
            <label htmlFor="code">Spielcode</label>
            <input id="code" name="code" inputMode="numeric" placeholder="z. B. 472 918" />
          </div>
          <div className="field">
            <label htmlFor="name">Anzeigename</label>
            <input id="name" name="name" autoComplete="nickname" placeholder="Dein Name" />
          </div>
          <div className="field">
            <label htmlFor="pin">Persönlicher PIN</label>
            <input id="pin" name="pin" type="password" inputMode="numeric" maxLength={6} placeholder="4–6 Ziffern" />
            <span className="hint">Der PIN schützt deine Rolle bei einem Gerätewechsel.</span>
          </div>
          <button className="button button-primary" type="button">Profil zur Freigabe senden</button>
          <p className="hint">Die Oberfläche steht. Die dauerhafte Speicherung wird im nächsten Schritt mit Supabase verbunden.</p>
        </form>
      </section>
    </main>
  );
}
