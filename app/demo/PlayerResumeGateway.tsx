"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const SESSION_STORAGE_KEY = "secret-millionaer.live-session.v1";

type ResumeProfile = {
  gameId: string;
  gameTitle: string;
  memberId: string;
  displayName: string;
  avatarPath?: string;
  attendanceStatus: string;
};

type RpcRow = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

async function ensureAnonymousSession() {
  const client = createClient();
  const existing = await client.auth.getSession();
  if (existing.error) throw new Error(existing.error.message);
  if (!existing.data.session?.user) {
    const signedIn = await client.auth.signInAnonymously({
      options: { data: { application: "secret-millionaer", purpose: "player-resume" } },
    });
    if (signedIn.error || !signedIn.data.user) {
      throw new Error(signedIn.error?.message ?? "Die Gerätesitzung konnte nicht erstellt werden.");
    }
  }
  return client;
}

function mapProfile(row: RpcRow): ResumeProfile {
  return {
    gameId: asString(row.game_id),
    gameTitle: asString(row.game_title),
    memberId: asString(row.member_id),
    displayName: asString(row.display_name),
    avatarPath: asString(row.avatar_path) || undefined,
    attendanceStatus: asString(row.attendance_status),
  };
}

export default function PlayerResumeGateway() {
  const [mounted, setMounted] = useState(false);
  const [hasStoredSession, setHasStoredSession] = useState(false);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [profiles, setProfiles] = useState<ResumeProfile[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [pin, setPin] = useState("");
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setMounted(true);
    setHasStoredSession(Boolean(window.localStorage.getItem(SESSION_STORAGE_KEY)));
  }, []);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.memberId === selectedMemberId),
    [profiles, selectedMemberId],
  );

  const loadProfiles = useCallback(async (requestedCode: string) => {
    if (requestedCode.length !== 6) return;
    if (!isSupabaseConfigured()) {
      setError("Die öffentliche Live-Konfiguration fehlt.");
      return;
    }
    setLoadingProfiles(true);
    setError(undefined);
    try {
      const client = await ensureAnonymousSession();
      const result = await client.rpc("list_live_game_profiles", {
        raw_join_code: requestedCode,
      });
      if (result.error) throw new Error(result.error.message);
      const nextProfiles = ((result.data ?? []) as RpcRow[]).map(mapProfile);
      setProfiles(nextProfiles);
      setSelectedMemberId(nextProfiles[0]?.memberId ?? "");
      if (nextProfiles.length === 0) {
        setError("In dieser Partie wurden noch keine Spielerprofile erstellt.");
      }
    } catch (caught) {
      setProfiles([]);
      setSelectedMemberId("");
      setError(caught instanceof Error ? caught.message : "Die Profile konnten nicht geladen werden.");
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (code.length !== 6) {
      setProfiles([]);
      setSelectedMemberId("");
      setError(undefined);
      return;
    }
    const timer = window.setTimeout(() => void loadProfiles(code), 350);
    return () => window.clearTimeout(timer);
  }, [code, loadProfiles, open]);

  async function resumeProfile() {
    if (code.length !== 6) {
      setError("Der Sitzungscode muss genau sechs Ziffern enthalten.");
      return;
    }
    if (!selectedMemberId) {
      setError("Bitte wähle dein bestehendes Profil aus.");
      return;
    }
    if (pin.length !== 4) {
      setError("Die Profil-PIN muss genau vier Ziffern enthalten.");
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      const client = await ensureAnonymousSession();
      const result = await client.rpc("resume_live_player_by_member", {
        raw_join_code: code,
        target_member_id: selectedMemberId,
        player_pin: pin,
      });
      if (result.error) throw new Error(result.error.message);
      const row = Array.isArray(result.data) ? (result.data[0] as RpcRow | undefined) : undefined;
      if (!row?.game_id || !row.member_id) {
        throw new Error("Das Profil konnte nicht wieder geöffnet werden.");
      }

      window.localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          accessRole: "player",
          gameId: asString(row.game_id),
          memberId: asString(row.member_id),
          joinCode: code,
        }),
      );
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Der Wiedereintritt ist fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || hasStoredSession) return null;

  return (
    <div className={`mf-resume-gateway ${open ? "is-open" : ""}`} data-player-resume-gateway="profile-dropdown-v1">
      {!open && (
        <button className="mf-resume-trigger" type="button" onClick={() => setOpen(true)}>
          <span>↻</span>
          Laufendem Spiel wieder beitreten
        </button>
      )}

      {open && (
        <div className="mf-resume-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="mf-resume-dialog" role="dialog" aria-modal="true" aria-labelledby="mf-resume-title">
            <button className="mf-resume-close" type="button" aria-label="Schließen" onClick={() => setOpen(false)}>×</button>
            <p className="mf-resume-kicker">Wiedereintritt</p>
            <h2 id="mf-resume-title">Bestehendes Profil öffnen</h2>
            <p>Gib zuerst den Sitzungscode ein. Danach erscheinen alle bereits erstellten Profile dieser Partie.</p>

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

            <div className={`mf-resume-profile-loader ${loadingProfiles ? "is-loading" : ""}`} aria-live="polite">
              {code.length < 6 && <span>Nach sechs Ziffern werden die Profile automatisch geladen.</span>}
              {loadingProfiles && <span>Profile werden geladen …</span>}
              {code.length === 6 && !loadingProfiles && profiles.length > 0 && (
                <button type="button" onClick={() => void loadProfiles(code)}>Profile neu laden</button>
              )}
            </div>

            {profiles.length > 0 && (
              <>
                <label className="mf-resume-field">
                  <span>Dein Profil</span>
                  <select value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)}>
                    {profiles.map((profile) => (
                      <option value={profile.memberId} key={profile.memberId}>{profile.displayName}</option>
                    ))}
                  </select>
                </label>

                {selectedProfile && (
                  <div className="mf-resume-selected-profile">
                    <span className="mf-resume-avatar">
                      {selectedProfile.avatarPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selectedProfile.avatarPath} alt="" />
                      ) : selectedProfile.displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <strong>{selectedProfile.displayName}</strong>
                      <span>{selectedProfile.gameTitle}</span>
                    </div>
                  </div>
                )}

                <label className="mf-resume-field">
                  <span>Profil-PIN</span>
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
              </>
            )}

            {error && <div className="mf-resume-error" role="alert">{error}</div>}

            <button
              className="mf-resume-submit"
              type="button"
              disabled={submitting || loadingProfiles || !selectedMemberId || pin.length !== 4}
              onClick={() => void resumeProfile()}
            >
              {submitting ? "Profil wird geöffnet …" : "Laufendem Spiel wieder beitreten"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
