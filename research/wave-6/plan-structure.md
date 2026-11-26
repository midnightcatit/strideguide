# How running training plans are actually structured

A wave-6 note on the shape of training weeks, so the plan engine can be built on
what coaches and studies actually do rather than on rules of thumb we invented.
The immediate trigger for it is a question from the owner: if a runner races 13.1
miles, should the plan hand them a 1.2 mile run the next day? That specific idea
(a fixed fraction, here about ten percent, of the long run or race) does not appear
in the coaching literature or the studies, and the sections below explain what is
recommended instead. Each section separates what is well evidenced from what is
coaching convention, and notes where sources disagree.

## 1. Weekly structure: how many quality sessions, and how they are spaced

The number of hard sessions a week is the clearest structural decision, and the
main sources agree on one or two.

- **Marathon.** Jack Daniels' marathon plans are built around exactly two quality
  days a week, which is why they are called the 2Q plans, with all other running
  left easy (Daniels, *Daniels' Running Formula*; summarized in the fellrnr wiki).
  Pete Pfitzinger's marathon system similarly anchors each week on a lactate
  threshold session plus a long or medium-long run, with the rest general aerobic
  (Pfitzinger and Douglas, *Advanced Marathoning*, 4th edition, 2026). Hal Higdon's
  novice marathon plan has no true quality session at all beyond the weekend long
  run, and his Intermediate 1 adds a single midweek pace run (Higdon, Novice 1 and
  Intermediate 1 marathon programs).
- **Half marathon.** Higdon's Novice 1 half is again all easy running plus the long
  run. His intermediate plans add one hard day, usually alternating intervals and
  tempo (Higdon, half marathon and 10K intermediate programs).
- **10K and 5K.** Short-race plans keep one interval or repetition session and one
  threshold or tempo session. Higdon's Intermediate 10K has one hard Wednesday
  (400 m repetitions alternating with tempo) plus a weekend long run. His
  Intermediate 5K adds a Saturday "fast" run as well, so two controlled efforts a
  week plus the long run (Higdon, 5K and 10K intermediate programs). Daniels'
  shorter-distance plans use interval (I) and repetition (R) work in the same
  one-to-two quality sessions a week model.
- **Beginner versus intermediate.** The beginner pattern is lower frequency, not
  more quality: two rest days, four runs, and a long run. Intermediate runners add
  one hard day and a little more volume (Higdon, at-a-glance notes on the novice
  and intermediate programs).

On spacing, the widely repeated claim is that hard sessions should be about 48
hours apart. The evidence for the exact figure is thin, but the practice is
consistent across the coaching sources. Daniels writes that a runner should "make
an effort to always have 2 or 3 E days between Q days," which is 72 hours or more,
not 48 (quoted from the book in the r/AdvancedRunning plan review). Higdon states
that muscle regeneration happens in "the 24 to 72 hours between hard bouts of
exercise" (Higdon, marathon programs). **Coaching convention, not trial evidence:**
the 48 to 72 hour gap. What is well evidenced is the underlying reason: exercise
that causes muscle damage reduces strength and range of motion for one to two days
afterwards, and athletes who train daily "should be encouraged to reduce the
intensity and duration of exercise for 1-2 days" afterwards (Cheung, Hume and
Maxwell 2003, *Sports Med*, a widely cited DOMS review). So the spacing rule is
reasonable and evidence-adjacent, but treat the exact number as convention.

One caution where sources diverge: Higdon's Intermediate 1 marathon plan
deliberately puts a marathon-pace run on Saturday and the long run on Sunday, two
hard days back to back, and defends it as intentional (Higdon). Daniels and most
other systems keep two or three easy days between quality sessions. So back-to-back
hard days are a real, if minority, practice, not an error.

## 2. The day after a long run

The options in the literature are rest, a genuinely easy run, or cross-training.
A very short run is the option with the least support.

**What a recovery run is, when it is used.** A recovery run is defined as a short,
very easy run the day after a hard session or long run, typically 20 to 40 minutes
at an effort low enough to keep heart rate below roughly 65 to 70 percent of
maximum and to stay fully conversational (Run Briefing glossary; The Running
Algorithm). Higdon instead has runners cross-train the day after long runs for 30
to 60 minutes, "to help you recover," and rests the day before (Higdon).

