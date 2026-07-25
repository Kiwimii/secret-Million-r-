"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const SESSION_STORAGE_KEY = "secret-millionaer.live-session.v1";
const START_PAGE_TARGET_SELECTOR = ".mf3-intro-content > div:last-child";

async function ensureAnonymousSession() {
  const client = createClient();
  const existing = await client.auth.getSession();
  if (existing.error) throw new Error(existing.error.message);
  if (!existing.data.session?.user) {
    const signedIn = await client.auth.signInAnonymously({
      options: { data: { application: "secret-millionaer", purpose: "host-resume" } },
    });
    if (signedIn.error || !signedIn.data.user) {
      throw new Error(signedIn.error?.message ?? "Die Gerätesitzung konnte nicht erstellt werden.");
    }
  }
  return client;
}

export default function HostResumeGateway() {
  const [mounted, setMounted] = useState(false);
  const [hasStoredSession, setHasStoredSession] = useState(false);
  const [startPageTarget, setStartPageTarget] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setMounted(true);
    setHasStoredSession(Boolean(window.localStorage.getItem(SESSION_STORAGE_KEY)));

    const syncStartPageTarget = () => {
      setStartPageTarget(document.querySelector<HTMLElement>(START_PAGE_TARGET_SELECTOR));
    };
    const syncStoredSession = () => {
      setHasStoredSession(Boolean(window.localStorage.getItem(SESSION_STORAGE_KEY)));
    };

    syncStartPageTarget();
    const observer = new MutationObserver(syncStartPageTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("storage", syncStoredSession);
    window.addEventListener("focus", syncStoredSession);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", syncStoredSession);
      window.removeEventListener("focus", syncStoredSession);
    };
  }, []);

  const openResumeDialog = useCallback(() => {
    setHasStoredSession(false);
    setOpen(true);
    setError(undefined);
  }, []);

  function closeResumeDialog() {
    setOpen(false);
    setError(undefined);
  }

  async function resumeHost() {
    if (code.length !== 6) {
      setError("Der Sitzungscode muss genau sechs Ziffern enthalten.");
      return;
    }
    if (pin.length !== 4) {
      setError("Die André-PIN muss genau vier Ziffern enthalten.");
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Die öffentliche Live-Konfiguration fehlt.");
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      const client = await ensureAnonymousSession();
      const result = await client.rpc("resume_live_host", {
        raw_join_code: code,
        host_pin: pin,
      });
      if (result.error) throw new Error(result.error.message);
      const gameId = typeof result.data === "string" ? result.data : String(result.data ?? "");
      if (!gameId) throw new Error("Die Spielleiter-Sitzung konnte nicht wieder geöffnet werden.");

      window.localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          accessRole: "host",
          gameId,
          joinCode: code,
        }),
      );
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Der Spielleiter-Wiedereintritt ist fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || (hasStoredSession && !startPageTarget && !open)) return null;

  const startPageButton = startPageTarget
    ? createPortal(
        <button
          className="mf2-button mf2-button-ghost mf-resume-start-option"
          data-host-resume-entry="start-page"
          type="button"
          onClick={openResumeDialog}
        >
          <span aria-hidden="true">♛</span>
          Als Spielleiter wieder beitreten
        </button>,
        startPageTarget,
      )
    : null;

  return (
    <>
      {startPageButton}
      <div className={`mf-resume-gateway ${open ? "is-open" : ""}`} data-host-resume-gateway="host-pin-v1">
        {open && (
          <div
            className="mf-resume-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeResumeDialog();
            }}
          >
            <section className="mf-resume-dialog" role="dialog" aria-modal="true" aria-labelledby="mf-host-resume-title">
              <button className="mf-resume-close" type="button" aria-label="Schließen" onClick={closeResumeDialog}>×</button>
              <p className="mf-resume-kicker">Wiedereintritt für André</p>
              <h2 id="mf-host-resume-title">Bestehende Partie weiterleiten</h2>
              <p>Gib den sechsstelligen Sitzungscode und die bei der Erstellung festgelegte André-PIN ein. Die laufende Partie wird auf diesem Gerät als Spielleiter geöffnet.</p>

              <label className="mf-resume-field">
                <span>Sitzungscode</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                />
              </label>

              <div className="mf-resume-selected-profile">
                <span className="mf-resume-avatar">A</span>
                <div>
                  <strong>André · Spielleitung</strong>
                  <span>Die bestehende Partie wird übernommen. Es entsteht keine neue Partie.</span>
                </div>
              </div>

              <label className="mf-resume-field">
                <span>André-PIN</span>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                />
              </label>

              {error && <div className="mf-resume-error" role="alert">{error}</div>}

              <button
                className="mf-resume-submit"
                type="button"
                disabled={submitting || code.length !== 6 || pin.length !== 4}
                onClick={() => void resumeHost()}
              >
                {submitting ? "Spielleitung wird wiederhergestellt …" : "Als Spielleiter wieder beitreten"}
              </button>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
