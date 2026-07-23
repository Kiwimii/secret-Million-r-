export type RoundNumber = 1 | 2 | 3 | 4;

export type GameRole = "millionaire" | "investigator" | "none";

export type WinnerPoolStatus = "eligible" | "eliminated" | "disqualified";

export type AttendanceStatus = "present" | "temporarily_absent" | "departed";

export type RegistrationStatus = "invited" | "registered";

export type TeamCode = "azur" | "gold";

export type RoundPhase =
  | "lobby"
  | "role_reveal"
  | "mission"
  | "challenge"
  | "question"
  | "discussion"
  | "mission_review"
  | "advantage"
  | "voting"
  | "evaluation"
  | "result"
  | "role_transfer"
  | "finished";

export type ExitReason =
  | "vote"
  | "early_departure"
  | "illness"
  | "voluntary"
  | "rule_violation"
  | "host_decision"
  | "other";

export type PlayerLifecycleAction =
  | "eliminate"
  | "depart"
  | "pause"
  | "return"
  | "disqualify"
  | "reinstate";

export type VoteStage = "main" | "runoff";

export type MissionStatus = "unassigned" | "assigned" | "completed" | "failed";

export type AdvantageEffect =
  | "double_vote"
  | "block_vote"
  | "add_two_votes"
  | "redirect_one_vote"
  | "add_one_vote"
  | "ignore_eliminated_vote"
  | "protect_other"
  | "tie_priority"
  | "remove_vote_against_self"
  | "redirect_selected_vote"
  | "bounce_vote_to_voter"
  | "split_shadow_votes"
  | "move_vote_between_targets"
  | "conditional_shadow_vote"
  | "cap_target_votes"
  | "self_tie_break";

export type AdvantageSelectionMode =
  | "none"
  | "target"
  | "voter"
  | "target_and_voter"
  | "two_targets"
  | "source_and_target"
  | "tie_opponent";

export interface PlayerState {
  id: string;
  name: string;
  avatarUrl?: string;
  registrationStatus?: RegistrationStatus;
  profilePinHint?: string;
  attendanceStatus: AttendanceStatus;
  winnerPoolStatus: WinnerPoolStatus;
  role: GameRole;
  points: number;
  correctGuesses: number;
  lastCorrectGuessRound?: RoundNumber;
  eliminatedInRound?: RoundNumber;
  departedInRound?: RoundNumber;
  exitReason?: ExitReason;
  exitNote?: string;
}

export interface PlayerCapabilities {
  eligibleToWin: boolean;
  canVote: boolean;
  canJoinChallenges: boolean;
  canBeMillionaire: boolean;
}

export interface RoundDefinition {
  number: RoundNumber;
  title: string;
  timing: string;
  points: number;
}

export interface MissionDefinition {
  id: string;
  title: string;
  task: string;
  successCriteria: string;
  timeWindow: string;
  hostInstructions?: string;
  difficulty?: "leicht" | "mittel" | "riskant";
  suitablePhases?: string;
  round?: RoundNumber;
  reserve: boolean;
}

export interface AdvantageDefinition {
  id: string;
  title: string;
  effect: AdvantageEffect;
  description: string;
  limit: string;
  playerInstructions: string;
  hostInstructions: string;
  selectionMode: AdvantageSelectionMode;
  round?: RoundNumber;
  reserve: boolean;
  isNew?: boolean;
}

export interface ChallengeDefinition {
  id: string;
  title: string;
  publicName: string;
  category: "classic" | "skill" | "teamwork" | "water" | "mind" | "trade";
  duration: string;
  material: string[];
  playerBriefing: string;
  hostInstructions: string;
  winCondition: string;
  safetyNote: string;
  original: boolean;
}

export interface TeamAssignment {
  playerId: string;
  team: TeamCode;
}

export interface Vote {
  voterPlayerId: string;
  accusedPlayerId: string;
  stage: VoteStage;
}

export interface AdvantageUse {
  advantageId: string;
  effect: AdvantageEffect;
  actorPlayerId: string;
  targetPlayerId?: string;
  secondaryTargetPlayerId?: string;
  sourceTargetPlayerId?: string;
  voterPlayerId?: string;
  tieOpponentPlayerId?: string;
}

export interface VoteTallyEntry {
  playerId: string;
  regularVotes: number;
  adjustment: number;
  effectiveVotes: number;
}

export interface VoteEvaluation {
  tally: VoteTallyEntry[];
  topPlayerIds: string[];
  requiresRunoff: boolean;
  eliminatedPlayerId?: string;
  ignoredVoterPlayerIds: string[];
}

export interface RoundOutcome {
  round: RoundNumber;
  millionairePlayerId: string;
  eliminatedPlayerId: string;
  millionaireSurvived: boolean;
  pointRecipientPlayerIds: string[];
  correctGuessPlayerIds: string[];
  tally: VoteTallyEntry[];
  advantageId?: string;
}

export interface GameState {
  id: string;
  currentRound: RoundNumber;
  phase: RoundPhase;
  players: PlayerState[];
  millionairePlayerId?: string;
  revision: number;
  roundOutcomes: RoundOutcome[];
}

export interface PlayerLifecycleChange {
  playerId: string;
  action: PlayerLifecycleAction;
  reason?: ExitReason;
  note?: string;
  effectiveRound?: RoundNumber;
}

export interface LifecycleChangeResult {
  state: GameState;
  requiresMillionaireReplacement: boolean;
  blocksProgress: boolean;
  warnings: string[];
}

export interface NextGameStep {
  round: RoundNumber;
  phase: RoundPhase;
}

export interface FinalWinnerResolution {
  winnerPlayerId?: string;
  requiresLot: boolean;
  tiedPlayerIds: string[];
  reason: "millionaire_survived" | "points" | "correct_guesses" | "later_correct_guess" | "lot";
}