**Does it work?** The evidence that a recovery run speeds recovery is mixed.
A systematic review with meta-analysis found light activity after exercise slightly
reduces muscle soreness, though other methods did better (Dupuy et al. 2018,
*Frontiers in Physiology*). A narrative review of cool-downs found them largely
ineffective for improving same-day or next-day performance and for injury
prevention, though not harmful to long-term training gains (Van Hooren and Peake
2018, *Sports Medicine*). The reliable benefit of a recovery run is that it adds
easy aerobic volume, and elite endurance athletes do about 80 percent of their
training at low intensity (Seiler 2010, *IJSPP*). It is a way to add easy miles,
not a proven recovery accelerator.

**So what about the 1.2 mile example?** Two problems. First, it is below the range
the sources give for a useful recovery run. At 20 to 40 minutes, a recovery run is
roughly 2.5 to 5 km for most runners; a 1.2 mile jog is about 12 to 20 minutes and
falls under it, which means it is too short to be a meaningful aerobic stimulus and
no better evidenced than rest. Second, there is no source that ties the next day's
distance to a fraction of the long run or race distance. Where coaching guidance
does scale the day after a hard effort, it scales **intensity and duration down for
one to two days** (Cheung et al. 2003), or it prescribes rest or cross-training
(Higdon), not a token fixed distance.

The practical read: the day after a long run should be rest, cross-training, or an
easy run of a real recovery length (about 20 to 40 minutes), chosen by individual
preference and training age. For runners doing low weekly volume, rest is usually
the better call. The Running Algorithm is blunt that a recovery run "is almost
never a sensible addition" for a runner at 25 to 35 km a week, while McMillan notes
that most runners benefit from at least one or two recovery days per week. The
1.2 mile idea is not supported; it is the kind of invented rule this note is meant
to retire.

## 3. Long run placement

Across every source, the long run is the week's anchor and the rest of the week is
arranged around it.

- It sits at the weekend, usually Saturday or Sunday, with a rest or easy day
  before it and rest, easy running or cross-training after (Higdon, all programs).
- It is often itself a quality session, so it does not need a separate hard day
  beside it. Daniels' 2Q plans make the long run one of the two quality days,
  frequently with segments at marathon or threshold pace (fellrnr, Daniels 2Q).
  Pfitzinger's long runs similarly progress toward marathon pace (Pfitzinger
  Coaching; Pfitzinger and Douglas).
- **Back-to-back with a quality day** happens, but it is a specific choice, not the
  default. Higdon's Intermediate 1 marathon plan runs a pace session the day before
  the long run on purpose: the pace run is placed first so the runner is tired
  enough not to run the long run too fast (Higdon). Most systems avoid it. Daniels
  puts two or three easy days around quality sessions. The safe default for a
  general-purpose engine is to keep the long run away from the hardest quality day,
  because the long run is already the highest single-session load.

## 4. Mileage distribution across days

The "spread the week's volume evenly across the available days" idea does not hold
up. Real plans weight the week toward one long run.

- **The long run is a large share.** A compiled survey of coaching guidance found
  loose agreement that the long run should be about 20 to 30 percent of weekly
  volume, with individual estimates ranging from 20 percent up to 50 percent,
  and most sources warning against going over roughly 50 percent (Strength
  Running). Worked examples sit inside and above that range depending on volume.
- **At low volume the long run dominates.** Higdon's Novice 1 marathon week 15 is
  5 + 10 + 5 plus a 20 mile long run, so 40 miles with the long run at 50 percent.
  Higdon says this directly: "you run roughly the same mileage during the week as
  you do during long runs on the weekends."
