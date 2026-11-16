/* ═══════════════════════════════════════════════════════════════
   RADIANT read model — validation
   Strict, dependency-free checks for the read contracts.
   ═══════════════════════════════════════════════════════════════ */

import type { ValidTime } from "./types";

export type ReadModelErrorCode =
  | "invalid_valid_time"
  | "invalid_instant"
  | "invalid_revision"
  | "invalid_supersedes"
  | "duplicate_evidence_ref"
  | "duplicate_relation_id"
  | "node_not_found"
  | "market_anchor_is_not_event"
  | "scenario_is_not_event"
  | "observed_at_required";

export class ReadModelError extends Error {
  readonly code: ReadModelErrorCode;

  constructor(code: ReadModelErrorCode, message: string) {
    super(message);
    this.name = "ReadModelError";
    this.code = code;
  }
}

const INSTANT_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isTimezoneAwareInstant(value: string): boolean {
  return INSTANT_RE.test(value) && !Number.isNaN(Date.parse(value));
}

export function validateInstant(value: string, field: string): void {
  if (!isTimezoneAwareInstant(value)) {
    throw new ReadModelError(
      "invalid_instant",
      `${field} must be an ISO-8601 date-time with an explicit timezone`,
    );
  }
}

function assertNull(value: string | null, field: string): void {
  if (value !== null) {
    throw new ReadModelError("invalid_valid_time", `${field} must be null`);
  }
}

/**
 * Validate occurrence-time semantics.
 * - exact/estimated require a timezone-aware starts_at
 * - range requires starts_at and ends_at, end >= start
 * - day requires local_date; clock fields may be null
 * - unknown keeps every value null
 */
export function validateValidTime(validTime: ValidTime): ValidTime {
  const { precision, starts_at, ends_at, local_date, timezone } = validTime;

  if (timezone !== null && timezone.trim().length === 0) {
    throw new ReadModelError("invalid_valid_time", "timezone must be null or non-empty");
  }
  if (local_date !== null && !DATE_RE.test(local_date)) {
    throw new ReadModelError("invalid_valid_time", "local_date must be YYYY-MM-DD");
  }

  switch (precision) {
    case "exact":
    case "estimated": {
      if (starts_at === null) {
        throw new ReadModelError(
          "invalid_valid_time",
          `${precision} precision requires starts_at`,
        );
      }
      validateInstant(starts_at, "valid_time.starts_at");
      if (ends_at !== null) {
        validateInstant(ends_at, "valid_time.ends_at");
        if (Date.parse(ends_at) < Date.parse(starts_at)) {
          throw new ReadModelError(
            "invalid_valid_time",
            "valid_time.ends_at must not precede starts_at",
          );
        }
      }
      break;
    }
    case "range": {
      if (starts_at === null || ends_at === null) {
        throw new ReadModelError(
          "invalid_valid_time",
          "range precision requires starts_at and ends_at",
        );
      }
      validateInstant(starts_at, "valid_time.starts_at");
      validateInstant(ends_at, "valid_time.ends_at");
      if (Date.parse(ends_at) < Date.parse(starts_at)) {
        throw new ReadModelError(
          "invalid_valid_time",
          "valid_time.ends_at must not precede starts_at",
        );
      }
      break;
    }
    case "day": {
      if (local_date === null) {
        throw new ReadModelError("invalid_valid_time", "day precision requires local_date");
      }
      if (starts_at !== null) validateInstant(starts_at, "valid_time.starts_at");
      if (ends_at !== null) validateInstant(ends_at, "valid_time.ends_at");
      break;
    }
    case "unknown": {
      assertNull(starts_at, "valid_time.starts_at");
      assertNull(ends_at, "valid_time.ends_at");
      assertNull(local_date, "valid_time.local_date");
      assertNull(timezone, "valid_time.timezone");
      break;
    }
    default: {
      throw new ReadModelError(
        "invalid_valid_time",
        `unsupported valid_time.precision: ${String(precision)}`,
      );
    }
  }

  return {
    precision,
    starts_at,
    ends_at,
    local_date,
    timezone,
  };
}

export function validateRevisionIdentity(input: {
  revision_number: number;
  supersedes_revision_id: string | null;
  revision_id: string;
}): void {
  if (!Number.isInteger(input.revision_number) || input.revision_number < 1) {
    throw new ReadModelError("invalid_revision", "revision_number must be a positive integer");
  }
  if (input.revision_id.trim().length === 0) {
    throw new ReadModelError("invalid_revision", "revision_id must be non-empty");
  }
  if (input.revision_number === 1 && input.supersedes_revision_id !== null) {
    throw new ReadModelError(
      "invalid_supersedes",
      "supersedes_revision_id must be null on revision 1",
    );
  }
  if (input.revision_number > 1 && input.supersedes_revision_id === null) {
    throw new ReadModelError(
      "invalid_supersedes",
      "supersedes_revision_id is required after revision 1",
    );
  }
}
