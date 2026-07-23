"use client";

import { useEffect, useState } from "react";
import type {
  CinematicVisual,
  OnboardingSlide,
  TransitionCue,
} from "@/lib/demo/onboarding";
import GoldCrownCap from "./GoldCrownCap";

function SceneVisual({
  visual,
  compact = false,
}: {
  visual: CinematicVisual;
  compact?: boolean;
}) {
  return (
    <div
      className={`scene-visual scene-${visual} ${compact ? "scene-compact" : ""}`}
      aria-hidden="true"
    >
      <div className="scene-horizon" />
      <div className="scene-content">
        {visual === "cork-orbit" && (
          <>
            <div className="scene-cork scene-gold-cap">
              <GoldCrownCap size={compact ? "medium" : "large"} />
            </div>
            <i className="orbit orbit-a" />
            <i className="orbit orbit-b" />
            <i className="orbit orbit-c" />
          </>
        )}
        {visual === "suspect-lineup" && (
          <>
            <div className="lineup-lines" />
            {[1, 2, 3, 4, 5].map((item) => (
              <span className={`suspect suspect-${item}`} key={item}>
                <i />
              </span>
            ))}
            <b className="lineup-flash">VERDÄCHTIG</b>
          </>
        )}
        {visual === "pin-vault" && (
          <>
            <div className="vault-door">
              <span>••••</span><i /><i /><i />
            </div>
            <div className="vault-lock">PIN</div>
          </>
        )}
        {visual === "host-console" && (
          <>
            <div className="console-panel">
              <span /><span /><span /><span /><span /><span />
            </div>
            <div className="console-wave"><i /></div>
            <b className="console-label">REGIE</b>
          </>
        )}
        {visual === "lobby-grid" && (
          <div className="lobby-mini-grid">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <span key={item}><i />P{item}</span>
            ))}
          </div>
        )}
        {visual === "role-card" && (
          <>
            <div className="role-card-stack">
              <span className="role-card-back" />
              <span className="role-card-front">♛</span>
            </div>
            <i className="role-glint" />
          </>
        )}
        {visual === "team-split" && (
          <>
            <div className="team-column team-column-azur">
              <strong>AZUR</strong><span /><span /><span />
            </div>
            <div className="team-divider">VS</div>
            <div className="team-column team-column-gold">
              <strong>GOLD</strong><span /><span /><span />
            </div>
          </>
        )}
        {visual === "ballot-box" && (
          <>
            <div className="ballot-paper"><span>×</span></div>
            <div className="ballot-box"><i /></div>
          </>
        )}
        {visual === "mission-envelope" && (
          <>
            <div className="mission-envelope"><span>SM</span><i /></div>
            <div className="mission-seal">♛</div>
          </>
        )}
        {visual === "challenge-course" && (
          <>
            <div className="course-path" />
            <span className="course-marker marker-a">A</span>
            <span className="course-marker marker-b">B</span>
            <span className="course-runner">●</span>
          </>
        )}
        {visual === "question-lamp" && (
          <>
            <div className="question-lamp"><i /></div>
            <span className="question-mark">?</span>
            <div className="answer-slots"><b>JA</b><b>NEIN</b></div>
          </>
        )}
        {visual === "discussion-bubbles" && (
          <>
            <span className="speech speech-a">?</span>
            <span className="speech speech-b">!</span>
            <span className="speech speech-c">…</span>
            <span className="speech speech-d">NEIN</span>
          </>
        )}
        {visual === "review-scales" && (
          <>
            <div className="scale-post"><i /></div>
            <div className="scale-arm"><span /><span /></div>
            <b className="scale-label">BEWEIS</b>
          </>
        )}
        {visual === "advantage-cards" && (
          <div className="advantage-card-fan">
            <span>+1</span><span>×2</span><span>↻</span><span>Ø</span>
          </div>
        )}
        {visual === "evaluation-counter" && (
          <>
            <div className="counter-board"><span>3</span><span>5</span><span>2</span></div>
            <div className="counter-bars"><i /><i /><i /></div>
          </>
        )}
        {visual === "result-trapdoor" && (
          <>
            <div className="trapdoor"><span>×</span></div>
            <div className="falling-token">●</div>
          </>
        )}
        {visual === "transfer-roulette" && (
          <>
            <div className="roulette-wheel">
              {[1, 2, 3, 4, 5, 6].map((item) => <i key={item} />)}
              <span>♛</span>
            </div>
            <b className="roulette-pointer">▼</b>
          </>
        )}
        {visual === "finale-crown" && (
          <>
            <div className="finale-crown">♛</div>
            <div className="finale-rays"><i /><i /><i /><i /></div>
          </>
        )}
      </div>
    </div>
  );
}

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
    }, 300);
  }

  return (
    <section
      className={`cinematic-intro intro-visual-${slide.visual}`}
      aria-label="Einführung in Secret Millionär"
    >
      <div className="cinematic-noise" aria-hidden="true" />
      <div className="cinematic-orbit cinematic-orbit-one" aria-hidden="true" />
      <div className="cinematic-orbit cinematic-orbit-two" aria-hidden="true" />
      <div className="cinematic-intro-shell">
        <div className="cinematic-intro-topline">
          <span>SECRET MILLIONÄR</span>
          <button type="button" onClick={onSkip}>
            Vorspann überspringen · Charakterbildung ablehnen
          </button>
        </div>

        <div className={`cinematic-slide ${moving ? "leaving" : "entering"}`}>
          <SceneVisual visual={slide.visual} />
          <div className="cinematic-slide-copy">
            <p>{slide.eyebrow}</p>
            <h1>{slide.title}</h1>
            <div className="cinematic-divider" />
            <p className="cinematic-body">{slide.body}</p>
            <span className="cinematic-signal">{slide.signal}</span>
          </div>
        </div>

        <div className="cinematic-intro-footer">
          <div
            className="cinematic-progress-dots"
            aria-label={`Schritt ${index + 1} von ${slides.length}`}
          >
            {slides.map((entry, dotIndex) => (
              <span className={dotIndex <= index ? "active" : ""} key={entry.title} />
            ))}
          </div>
          {!last ? (
            <button className="button button-primary" type="button" onClick={advance}>
              Weiter, bevor Vernunft einsetzt
            </button>
          ) : (
            <div className="cinematic-entry-actions">
              <button className="button button-primary" type="button" onClick={onPlayer}>
                Einem Spiel beitreten
              </button>
              <button className="button button-secondary" type="button" onClick={onHost}>
                Als Spielleitung eine Partie erstellen
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
  const [moving, setMoving] = useState(false);
  const slide = slides[index];
  const last = index === slides.length - 1;

  function advance() {
    if (moving) return;
    if (last) {
      onComplete();
      return;
    }
    setMoving(true);
    window.setTimeout(() => {
      setIndex((current) => current + 1);
      setMoving(false);
    }, 260);
  }

  return (
    <section
      className={`role-tutorial tutorial-visual-${slide.visual}`}
      aria-label={`${role === "host" ? "Spielleiter" : "Spieler"}-Onboarding`}
    >
      <div className={`role-tutorial-card ${moving ? "tutorial-moving" : ""}`}>
        <div className="role-tutorial-visual">
          <span>{role === "host" ? "REGIE" : "PROFIL"}</span>
          <SceneVisual visual={slide.visual} compact />
        </div>
        <div className="role-tutorial-copy">
          <p className="section-label">{slide.eyebrow}</p>
          <h1>{slide.title}</h1>
          <p>{slide.body}</p>
          <span className="cinematic-signal">{slide.signal}</span>
          <div className="role-tutorial-footer">
            <div className="cinematic-progress-dots">
              {slides.map((entry, dotIndex) => (
                <span className={dotIndex <= index ? "active" : ""} key={entry.title} />
              ))}
            </div>
            <button className="button button-primary" type="button" onClick={advance}>
              {last
                ? "Zugang öffnen · Gewissen separat erhältlich"
                : "Weiter, die Lage wird nicht besser"}
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
    const first = window.setTimeout(() => setStage(1), 120);
    const second = window.setTimeout(() => setStage(2), 700);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, [visible, cue]);

  if (!visible || !cue) return null;

  return (
    <div
      className={`transition-sequence transition-${cue.visual} stage-${stage}`}
      role="status"
      aria-live="polite"
    >
      <div className="transition-grid" aria-hidden="true" />
      <div className="transition-scan" aria-hidden="true" />
      <div className="transition-visual-wrap">
        <SceneVisual visual={cue.visual} compact />
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