- **At higher volume the week spreads out.** Pfitzinger distributes substantial
  aerobic work into a midweek medium-long run of about 11 to 15 miles in the
  higher schedules, in addition to the long run, so no single day carries the
  week (Pfitzinger and Douglas; The Steady Split's summary).

The rule that holds up: weight the week toward the long run, allow one medium-long
run on a non-consecutive day once volume supports it, and keep the remaining days
genuinely easy and clearly shorter than the long run. Even distribution is not what
real plans do.

## 5. Volume versus the long run

The long run is a bigger share of the week at low volume and a smaller share at
high volume, which is the opposite of a fixed fraction.

- **Around 25 percent at high volume.** Pfitzinger's top marathon tier peaks near
  74 to 84 miles a week with a long run of about 20 to 22 miles, roughly a quarter
  (Pfitzinger Coaching; Pfitzinger and Douglas). His plans allow long runs up to 24
  miles in the 18-week high-volume schedules.
- **Roughly 35 to 50 percent at low volume.** Pfitzinger's Level 1 marathon plan
  builds to 34 to 40 miles with a long run of 31 to 34 km, close to half. Higdon's
  novice marathon again lands near 50 percent.
- **The long run grows in absolute terms but rarely past about 32 km (20 miles) or
  about three hours** in the plans reviewed. Higdon caps his marathon long run at
  20 miles and says he sees no advantage in 23, 26 or 31 mile runs (Higdon).
  Pfitzinger's lower tiers stop around 18 to 20 miles and the high-volume ones top
  out around 22 to 24 (Pfitzinger and Douglas). For half marathon training the
  ceilings are lower again (Higdon peaks the half at 10 miles; Pfitzinger's half
  plans progress long runs into the mid-teens).

So the engine constant should be a share that falls as weekly volume rises, not a
fixed percentage and not a fixed distance. A defensible band is 25 to 30 percent at
moderate to high volume, rising toward 35 to 50 percent at low beginner volume,
with a hard ceiling near 50 percent and a practical distance cap around 32 km or
three hours for the marathon.

## 6. Starting volume and progression

The entered weekly volume should be read as **the starting point the plan ramps up
from, not a ceiling.** Pfitzinger's guidance is to choose a plan "from your recent
training, not your goal time," so the opening weeks "look like a modest extension
of your established routine" (The Steady Split's summary of Pfitzinger and
Douglas). Higdon's programs likewise assume a base (for the half, the ability to run
3 miles three or four times a week) and build from it.

On how fast to grow, the evidence is weaker than the folklore. The famous "10
percent rule" is coaching convention, not a settled finding. The best prospective
evidence is a one-year cohort of 874 novice runners: injury rates did not differ
significantly across groups that progressed less than 10 percent, 10 to 30 percent,
or more than 30 percent over two weeks, but runners who progressed by **more than
30 percent over two weeks** had a higher rate of distance-related injuries (hazard
ratio 1.59, not statistically significant at p = 0.07) (Nielsen et al. 2014,
*JOSPT*). The authors' own summary is that novice runners "may be well advised to
progress their weekly distances by less than 30 percent per week over a 2-week
period." That supports a conservative ramp aimed near 10 percent a week and a hard
cap well under 30 percent per two weeks, while being honest that the "10 percent"
figure itself is not proven. McMillan frames the same idea as "patient progressive
overload," noting that the musculoskeletal system adapts more slowly than the
cardiovascular system, which is why runners get injured while feeling fit
(McMillan).

**Stepback weeks.** Cutting volume every third or fourth week is standard
convention. Higdon says "every third week is a stepback week, where we reduce
mileage to allow you to gather strength" (Higdon, marathon programs). Pfitzinger
uses "strategically planned recovery weeks" through the build (Pfitzinger
Coaching). There is no head-to-head trial proving stepbacks beat steady ramps, so
treat the cadence as convention, but it is near-universal among the sources.

**Taper.** This is the best-evidenced part of plan structure. A meta-analysis of 27
studies found the optimal taper is about two weeks, with training volume
exponentially reduced by 41 to 60 percent while keeping intensity and frequency
(Bosquet et al. 2007, *Med Sci Sports Exerc*). A later meta-analysis of 14 studies
agreed: a taper of up to 21 days that reduces volume by 41 to 60 percent without
changing intensity or frequency improves time-trial performance (Wang et al. 2023,
*PLoS One*). Both are clear: cut volume, keep intensity and frequency.

## 7. Rest days

The sources settle on one or two true rest days a week for most runners, more for
beginners.

- Higdon's novice plans use two rest days (Monday and Friday) plus cross-training;
  his marathon Intermediate 1 uses one rest day plus a cross-training day, and his
  intermediate 5K uses two (Higdon).
