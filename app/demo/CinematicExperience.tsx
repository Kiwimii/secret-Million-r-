"use client";

import { useEffect, useState } from "react";
import type {
  OnboardingSlide,
  TransitionCue,
} from "@/lib/demo/onboarding";

export function CinematicIntro({
  slides,
  onPlayer,
  onHost,
  onSkip,
}: {
  slides: readonly OnboardingSlide[];
  onPlayer(): void;
  onHost(): void;
  onSkip(): void;
}) {
  const [index, setIndex] = useState(0);
  const [moving, setMoving] = useState(false);
  const slide = slides[index];
  const last = index === slides.length - 1;

  function advance() {
    if (last || moving) return;
    setMoving(true);
    window.setTimeout(() => {
      setIndex((current) => Math.min(current + 1, slides.length - 1));
      setMoving(false);
    }, 260);
  }

  return (
    <section className="cinematic-intro" aria-label="Einführung in Secret Millionär">
      <div className="cinematic-noise" aria-hidden="true" />
      <div className="cinematic-orbit cinematic-orbit-one" aria-hidden="true" />
      <div className="cinematic-orbit cinematic-orbit-two" aria-hidden="true" />
      <div className="cinematic-intro-shell">
        <div className="cinematic-intro-topline">
          <span>SECRET MILLIONÄR</span>
          <button type="button" onClick={onSkip}>Vorspann überspringen · auf eigenes Risiko</button>
        </div>

        <div className={`cinematic-slide ${moving ? "leaving" : "entering"}`}>
          <div className="cinematic-token" aria-hidden="true">
            <span>€</span>
            <i />
          </div>
          <div className="cinematic-slide-copy">
            <p>{slide.eyebrow}</p>
            <h1>{slide.title}</h1>
            <div className="cinematic-divider" />
            <p className="cinematic-body">{slide.body}</p>
            <span className="cinematic-signal">{slide.signal}</span>
          </div>
        </div>

        <div className="cinematic-intro-footer">
          <div className="cinematic-progress-dots" aria-label={`Schritt ${index + 1} von ${slides.length}`}>
            {slides.map((entry, dotIndex) => (
              <span
                className={dotIndex <= index ? "active" : ""}
                key={entry.title}
              />
            ))}
          </div>
          {!last ? (
            <button className="button button-primary" type="button" onClick={advance}>
              Weiter ins Misstrauen
            </button>
          ) : (
            <div className="cinematic-entry-actions">
              <button className="button button-primary" type="button" onClick={onPlayer}>
                Als Spieler verdächtig werden
              </button>
              <button className="button button-secondary" type="button" onClick={onHost}>
                Verantwortung als Spielleitung übernehmen
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function RoleTutorial({
  slides,
  role,
  onComplete,
}: {
  slides: readonly OnboardingSlide[];
  role: "player" | "host";
  onComplete(): void;
}) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const last = index === slides.length - 1;

  return (
    <section className="role-tutorial" aria-label={`${role === "host" ? "Spielleiter" : "Spieler"}-Onboarding`}>
      <div className="role-tutorial-card">
        <div className="role-tutorial-visual" aria-hidden="true">
          <span>{role === "host" ? "REGIE" : "PROFIL"}</span>
          <div className="role-tutorial-radar">
            <i /><i /><i />
          </div>
        </div>
        <div className="role-tutorial-copy">
          <p className="section-label">{slide.eyebrow}</p>
          <h1>{slide.title}</h1>
          <p>{slide.body}</p>
          <span className="cinematic-signal">{slide.signal}</span>

          <div className="role-tutorial-footer">
            <div className="cinematic-progress-dots">
              {slides.map((entry, dotIndex) => (
                <span
                  className={dotIndex <= index ? "active" : ""}
                  key={entry.title}
                />
              ))}
            </div>
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                if (last) onComplete();
                else setIndex((current) => current + 1);
              }}
            >
              {last ? "Zugang öffnen · Unschuld nicht garantiert" : "Weiter, wir sind noch höflich"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TransitionSequence({
  cue,
  visible,
}: {
  cue?: TransitionCue;
  visible: boolean;
}) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!visible) {
      setStage(0);
      return;
    }
    const first = window.setTimeout(() => setStage(1), 130);
    const second = window.setTimeout(() => setStage(2), 720);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, [visible, cue]);

  if (!visible || !cue) return null;

  return (
    <div className={`transition-sequence stage-${stage}`} role="status" aria-live="polite">
      <div className="transition-grid" aria-hidden="true" />
      <div className="transition-scan" aria-hidden="true" />
      <div className="transition-core" aria-hidden="true">
        <span>€</span>
        <i /><i /><i />
      </div>
      <div className="transition-copy">
        <p>{cue.eyebrow}</p>
        <h2>{cue.title}</h2>
        <div className="transition-line"><span /></div>
        <p>{cue.body}</p>
        <strong>{cue.signal}</strong>
      </div>
    </div>
  );
}
