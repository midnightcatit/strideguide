# The category tile button is under the 44px tap target

From CodeRabbit on PR #300 (thread
[PRRT_kwDOV3qHEs68qY93](https://github.com/midnightcatit/strideguide/pull/300#discussion_r4716161127)).

**Finding.** The category tile button in the onboarding preview
(`apps/web/src/routes/onboarding/+page.svelte`, the button around line 1071)
sets no minimum height and no vertical padding, and the shared button styles
in `apps/web/src/app.css` do not supply a minimum size either. The `py-1` on
the parent chip does not enlarge the button. At `text-sm` the button is about
20 pixels tall, well under the repo's 44px minimum for phone targets.

**Why deferred.** It was missed by the tap-target round, which covered the
card's close button, and the PR merged before the finding was read. Non
blocking: every other control on the preview meets the minimum.

**Pick it up when.** The preview or the shared button styles are touched
next. The fix is one class: add the shared `tap-target` class to the tile
button, the same treatment the close button already has.
