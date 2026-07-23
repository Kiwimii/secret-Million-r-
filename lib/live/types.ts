import type {
  AttendanceStatus,
  GameRole,
  RoundNumber,
  RoundPhase,
  TeamCode,
  WinnerPoolStatus,
} from "@/lib/game/types";

export type LiveAccessRole = "host" | "player";

export interface LiveSessionIdentity {
  accessRole: LiveAccessRole;
  joinCode: string;
  gameId: string;
  memberId?: string;
}

export interface LiveGameSummary {
  gameId: string;
  title: string;
  joinCode: string;
  currentRound: RoundNumber;
  phase: RoundPhase;
  revision: number;
  acceptingPlayers: boolean;
  isHost: boolean;
  memberId?: string;
}

export interface LiveLobbyMember {
  memberId: string;
  displayName: string;
  avatarPath?: string;
  attendanceStatus: AttendanceStatus;
  winnerPoolStatus: WinnerPoolStatus;
  profileCompleted: boolean;
  challengeTeam?: TeamCode;
}

export interface LivePlayerProgress extends LiveLobbyMember {
  screenKey: string;
  stepKey: string;
  phaseSeen: RoundPhase;
  roleRevealed: boolean;
  missionOpened: boolean;
  advantageOpened: boolean;
  challengeBriefingOpened: boolean;
  voteSubmitted: boolean;
  roleDecisionSubmitted: boolean;
  lastSeenAt?: string;
  currentRole: GameRole;
  online: boolean;
}

export interface LiveChallengeRound {
  catalogId: string;
  title: string;
  publicName: string;
  playerBriefing: string;
  hostInstructions: string;
  duration: string;
  material: string[];
  winCondition: string;
  safetyNote: string;
  winningTeam?: TeamCode;
}

export interface LiveMissionSelection {
  catalogId: string;
  title: string;
  task: string;
  successCriteria: string;
  timeWindow: string;
}

export interface LivePrivateState {
  memberId: string;
  role?: GameRole;
  roleRevealedAt?: string;
  mission?: {
    catalog_id: string;
    title_snapshot: string;
    task_snapshot: string;
    success_criteria_snapshot: string;
    time_window_snapshot: string;
    status: string;
  };
  advantage?: Record<string, unknown>;
  ownVote?: {
    accusedMemberId: string;
    stage: string;
    submittedAt: string;
  };
}

export interface LivePresencePayload {
  userId: string;
  memberId?: string;
  accessRole: LiveAccessRole;
  screenKey: string;
  stepKey: string;
  phaseSeen: RoundPhase;
  trackedAt: string;
}

export interface LiveProgressPatch {
  screenKey: string;
  stepKey: string;
  phaseSeen: RoundPhase;
  roleRevealed?: boolean;
  missionOpened?: boolean;
  advantageOpened?: boolean;
  challengeBriefingOpened?: boolean;
  voteSubmitted?: boolean;
  roleDecisionSubmitted?: boolean;
}
