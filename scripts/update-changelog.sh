#!/usr/bin/env bash
#
# Insert merged pull request entries into CHANGELOG.md under a date heading.
#
# Reads entry lines on stdin, one per line (already formatted by the workflow,
# for example "- Fix the thing (#123)"), and writes the new file to stdout. The
# existing file is the first argument (default CHANGELOG.md); it is never
# modified in place, the caller moves the output over it.
#
# Entries are newest first. If a heading for the date already exists, new
# entries go directly under it; otherwise a new heading is inserted before the
# first existing date heading, so the newest day stays on top.
#
# CHANGELOG_DATE overrides the date, for testing only.
set -euo pipefail

file="${1:-CHANGELOG.md}"
date="${CHANGELOG_DATE:-$(date -u +%F)}"

# Collect the entries, dropping blank lines.
entries="$(mktemp)"
trap 'rm -f "$entries"' EXIT
while IFS= read -r line || [ -n "$line" ]; do
  if [ -n "$line" ]; then
    printf '%s\n' "$line" >> "$entries"
  fi
done

# Nothing to record: leave the file as it is.
if [ ! -s "$entries" ]; then
  [ -f "$file" ] && cat "$file"
  exit 0
fi

# First run: create the file with a title and today's section.
if [ ! -f "$file" ]; then
  printf '# Changelog\n\n## %s\n' "$date"
  cat "$entries"
  exit 0
fi

if grep -qxF "## $date" "$file"; then
  # Today already has a heading: put the new entries directly under it, so the
  # newest entry sits at the top of the day.
  awk -v heading="## $date" -v ef="$entries" '
    { print }
    !done && $0 == heading {
      while ((getline l < ef) > 0) print l
      close(ef)
      done = 1
    }
  ' "$file"
else
  # New day: insert before the first existing date heading, or at the end.
  awk -v heading="## $date" -v ef="$entries" '
    !done && /^## / {
      print heading
      while ((getline l < ef) > 0) print l
      close(ef)
      print ""
      done = 1
    }
    { print }
    END {
      if (!done) {
        print ""
        print heading
        while ((getline l < ef) > 0) print l
      }
    }
  ' "$file"
fi
