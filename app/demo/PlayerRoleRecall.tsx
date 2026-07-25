"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const SESSION_STORAGE_KEY = "secret-millionaer.live-session.v1";

type Identity = {
  accessRole: "host" | "player";
  gameId: string;
  joinCode: string;
};

type PrivateState = {
  role?: "millionaire" | "investigator" | "none";
  roleRevealedAt?: string | null;
};

function readIdentity(): Identity | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "null") as Partial<Identity> | null;
    if (!parsed || parsed.accessRole !== "player" || !parsed.gameId || !parsed.joinCode) return undefined;
    return parsed as Identity;
  } catch {
    return undefined;
  }
}

export default function PlayerRoleRecall() {
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const [identity, setIdentity] = useState<Identity>();
  const [privateState, setPrivateState] = useState<PrivateState>();
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    const currentIdentity = readIdentity();
    setIdentity(currentIdentity);
    if (!currentIdentity || !isSupabaseConfigured()) {
      setPrivateState(undefined);
      return;
    }

    if (!clientRef.current) clientRef.current = createClient();
    const client = clientRef.current;
    const session = await client.auth.getSession();
    if (session.error) return;
    if (!session.data.session?.user) {
      const signIn = await client.auth.signInAnonymously();
      if (signIn.error) return;
    }

    const result = await client.rpc("get_live_private_state", {
      target_game_id: currentIdentity.gameId,
    });
    if (!result.error && result.data && typeof result.data === "object") {
      setPrivateState(result.data as PrivateState);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2500);
    const sync = () => void refresh();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, [refresh]);

  const role = privateState?.role;
  const unlocked = Boolean(identity && privateState?.roleRevealedAt && role && role !== "none");
  if (!unlocked) return null;

  const millionaire = role === "millionaire";

  return (
    <div className="mpr-root" data-player-role-recall="v1">
      <button className="mpr-trigger" type="button" onClick={() => setOpen(true)}>
        <span>{millionaire ? "♛" : "⌕"}</span>
        Aktuelle Rolle ansehen
      </button>

      {open && (
        <div className="mpr-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className={`mpr-card ${millionaire ? "millionaire" : "investigator"}`} role="dialog" aria-modal="true" aria-labelledby="mpr-title">
            <button className="mpr-close" type="button" aria-label="Rollenfenster schließen" onClick={() => setOpen(false)}>×</button>
            <div className="mpr-symbol">{millionaire ? "♛" : "⌕"}</div>
            <p>Deine aktuelle Rolle</p>
            <h2 id="mpr-title">{millionaire ? "Millionär" : "Ermittler"}</h2>
            <strong>{millionaire
              ? "Erfülle deine geheime Mission, nutze deinen Vorteil und bleib unerkannt."
              : "Beobachte die anderen, diskutiere klug und entlarve den Millionär."}</strong>
            <small>Diese Information ist nur auf deinem Gerät sichtbar.</small>
          </section>
        </div>
      )}
    </div>
  );
}
