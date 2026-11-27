#!/bin/zsh
# Fetch all Calistree datasheet pages listed in calistree-exercise-urls.txt into pages/<id>.html.
# Resumable: skips files that already exist. Polite: 4 concurrent workers, tiny stagger.
cd "$(dirname "$0")"
mkdir -p pages
cat calistree-exercise-urls.txt | xargs -P 4 -I{} /bin/zsh -c '
  u="{}"
  id="${u##*-}"
  out="pages/$id.html"
  if [ -s "$out" ]; then exit 0; fi
  curl -s --max-time 20 "$u" -o "$out" || rm -f "$out"
  sleep 0.05
'
echo "done: $(ls pages | wc -l) files"
