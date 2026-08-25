-- Assignments gain an optional due date and a creation dedupe key.
--
-- 0001 is already committed, so this is a new migration rather than an edit to
-- it. Neither has been applied anywhere yet -- Phase 0 runs on the local
-- adapter -- but treating a committed migration as immutable is the habit worth
-- keeping, because the first time it matters is the first time it is skipped.
--
-- `due_at` is a soft deadline: nothing expires and nothing locks. A hard
-- deadline on a sixteen-year-old's film homework turns a workout into a
-- punishment.
--
-- `idempotency_key` is what makes a double-clicked "Create assignment" produce
-- one row instead of two. The partial unique index enforces it for real rows
-- while leaving seeded and legacy rows, which have no key, alone.

BEGIN;

ALTER TABLE assignments
  ADD COLUMN due_at          TIMESTAMPTZ,
  ADD COLUMN idempotency_key TEXT;

ALTER TABLE assignments
  ADD CONSTRAINT assignments_due_after_assigned
  CHECK (due_at IS NULL OR due_at >= assigned_at);

CREATE UNIQUE INDEX assignments_idempotency_key_idx
  ON assignments(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMIT;
