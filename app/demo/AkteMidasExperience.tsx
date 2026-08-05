"use client";

import { useEffect, useId, useState } from "react";
import AkteMidasApp from "./AkteMidasApp";
import styles from "./akte-midas.module.css";

const INTRO_STORAGE_KEY = "secret-millionaer.akte-midas.intro.v1";
const INTRO_STEP_MS = 5_200;

const INTRO_SCENES = [
  {
    code: "VERBINDUNG",
    title: "Sichere Verbindung wird hergestellt",
    body: "Verschlüsselung aktiv. Vertrauen weiterhin deaktiviert.",
  },
  {
    code: "AKTE MIDAS",
    title: "Zugriff vorläufig genehmigt",
    body: "Eine Person in diesem Raum ist der Millionär. Die übrigen besitzen immerhin Meinungen.",
  },
  {
    code: "PROTOKOLL",
    title: "Beobachten. Täuschen. Abstimmen.",
    body: "Wer richtig liegt, erhält Punkte. Wer falsch liegt, erhält Erfahrung. Die Zentrale bewertet beides unterschiedlich.",
  },
  {
    code: "EINSATZ",
    title: "Jede Runde erhöht den Preis",
    body: "Missionen bleiben geheim. Verdächtigungen selten. Fehlentscheidungen werden dauerhaft archiviert.",
  },
  {
    code: "FREIGABE",
    title: "Vertrauen ist gestattet",
    body: "Beweise werden bevorzugt.",
  },
] as const;

function MidasMark() {
  const gradientId = useId().replace(/:/g, "");
  return (
    <svg className={styles.mark} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f0d28a" />
          <stop offset=".45" stopColor="#b98d3f" />
          <stop offset="1" stopColor="#6f4d1d" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="52" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
      <circle cx="60" cy="60" r="43" fill="none" stroke="currentColor" strokeOpacity=".35" />
      <path d="M34 77V42l26 23 26-23v35" fill="none" stroke={`url(#${gradientId})`} strokeWidth="5" strokeLinecap="square" />
      <path d="M34 82h52M42 32h36" stroke="currentColor" strokeOpacity=".55" />
      <text x="60" y="103" textAnchor="middle" fontSize="8" letterSpacing="3" fill="currentColor">MIDAS</text>
    </svg>
  );
}

function OperativeSilhouettes() {
  const gradientId = useId().replace(/:/g, "");
  return (
    <svg className={styles.silhouettes} viewBox="0 0 760 220" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#d2b16a" stopOpacity=".44" />
          <stop offset="1" stopColor="#101213" stopOpacity=".06" />
        </linearGradient>
      </defs>
      {[80, 200, 320, 440, 560, 680].map((x, index) => (
        <g key={x} opacity={index === 2 ? .85 : .48}>
          <circle cx={x} cy="62" r={index === 2 ? 29 : 25} fill={`url(#${gradientId})`} />
          <path d={`M${x - 48} 202c5-68 20-102 48-102s43 34 48 102z`} fill={`url(#${gradientId})`} />
          <path d={`M${x - 22} 105l22 25 22-25`} fill="none" stroke="#d2b16a" strokeOpacity=".35" />
        </g>
      ))}
      <path d="M0 202h760" stroke="#c4a15a" strokeOpacity=".24" />
    </svg>
  );
}

function SlowIntro({ onClose }: { onClose(): void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= INTRO_SCENES.length - 1) return;
    let timer: number | undefined;

    const schedule = () => {
      if (document.visibilityState === "visible") {
        timer = window.setTimeout(() => {
          setStep((current) => Math.min(current + 1, INTRO_SCENES.length - 1));
        }, INTRO_STEP_MS);
      }
    };
    const onVisibilityChange = () => {
      if (timer) window.clearTimeout(timer);
      schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [step]);

  const scene = INTRO_SCENES[step];
  return (
    <main className={styles.intro}>
      <button className={styles.introClose} onClick={onClose} aria-label="Intro schließen">×</button>
      <div className={styles.introGrid} />
      <OperativeSilhouettes />
      <section className={styles.introContent} aria-live="polite">
        <MidasMark />
        <div className={styles.classifiedStamp}>VERTRAULICH</div>
        <p className={styles.kicker}>{scene.code}</p>
        <h1>{scene.title}</h1>
        <p>{scene.body}</p>
        <div className={styles.introProgress}>
          {INTRO_SCENES.map((_, index) => (
            <button
              key={index}
              onClick={() => setStep(index)}
              className={index <= step ? styles.activeProgress : ""}
              aria-label={`Introszene ${index + 1}`}
            />
          ))}
        </div>
        <button className={styles.primaryButton} onClick={onClose}>
          {step === INTRO_SCENES.length - 1 ? "Akte öffnen" : "Intro überspringen"}
        </button>
        <small>Die Zentrale wünscht einen diskreten Abend. Erfahrungsgemäß ist es dafür bereits zu spät.</small>
      </section>
    </main>
  );
}

export default function AkteMidasExperience() {
  const [ready, setReady] = useState(false);
  const [introSeen, setIntroSeen] = useState(false);

  useEffect(() => {
    setIntroSeen(window.localStorage.getItem(INTRO_STORAGE_KEY) === "seen");
    setReady(true);
  }, []);

  function closeIntro() {
    window.localStorage.setItem(INTRO_STORAGE_KEY, "seen");
    setIntroSeen(true);
  }

  if (!ready) {
    return <main className={styles.loading}><MidasMark /><p>Sichere Verbindung wird hergestellt …</p></main>;
  }

  return introSeen ? <AkteMidasApp /> : <SlowIntro onClose={closeIntro} />;
}