- McMillan states that "most runners benefit from at least one or two recovery days
  per week," with more needed by newer runners and during heavier mileage
  (McMillan).
- At the highest volumes plans keep running most days but keep the easy days
  genuinely easy, and effort is organized so hard and easy alternate. Daniels
  leaves the number of running days to the runner and notes that three or four days
  a week is workable, especially at low volume (fellrnr, Daniels).

**Zero-rest weeks.** No source reviewed recommends a week with no rest day. The
high-frequency plans still rely on easy days, cross-training, and stepback weeks to
manage fatigue. The one principled exception is that an "easy" day can be extremely
easy rather than fully off; but "no rest and no easy days" is not a structure any
of these systems uses. There is no trial evidence that a zero-rest week is
beneficial, so an engine should not schedule one.

## Constants and rules the engine could adopt

Each item names its source. Treat the peer-reviewed lines as firm and the coaching
lines as convention to be tuned.

1. **Quality sessions per week:** 2 for 5K and 10K and for intermediate runners,
   1 to 2 for half and marathon, 0 to 1 for beginners. Long run counts as a
   quality day when it carries pace work. (Daniels 2Q; Pfitzinger and Douglas;
   Higdon plans.)
2. **Spacing of hard sessions:** leave 2, and preferably 3, easy days between
   quality sessions (about 72 hours). (Daniels, quoted in the 2Q review; supported
   in spirit by the 1 to 2 day impairment window in Cheung et al. 2003.)
3. **The day after a long run:** rest, cross-train for 30 to 60 minutes, or run
   easily for 20 to 40 minutes below about 65 to 70 percent HRmax. Do not schedule
   a token sub-15-minute run. (Higdon; Run Briefing; The Running Algorithm; Dupuy
   et al. 2018.)
4. **Next-day distance is not a fraction of the long run or race.** Scale intensity
   and duration down for 1 to 2 days instead, or rest. (Cheung et al. 2003; absence
   of any fractional rule in the coaching sources.)
5. **Long run share of weekly volume:** about 25 to 30 percent at moderate to high
   volume, rising to about 35 to 50 percent at low beginner volume, hard ceiling
   near 50 percent. (Strength Running survey; Higdon worked examples; Pfitzinger
   tiers.)
6. **One long run per week, plus at most one medium-long run** on a
   non-consecutive day once weekly volume supports it (about 11 to 15 miles when
   weekly volume is in the 55-mile region). (Pfitzinger and Douglas.)
7. **Keep the long run off the hardest quality day** unless deliberately stacking,
   since the long run is already the heaviest single session. (Daniels spacing;
   Higdon flags its stack as an intentional exception.)
8. **Long run ceiling:** about 32 km or three hours for marathon training, less for
   shorter goals. (Higdon 20-mile cap; Pfitzinger 18 to 24 mile tiers.)
9. **Weekly volume progression:** start from the entered volume and ramp; aim near
   10 percent a week and keep any two-week rise well under 30 percent. (Nielsen et
   al. 2014; McMillan.)
10. **Stepback:** reduce volume every third or fourth week. (Higdon every third
    week; Pfitzinger recovery weeks.)
11. **Taper:** cut volume 41 to 60 percent over about two weeks (up to 21 days),
    keep intensity and frequency unchanged. (Bosquet et al. 2007; Wang et al.
    2023.)
12. **Rest days:** 1 to 2 per week for most runners, more for beginners and at
    higher injury risk. (McMillan; Higdon.)
13. **Easy share:** roughly 80 percent of weekly running at low intensity. (Seiler
    2010.)
14. **No zero-rest weeks** scheduled by default. (No source recommends one.)

## What is a judgement call, not a settled finding

Some of this is real evidence and some is professional consensus that has never
been tested head to head. The engine should expose these as tunable, not fixed:

- **The exact spacing number.** Whether hard sessions are 48, 72 or more hours
  apart is convention. The evidence supports a reduced-load window of one to two
  days after muscle-damaging work, not a specific 48-hour rule.
- **Rest versus recovery run versus cross-training** the day after the long run.
  All three are defensible; the choice is individual. The only firm point is that a
  very short run is not better evidenced than the alternatives.
- **Stacking a quality day next to the long run.** Higdon does it on purpose; most
  systems avoid it. The engine can support both but should not present either as
  proven.
