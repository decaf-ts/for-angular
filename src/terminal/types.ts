/**
 * @description Kind of a terminal interaction
 * @typedef {"question" | "approval"} TerminalInteractionKind
 * @category Terminal
 */
export type TerminalInteractionKind = "question" | "approval";

/**
 * @description Lifecycle status of a terminal interaction
 * @summary Rows start `pending` and settle as `answered` (questions) or
 * `approved`/`rejected` (approvals); any pending row may become `cancelled`.
 * @typedef {"pending" | "answered" | "approved" | "rejected" | "cancelled"} TerminalInteractionStatus
 * @category Terminal
 */
export type TerminalInteractionStatus =
  | "pending"
  | "answered"
  | "approved"
  | "rejected"
  | "cancelled";

/**
 * @description One selectable answer option
 * @interface TerminalQuestionOption
 * @category Terminal
 */
export interface TerminalQuestionOption {
  /** Option label shown to the user. */
  label: string;
  /** Optional explanatory text rendered under the label. */
  description?: string;
}

/**
 * @description One structured question posed to the user
 * @interface TerminalQuestionItem
 * @category Terminal
 */
export interface TerminalQuestionItem {
  /** The question text. */
  question: string;
  /** Short heading used by the terminal surface. */
  header?: string;
  /** Selectable options; omitted for free-text answers. */
  options?: TerminalQuestionOption[];
  /** Whether more than one option may be selected. */
  multiSelect?: boolean;
  /** Whether the answer is secret and must not be echoed back. */
  secret?: boolean;
}

/**
 * @description Payload of a question interaction
 * @interface TerminalQuestionPayload
 * @category Terminal
 */
export interface TerminalQuestionPayload {
  /** Questions asked together. */
  questions: TerminalQuestionItem[];
}

/**
 * @description Answer to one {@link TerminalQuestionItem}
 * @interface TerminalQuestionAnswer
 * @category Terminal
 */
export interface TerminalQuestionAnswer {
  /** Selected option labels. */
  selected: string[];
  /** Free-text answer supplied alongside or instead of options. */
  custom?: string;
}

/**
 * @description Answers returned for a question interaction
 * @interface TerminalQuestionResult
 * @category Terminal
 */
export interface TerminalQuestionResult {
  /** One answer per question, in request order. */
  answers: TerminalQuestionAnswer[];
}

/**
 * @description Arguments of the tool awaiting approval
 * @interface TerminalApprovalArguments
 * @category Terminal
 */
export interface TerminalApprovalArguments {
  /** Shell command shown to the approver, when the tool is a shell tool. */
  command?: string;
  /** Any other tool argument; rendered as JSON by the surface. */
  [key: string]: unknown;
}

/**
 * @description Payload of an approval interaction
 * @interface TerminalApprovalPayload
 * @category Terminal
 */
export interface TerminalApprovalPayload {
  /** Name of the tool awaiting approval. */
  toolName: string;
  /** Human-readable tool description. */
  toolDescription?: string;
  /** Tool arguments shown to the approver. */
  arguments?: TerminalApprovalArguments;
  /** Why approval is required. */
  reason?: string;
}

/**
 * @description Decision returned for an approval interaction
 * @interface TerminalApprovalDecision
 * @category Terminal
 */
export interface TerminalApprovalDecision {
  /** Whether the tool call may proceed. */
  approved: boolean;
}

/**
 * @description Serialized view of one terminal interaction
 * @summary This is the wire shape returned by the harness
 * `/terminal/interactions` routes and pushed over SSE. The surface components
 * read it without any service dependency.
 * @interface TerminalInteractionSnapshot
 * @category Terminal
 */
export interface TerminalInteractionSnapshot {
  /** Interaction id. */
  id: string;
  /** Durable session the interaction belongs to. */
  sessionId: string;
  /** Whether this is a question or an approval. */
  kind: TerminalInteractionKind;
  /** Current lifecycle status. */
  status: TerminalInteractionStatus;
  /** Kind-specific request payload. */
  payload: Record<string, unknown>;
  /** Recorded answer once the interaction settles. */
  answer?: Record<string, unknown>;
  /** Cancellation or decision reason. */
  reason?: string;
  /** Creation timestamp in epoch milliseconds. */
  createdAt: number;
  /** Last update timestamp in epoch milliseconds. */
  updatedAt: number;
  /** Expiry timestamp in epoch milliseconds, when a timeout applies. */
  expiresAt?: number;
}

/**
 * @description Answer submission for a question interaction
 * @interface TerminalQuestionAnswerSubmission
 * @category Terminal
 */
export interface TerminalQuestionAnswerSubmission {
  /** Interaction id. */
  id: string;
  /** Collected answers. */
  answer: TerminalQuestionResult;
  /** Optional reason recorded with the settlement. */
  reason?: string;
}

/**
 * @description Answer submission for an approval interaction
 * @interface TerminalApprovalAnswerSubmission
 * @category Terminal
 */
export interface TerminalApprovalAnswerSubmission {
  /** Interaction id. */
  id: string;
  /** The approval decision. */
  answer: TerminalApprovalDecision;
  /** Optional reason recorded with the settlement. */
  reason?: string;
}

/**
 * @description Answer emitted by {@link TerminalSurfaceComponent}
 * @typedef {TerminalQuestionAnswerSubmission | TerminalApprovalAnswerSubmission} TerminalAnswerSubmission
 * @category Terminal
 */
export type TerminalAnswerSubmission =
  | TerminalQuestionAnswerSubmission
  | TerminalApprovalAnswerSubmission;

/**
 * @description Cancellation emitted by {@link TerminalSurfaceComponent}
 * @interface TerminalCancelRequest
 * @category Terminal
 */
export interface TerminalCancelRequest {
  /** Interaction id. */
  id: string;
  /** Optional cancellation reason. */
  reason?: string;
}
