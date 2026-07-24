"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const RESULT_SELECTOR = ".sgi-player-stage.result .sgi-public-result";

export default function ResultPopupCloseController() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const locate = () => {
      const next = document.querySelector<HTMLElement>(RESULT_SELECTOR);
      setTarget((current) => {
        if (current === next) return current;
        setHidden(false);
        return next;
      });
    };

    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = target?.closest<HTMLElement>(".sgi-player-stage");
    if (!stage) return;
    stage.classList.toggle("smf-result-dismissed", hidden);
    return () => stage.classList.remove("smf-result-dismissed");
  }, [hidden, target]);

  if (!target) return null;

  return (
    <>
      {createPortal(
        <button
          className="smf-popup-close smf-result-close"
          type="button"
          onClick={() => setHidden(true)}
          aria-label="Rundenergebnis schließen und Lobby anzeigen"
        >
          ×
        </button>,
        target,
      )}
      {hidden && (
        <button className="smf-reopen-button player" type="button" onClick={() => setHidden(false)}>
          Rundenergebnis öffnen
        </button>
      )}
    </>
  );
}