- **The long run percentage at a given volume.** The 20 to 50 percent spread in the
  sources shows this is genuinely unsettled; a falling share with volume is a
  defensible shape, not a measured law.
- **The 10 percent progression figure.** Evidence supports staying under about 30
  percent per two weeks and does not confirm 10 percent as special.
- **Stepback cadence and depth.** Every-third versus every-fourth week, and by how
  much, is convention with no trial backing it.
- **Zero-rest weeks.** No evidence either way; convention says do not schedule one,
  but this is not a tested finding.
- **The very short run (the 1.2 mile case).** No study asks this specific question,
  so the conclusion here is an inference from the recovery-run duration range and
  the absence of any fractional rule, not a direct result.

## Sources

- Daniels, Jack. *Daniels' Running Formula*. Plan structure and the "2 or 3 E days
  between Q days" spacing. Summarized in the fellrnr wiki entry on Jack Daniels and
  in an r/AdvancedRunning plan review of the 2Q marathon plan.
- Pfitzinger, Pete, and Scott Douglas. *Advanced Marathoning*, 4th edition. Human
  Kinetics, 2026. Medium-long runs, lactate-threshold and long-run structure,
  mileage tiers, recovery weeks. Summarized at Pfitzinger Coaching (Marathon Plans)
  and The Steady Split.
- Higdon, Hal. Training programs at halhigdon.com: Novice 1 and Intermediate 1
  Marathon, Novice 1 Half Marathon, Intermediate 10K, Intermediate 5K. Rest days,
  long run placement, stepback weeks, the 24 to 72 hour recovery claim, and the
  back-to-back pace-run-and-long-run design of Intermediate 1.
- McMillan, Greg. "Recovery Days: Why Less Can Mean More" and "'Patient'
  Progressive Overload," mcmillanrunning.com. One to two recovery days per week and
  the slow adaptation of the musculoskeletal system.
- Magill, Pete. *Build Your Running Body*. Coaching reference on run-frequency and
  recovery practice (book, not fetched for this note).
- Seiler, Stephen. "What is best practice for training intensity and duration
  distribution in endurance athletes?" *Int J Sports Physiol Perform* 2010;
  5(3):276-291. PubMed 20861519. The roughly 80 percent low-intensity share.
- Cheung K, Hume P, Maxwell L. "Delayed onset muscle soreness: treatment strategies
  and performance factors." *Sports Med* 2003;33(2):145-164. PMID 12617692. The 1 to
  2 day reduced-load window after muscle-damaging exercise.
- Dupuy O et al. "An evidence-based approach for choosing post-exercise recovery
  techniques to reduce markers of muscle damage, soreness, fatigue and
  inflammation: a systematic review with meta-analysis." *Front Physiol* 2018;9:403.
  doi:10.3389/fphys.2018.00403.
- Van Hooren B, Peake JM. "Do we need a cool-down after exercise? A narrative
  review." *Sports Med* 2018;48(7):1575-1595. doi:10.1007/s40279-018-0916-2.
- Nielsen RØ et al. "Excessive progression in weekly running distance and risk of
  running-related injuries: an association which varies according to type of
  injury." *J Orthop Sports Phys Ther* 2014;44(10):739-747. PMID 25155475.
  doi:10.2519/jospt.2014.5164.
- Bosquet L, Montpetit J, Arvisais D, Mujika I. "Effects of tapering on performance:
  a meta-analysis." *Med Sci Sports Exerc* 2007;39(8):1358-1365. PMID 17762369.
- Wang Z, Wang YT, Gao W, Zhong Y. "Effects of tapering on performance in endurance
  athletes: a systematic review and meta-analysis." *PLoS One* 2023;18(5):e0282838.
  PMID 37163550. doi:10.1371/journal.pone.0282838.
- Strength Running (Jason Fitzgerald). "How long should my long run be relative to
  my weekly mileage?" Compilation of the 20 to 50 percent range of long-run shares.
- Run Briefing glossary, "Recovery Run," and The Running Algorithm, "Recovery Runs
  are NOT a waste of time" and "Recovery Runs Are a Waste of Time." Recovery-run
  duration, effort, and the case for and against them at low volume.
