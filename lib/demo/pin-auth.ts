const AUTH_STORAGE_KEY = "secret-millionaer.demo.pin-auth.v1";
const ATTEMPT_STORAGE_KEY = "secret-millionaer.demo.pin-attempts.v1";
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 60_000;

export interface PinCredential {
  salt: string;
  hash: string;
  createdAt: string;
}

interface AuthRegistry {
  version: 1;
  host?: PinCredential;
  players: Record<string, PinCredential>;
}

interface AttemptState {
  failures: number;
  lockedUntil?: number;
}

type AttemptRegistry = Record<string, AttemptState>;

function getStorage(): Storage {
  if (typeof window === "undefined") {
    throw new Error("PIN-Schutz ist nur im Browser verfügbar.");
  }
  return window.localStorage;
}

function readRegistry(): AuthRegistry {
  try {
    const raw = getStorage().getItem(AUTH_STORAGE_KEY);
    if (!raw) return { version: 1, players: {} };
    const parsed = JSON.parse(raw) as Partial<AuthRegistry>;
    return {
      version: 1,
      host: parsed.host,
      players: parsed.players ?? {},
    };
  } catch {
    return { version: 1, players: {} };
  }
}

function writeRegistry(registry: AuthRegistry) {
  getStorage().setItem(AUTH_STORAGE_KEY, JSON.stringify(registry));
}

function readAttempts(): AttemptRegistry {
  try {
    const raw = getStorage().getItem(ATTEMPT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AttemptRegistry) : {};
  } catch {
    return {};
  }
}

function writeAttempts(registry: AttemptRegistry) {
  getStorage().setItem(ATTEMPT_STORAGE_KEY, JSON.stringify(registry));
}

function normalizePin(pin: string): string {
  const normalized = pin.trim();
  if (!/^\d{4}$/.test(normalized)) {
    throw new Error("Die PIN muss genau aus vier Ziffern bestehen.");
  }
  return normalized;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomSalt(): string {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Die sichere Zufallsfunktion des Browsers ist nicht verfügbar.");
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function digest(scope: string, salt: string, pin: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Die sichere PIN-Prüfung wird von diesem Browser nicht unterstützt.");
  }
  const payload = new TextEncoder().encode(`${scope}:${salt}:${normalizePin(pin)}`);
  const hash = await globalThis.crypto.subtle.digest("SHA-256", payload);
  return bytesToHex(new Uint8Array(hash));
}

function attemptKey(scope: string) {
  return `pin:${scope}`;
}

function ensureNotLocked(scope: string) {
  const attempts = readAttempts();
  const state = attempts[attemptKey(scope)];
  if (!state?.lockedUntil) return;
  const remaining = state.lockedUntil - Date.now();
  if (remaining <= 0) {
    delete attempts[attemptKey(scope)];
    writeAttempts(attempts);
    return;
  }
  throw new Error(
    `Zu viele falsche Versuche. Warte noch ${Math.ceil(remaining / 1000)} Sekunden.`,
  );
}

function recordAttempt(scope: string, success: boolean) {
  const attempts = readAttempts();
  const key = attemptKey(scope);
  if (success) {
    delete attempts[key];
    writeAttempts(attempts);
    return;
  }

  const previous = attempts[key] ?? { failures: 0 };
  const failures = previous.failures + 1;
  attempts[key] =
    failures >= MAX_FAILED_ATTEMPTS
      ? { failures: 0, lockedUntil: Date.now() + LOCK_DURATION_MS }
      : { failures };
  writeAttempts(attempts);
}

export async function createPinCredential(
  scope: string,
  pin: string,
): Promise<PinCredential> {
  const salt = randomSalt();
  return {
    salt,
    hash: await digest(scope, salt, pin),
    createdAt: new Date().toISOString(),
  };
}

async function verifyCredential(
  scope: string,
  credential: PinCredential | undefined,
  pin: string,
): Promise<boolean> {
  if (!credential) throw new Error("Für diesen Zugang wurde noch keine PIN festgelegt.");
  ensureNotLocked(scope);
  const candidate = await digest(scope, credential.salt, pin);
  const success = candidate === credential.hash;
  recordAttempt(scope, success);
  return success;
}

export function hasHostPin(): boolean {
  return Boolean(readRegistry().host);
}

export async function configureHostPin(pin: string): Promise<void> {
  const registry = readRegistry();
  if (registry.host) {
    throw new Error("Die Spielleiter-PIN ist bereits eingerichtet.");
  }
  registry.host = await createPinCredential("host", pin);
  writeRegistry(registry);
}

export async function verifyHostPin(pin: string): Promise<boolean> {
  return verifyCredential("host", readRegistry().host, pin);
}

export async function configurePlayerPin(
  playerId: string,
  credential: PinCredential,
): Promise<void> {
  const registry = readRegistry();
  if (registry.players[playerId]) {
    throw new Error("Für dieses Profil besteht bereits eine PIN.");
  }
  registry.players[playerId] = credential;
  writeRegistry(registry);
}

export async function verifyPlayerPin(
  playerId: string,
  pin: string,
): Promise<boolean> {
  return verifyCredential(
    `player:${playerId}`,
    readRegistry().players[playerId],
    pin,
  );
}

export function hasPlayerPin(playerId: string): boolean {
  return Boolean(readRegistry().players[playerId]);
}

export function clearPinAuth(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(ATTEMPT_STORAGE_KEY);
}
