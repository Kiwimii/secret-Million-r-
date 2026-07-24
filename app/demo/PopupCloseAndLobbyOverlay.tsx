"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const SESSION_STORAGE_KEY = "secret-millionaer.live-session.v1";

type Identity = {
  accessRole: "host" | "player";
  gameId: string;
  memberId?: string;
  joinCode: string;
};

type Summary = {
  current_round: number;
  phase: string;
};

type LobbyMember = {
  member_id: string;
  display_name: string;
  avatar_path?: string | null;
  attendance_status: string;
  winner_pool_status: string;
};

function readIdentity(): Identity | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "null") as Partial<Identity> | null;
    if (!parsed || (parsed.accessRole !== "host" && parsed.accessRole !== "player")) return undefined;
    if (!parsed.gameId || !parsed.joinCode) return undefined;
    return parsed as Identity;
  } catch {
    return undefined;
  }
}

function Avatar({ member }: { member: LobbyMember }) {
  return (
    <span className="pcl-avatar">
      {member.avatar_path ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.avatar_path} alt="" />
      ) : member.display_name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function PopupCloseAndLobbyOverlay() {
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const refreshingRef = useRef(false);
  const [identity, setIdentity] = useState<Identity>();
  const [summary, setSummary] = useState<Summary>();
  const [lobby, setLobby] = useState<LobbyMember[]>([]);
  const [resultPanel, setResultPanel] = useState<HTMLElement | null>(null);
  const [resultDismissed, setResultDismissed] = useState(false);
  const [hostDrawerOpen, setHostDrawerOpen] = useState(false);

  const getClient = useCallback(() => {
    if (!clientRef.current) clientRef.current = createClient();
    return clientRef.current;
  }, []);

  const ensureSession = useCallback(async () => {
    const client = getClient();
    const current = await client.auth.getSession();
    if (current.error) throw new Error(current.error.message);
    if (!current.data.session?.user) {
      const signedIn = await client.auth.signInAnonymously({
        options: { data: { application: "secret-millionaer", purpose: "post-round-lobby" } },
      });
      if (signedIn.error || !signedIn.data.user) {
        throw new Error(signedIn.error?.message ?? "Gerätesitzung fehlt.");
      }
    }
    return client;
  }, [getClient]);

  const refresh = useCallback(async () => {
    const activeIdentity = readIdentity();
    setIdentity(activeIdentity);
    if (!activeIdentity || !isSupabaseConfigured() || refreshingRef.current) return;

    refreshingRef.current = true;
    try {
      const client = await ensureSession();
      const lookup = await client.rpc("lookup_live_game", { raw_join_code: activeIdentity.joinCode });
      if (lookup.error) return;
      const row = Array.isArray(lookup.data) ? lookup.data[0] as Summary | undefined : undefined;
      if (!row) return;
      setSummary((previous) => {
        if (previous && previous.current_round !== row.current_round) setResultDismissed(false);
        return row;
      });

      if (activeIdentity.accessRole === "player" && (row.phase === "result" || row.phase === "role_transfer")) {
        const lobbyResponse = await client.rpc("get_public_lobby_members", {
          target_game_id: activeIdentity.gameId,
        });
        if (!lobbyResponse.error) setLobby((lobbyResponse.data ?? []) as LobbyMember[]);
      } else {
        setLobby([]);
      }
    } finally {
      refreshingRef.current = false;
    }
  }, [ensureSession]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    const onSync = () => void refresh();
    window.addEventListener("storage", onSync);
    window.addEventListener("focus", onSync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", onSync);
      window.removeEventListener("focus", onSync);
    };
  }, [refresh]);

  useEffect(() => {
    const syncDomTargets = () => {
      setResultPanel(document.querySelector<HTMLElement>(".sgi-player-stage.result .sgi-public-result"));
      setHostDrawerOpen(Boolean(document.querySelector(".sgi-host-drawer")));
    };
    syncDomTargets();
    const observer = new MutationObserver(syncDomTargets);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = document.querySelector<HTMLElement>(".sgi-player-stage.result");
    if (!stage) return;
    stage.classList.toggle("pcl-result-dismissed", resultDismissed);
    return () => stage.classList.remove("pcl-result-dismissed");
  }, [resultDismissed, resultPanel]);

  if (!identity || !summary) return null;

  const postRound = summary.phase === "result" || summary.phase === "role_transfer";
  const showPlayerLobby = identity.accessRole === "player" && postRound;

  return (
    <>
      {showPlayerLobby && (
        <section className="pcl-lobby" data-post-round-lobby="v1" aria-label="Warte-Lobby">
          <div className="pcl-lobby-inner">
            <div className="pcl-lobby-copy">
              <p>Runde {summary.current_round} abgeschlossen</p>
              <h2>Zurück in der Lobby.</h2>
              <strong>Warte hier, bis der Millionär entschieden hat und André die nächste Runde freigibt.</strong>
              <span>Du wirst automatisch zur nächsten Rollenkarte weitergeleitet.</span>
            </div>
            <div className="pcl-lobby-list">
              {lobby.map((member) => (
                <article className={member.winner_pool_status === "eliminated" ? "eliminated" : ""} key={member.member_id}>
                  <Avatar member={member} />
                  <div>
                    <strong>{member.display_name}</strong>
                    <span>{member.attendance_status === "present" ? "In der Lobby" : "Nicht anwesend"}{member.winner_pool_status === "eliminated" ? " · ausgeschieden" : ""}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {resultPanel && identity.accessRole === "player" && postRound && createPortal(
        <button
          className="pcl-popup-close"
          type="button"
          aria-label="Rundenergebnis schließen und Lobby anzeigen"
          onClick={() => setResultDismissed(true)}
        >
          ×
        </button>,
        resultPanel,
      )}

      {identity.accessRole === "player" && postRound && resultDismissed && (
        <button className="pcl-result-reopen" type="button" onClick={() => setResultDismissed(false)}>
          {summary.phase === "role_transfer" ? "Ergebnis und Entscheidung öffnen" : "Rundenergebnis öffnen"}
        </button>
      )}

      {identity.accessRole === "host" && hostDrawerOpen && (
        <span className="pcl-host-drawer-marker" aria-hidden="true" />
      )}
    </>
  );
}
