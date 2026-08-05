export type MetaAccessRole = "host" | "player";
export type MetaPhase =
  | "lobby"
  | "round_setup"
  | "role_released"
  | "mission"
  | "challenge"
  | "mission_review"
  | "voting_open"
  | "reveal_ready"
  | "report"
  | "role_decision"
  | "finished";

export type AttendanceStatus = "present" | "temporarily_absent" | "departed";
export type CompetitionStatus = "eligible" | "eliminated" | "disqualified";
export type TeamCode = "azur" | "gold";
export type MissionStatus = "pending" | "completed" | "failed" | "neutral";
export type FinalRule = "classic" | "points";
export type NotesVisibility = "host" | "private";

export type EffectKind =
  | "none"
  | "double_own_vote"
  | "block_voter"
  | "redirect_vote"
  | "add_vote"
  | "remove_self_vote"
  | "cancel_own_vote"
  | "add_vote_against_self"
  | "points_bonus"
  | "points_penalty";

export interface MetaIdentity {
  accessRole: MetaAccessRole;
  gameId: string;
  joinCode: string;
  memberId?: string;
}

export interface MetaMember {
  id: string;
  displayName: string;
  avatarPath?: string;
  joinedRound: number;
  activeFromRound: number;
  attendanceStatus: AttendanceStatus;
  competitionStatus: CompetitionStatus;
  eliminatedRound?: number;
  departedRound?: number;
  points?: number;
  currentTeam?: TeamCode;
  voteSubmitted?: boolean;
  lastSeenAt?: string;
}

export interface MissionDefinition {
  catalogId?: string;
  title: string;
  task: string;
  successCriteria: string;
  timeWindow: string;
  difficulty?: "leicht" | "mittel" | "anspruchsvoll";
  minPlayers?: number;
  requirements?: string;
  restriction?: string;
  centralNote?: string;
  tags?: string[];
}

export interface EffectDefinition {
  catalogId?: string;
  kind: EffectKind;
  title: string;
  description: string;
  amount?: number;
  selectionMode?: "none" | "target" | "voter" | "source_and_target";
}

export interface ChallengeDefinition {
  catalogId?: string;
  title: string;
  briefing: string;
  winCondition: string;
  duration?: string;
  material?: string;
  safety?: string;
  category?: string;
  minPlayers?: number;
  drinkRule?: string;
  centralNote?: string;
  tags?: string[];
}

export interface VoteTallyEntry {
  memberId: string;
  regularVotes: number;
  adjustment: number;
  effectiveVotes: number;
}

export interface RoundResult {
  millionaireId: string;
  eliminatedId: string;
  millionaireSurvived: boolean;
  regularTally: VoteTallyEntry[];
  effectiveTally: VoteTallyEntry[];
  missingVoterIds: string[];
  effect?: EffectDefinition & { selection?: Record<string, string> };
  tieResolvedBy?: "none" | "lot";
  published?: boolean;
}

export interface MetaRoundState {
  number: number;
  points: number;
  millionaireId?: string;
  roleReleased?: boolean;
  mission?: MissionDefinition;
  bonus?: EffectDefinition;
  malus?: EffectDefinition;
  missionPublished?: boolean;
  missionStatus?: MissionStatus;
  challenge?: ChallengeDefinition;
  challengePublished?: boolean;
  teams?: Record<string, TeamCode>;
  winningTeam?: TeamCode;
  effectSelection?: Record<string, string>;
  votingOpenedAt?: string;
  votingClosedAt?: string;
  result?: RoundResult;
  resultPublished?: boolean;
  roleDecision?: "keep" | "transfer";
}

export interface MetaEvent {
  id: number;
  roundNumber?: number;
  eventType: string;
  title: string;
  body: string;
  severity: "info" | "important" | "critical";
  createdAt: string;
  read: boolean;
  payload?: Record<string, unknown>;
}

export interface MetaNote {
  subjectMemberId: string;
  note: string;
  updatedAt?: string;
}

export interface PersonalRoundHistory {
  roundNumber: number;
  role: "millionaire" | "investigator" | "none";
  team?: TeamCode;
  voteTargetId?: string;
  correctGuess?: boolean;
  pointsAwarded: number;
  eliminatedId?: string;
  millionaireId?: string;
  missionTitle?: string;
  missionStatus?: MissionStatus;
}

export interface MetaGameView {
  gameId: string;
  title: string;
  joinCode: string;
  totalRounds: number;
  currentRound: number;
  phase: MetaPhase;
  revision: number;
  acceptingPlayers: boolean;
  finalRule: FinalRule;
  notesVisibility: NotesVisibility;
  isHost: boolean;
  memberId?: string;
  members: MetaMember[];
  currentRoundState: MetaRoundState;
  rounds?: Record<string, MetaRoundState>;
  ownRole?: "millionaire" | "investigator" | "none";
  ownPoints?: number;
  ownVoteDraft?: string;
  ownVote?: string;
  ownNotes?: MetaNote[];
  notifications: MetaEvent[];
  personalHistory?: PersonalRoundHistory[];
  hostVotes?: Array<{ voterId: string; targetId: string; submittedAt: string }>;
  hostNotes?: Array<MetaNote & { authorMemberId: string }>;
  finalResult?: {
    winnerId?: string;
    reason: string;
    leaderboard: Array<{ memberId: string; points: number; correctGuesses: number }>;
    timeline: Array<{
      roundNumber: number;
      millionaireId?: string;
      eliminatedId?: string;
      mission?: MissionDefinition;
      missionStatus?: MissionStatus;
      winningTeam?: TeamCode;
      effect?: EffectDefinition & { selection?: Record<string, string> };
      votes: Array<{ voterId: string; targetId: string }>;
      scores: Array<{ memberId: string; pointsAwarded: number; correctGuess: boolean }>;
    }>;
  };
}

export interface RoundPackageInput {
  mission: MissionDefinition;
  bonus: EffectDefinition;
  malus: EffectDefinition;
  challenge: ChallengeDefinition;
}
