#!/usr/bin/env bash
#
# Nudge for the rule-carrying parts of the system.
#
# A pull request that changes the plan engine, the load/change code, the
# database schema or its migrations, the writing rules, or an AI path that
# bounds what a model may say (the shaping and reason passes and the gates that
# hold them) should also update the system map (SYSTEM.md) or record a decision
# (docs/decisions.md). Docs rot when keeping them current is left to discipline,
# so this makes it a check. It is the logic behind
# .github/workflows/system-nudge.yml.
#
# Input: the changed file paths on stdin, one per line (the workflow builds
# this with `git diff --name-only`). The `no-system-change` label, passed in
# the PR_LABELS environment variable as a comma-separated list, waives it.
#
# Exit 0 when the change is fine (or the check is waived or not yet armed),
# exit 1 with a plain message naming the path and the document to update.
#
# Bootstrap allowance: while neither SYSTEM.md nor docs/decisions.md is in the
# repo yet, the check passes with a notice. It exists to stop a rule change
# landing without a record, and there is nothing to point at until at least
# one of the documents lands.
set -euo pipefail

# Files whose change means the system's rules moved.
guard_paths=(
  "packages/shared/src/plan/engine.ts"
  "packages/shared/src/plan/load.ts"
  "packages/shared/src/plan/change.ts"
  "packages/shared/src/db/schema.ts"
  "packages/shared/src/writing.ts"
  # The AI paths that carry a rule, beyond the closed set in change.ts: the
  # shaping pass (the typed intents it keeps and the writing rules it embeds),
  # the deterministic reason composer and the gate that stops a reworded line
  # adding a number (the "a model never writes a number" boundary), and the
  # reason pass that runs the model and stores only what the gate kept.
  "apps/api/src/lib/plan-shape.ts"
  "packages/shared/src/plan/why.ts"
  "packages/shared/src/plan/why-rephrase.ts"
  "apps/api/src/lib/session-why.ts"
)
# Whole directories that count. Drizzle migrations are a separate file per
# change, so match the directory rather than each migration.
guard_prefixes=(
  "apps/api/drizzle/"
)

# The documents that carry the rules. Touching either one satisfies the check.
doc_paths=(
  "SYSTEM.md"
  "docs/decisions.md"
)

label="no-system-change"

changed="$(cat)"

# Paths that triggered the rule, for the message.
triggered=()
while IFS= read -r path; do
  [ -n "$path" ] || continue
  for g in "${guard_paths[@]}"; do
    [ "$path" = "$g" ] && triggered+=("$path")
  done
  for p in "${guard_prefixes[@]}"; do
    case "$path" in "$p"*) triggered+=("$path") ;; esac
  done
done <<<"$changed"

# Nothing rule-carrying changed: nothing to nudge.
if [ "${#triggered[@]}" -eq 0 ]; then
  exit 0
fi

# The label waives the check.
if [[ ",${PR_LABELS:-}," == *",${label},"* ]]; then
  echo "::notice::'$label' label present, skipping the system-doc nudge."
  exit 0
fi

# Touching either document satisfies the check.
while IFS= read -r path; do
  for doc in "${doc_paths[@]}"; do
    if [ "$path" = "$doc" ]; then
      exit 0
    fi
  done
done <<<"$changed"

# Bootstrap allowance: if neither document is in the repo yet, do not block.
# The documents that carry the rules are being written; until one lands there
# is nothing to keep in step, so the check stays quiet rather than guessing.
existing=()
for doc in "${doc_paths[@]}"; do
  [ -e "$doc" ] && existing+=("$doc")
done

if [ "${#existing[@]}" -eq 0 ]; then
  echo "::notice title=Bootstrap allowance::Neither SYSTEM.md nor docs/decisions.md exists yet, so the system-doc nudge is not blocking. Once either lands, a change to ${triggered[0]} will need one of them."
  exit 0
fi

# Fail with the specific path and the specific document(s) to update.
{
  echo "This pull request changes a part of the system that carries its rules:"
  printf '  %s\n' "${triggered[@]}"
  echo
  echo "Update the system map or record the decision in the same pull request:"
  printf '  %s\n' "${existing[@]}"
  echo
  echo "If the change genuinely does not alter the system, add the '$label' label instead."
} >&2

echo "::error title=System map update needed::${triggered[0]} changed without a SYSTEM.md or docs/decisions.md update. Add the '$label' label to waive the check." >&2

exit 1
