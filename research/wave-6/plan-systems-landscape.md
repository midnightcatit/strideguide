# How leading running and training products build and adapt plans, and where our engine stands

A wave-6 landscape note. Its job is to be the yardstick for Stride Guide's plan
and coaching pipeline: what the serious products actually do, what the evidence
says, and where our current pipeline is at par, behind or ahead. The owner's
fear is specific and fair: that we may be building his own off-hand suggestions
into the engine rather than what the best products and the research do. This
document exists so a future change has something to argue with.

## How to read this

Every claim is marked **documented** (a source was fetched and is quoted),
**inference** (reasoned from documented material), or **not found** (nothing
public could be verified). Marketing copy is treated as a claim, not evidence,
and is labelled as such. Where a product publishes no method, that absence is
recorded rather than papered over. The research was done with `webfetch` first;
publisher pages behind JavaScript or cookie walls were reached through the
Europe PMC REST API or, in a few cases, Firecrawl. The section on our own
pipeline reads the code in this repo, and the assessment compares the two.

The bar this sets is the whole point. A state-of-the-art plan generator is not
"an app where a model writes a plan." The serious products split the work: a
deterministic engine that owns the numbers, health and readiness signals that
feed back in, an explanation layer, and a narrow, bounded role for any model.
Stride Guide's current shape is closer to that than to the "model writes the
plan" idea the owner worried about. The gap is in depth of adaptation, evidence,
and evaluation, not in the basic architecture.

## 1. How the leading products work

The field is covered in four groups: the running-first generators, the
analytics and adaptive platforms, the wearable ecosystems, and the AI-first
endurance engines. Two patterns show up before any detail: almost every product
with a documented method is a **rules or statistical engine with a bounded model
layer**, and almost none publish independent evidence that their plans work
better. Both are load-bearing for the assessment later.

### 1.1 Running-first plan generators

**Runna.** Documented as a rules engine, not a model: "The suggested distances
and paces are calculated directly from a coach-built, rules-based training
system" (support.runna.com, "How does Runna build your training plan"). Onboarding
asks ability level, current weekly mileage, current longest run and recent
finish times, which set the start point and initial paces; "your weekly mileage
builds along a curve that increases week by week, but with a fixed ceiling on how
much it can go up in any single week." Taper is documented by event: "For half
marathon distances and above, or plans of 10 weeks or longer, Runna applies a
3-week taper. For 10km and below on a shorter plan, a 2-week taper applies"
(support.runna.com, taper article). Adaptation is rule-based and user-confirmed:
"Based on your completed workouts, Runna may suggest increases or decreases to
your pace targets throughout the plan. You can choose whether to accept these
suggestions." A missed-session path, Plan Realignment, fires "when the app
detects that you've missed more than three workouts, or a week of training," and
offers Skip, Rearrange, Extend, Rebuild or Continue, with the coaches'
recommendation to "rebuild or extend your plan to help minimise injury risk"; a
single skipped run is simply "noted... and moves on." A "Not Feeling 100%"
feature dials the plan back for 3 to 14 days with a graded return. Safety is
coaching language: sharp, persistent, worsening pain sends the runner to "your
physio or healthcare provider," and the app "won't let you add a race your long
run hasn't built toward." RPE is discussed but there is no documented
RPE/wellness check-in feeding the engine (**not found**), and no backtest or
outcome evidence is published (**not found**).

**V.O2 (the VDOT app).** The pace model is Jack Daniels' VDOT, taken from a race
result: "Enter a recent or estimated race result to get your VDOT score and
current training paces" (vdoto2.com). Its Adaptive Trainer adjusts weekly volume
around a stated preference ("your weekly mileage will always vary as a % of your
Preference... the Adaptive Trainer will suggest when to increase or decrease your
training volume as you go"). The notable documented guardrail is the opposite of
auto-drift: "Your VDOT/training paces will only update after you save a race
result... The app does not update or adapt your training based on workouts to
help prevent overtraining" (news.vdoto2.com FAQ). It also pins safety to current
fitness, not goal fitness ("to improve at a safe rate you must train at the level
of your current fitness") and caps the long run at 25 to 30 percent of weekly
mileage or 150 minutes.

**Runcoach.** The clearest published algorithm in the running group, via a
patent: US 8,202,202 (Focus-N-Fly Inc.) builds a "pace chart" from a race or time
trial by first computing "a velocity at maximal oxygen consumption speed...
v@VO2," then deriving the other paces from it, classifies the runner into six
fitness levels, and periodises "maximum training load (weekly mileage) and
maximum intensity... so that the runner has time to assimilate their benefit as
well as time to recover... and to be properly rested before the race"
(patents.google.com/patent/US8202202). The workout database holds "approximately
60,000 different workouts." Adaptation is automatic recalculation on missed
workouts ("If you miss a workout, or two, recalculate your plan to stay on
track") layered with a human coach. The patent documents safety warnings: the
system "will provide warnings to the runner... if the runner's health and injury
status indicates that the runner cannot safely prepare for or run the planned
race." The only evidence is a vendor claim of "an average of 7%" improvement,
with no published study (**not found**).

**McMillan, RunnersConnect.** Both adapt through human coaches rather than an
engine. McMillan's pace engine "combines physiological variables of endurance
performance and real-world results," and its plans are templates plus "a Real
Human Coach" from a detailed questionnaire; automated missed-session
recalculation is **not found**. RunnersConnect describes coach-authored plans
"customized to your age, goals, training experience and injury history," with a
schedule that "will constantly adjust based on your progress and any changes
(missed days, vacation, etc.)." Both put a clear safety line on injury: McMillan
asks for clearance "by your doctor or physical therapist first," and
RunnersConnect builds injury-prevention work from injury history. RunnersConnect
cites a 2025 cohort finding that injury rates rose "when a single run exceeded
the runner's longest run from the previous 30 days by more than 10%," which is
the same rule our own `adapt.ts` encodes.

**ASICS Runkeeper, Nike Run Club, adidas Running.** Runkeeper documents its
onboarding and provenance ("developed with researchers at the ASICS Institute of
Sport Science") and one adaptive rule (a plan type that "generate[s] new workouts
every week based on your previous weeks' activity completion"). Nike and adidas
publish no method (**not found**).

### 1.2 Analytics and adaptive platforms

**TrainingPeaks.** The reference implementation of a deterministic load model,
and the most direct precedent for a fitness/fatigue/form engine. Its Performance
Management Chart is a Banister-style impulse-response model: "Fatigue (Acute
Training Load, or ATL)... an exponentially weighted average of that stress from
the past seven days," "Fitness is an exponentially weighted average of the last
42 days," and form is their difference (trainingpeaks.com, "What is the
Performance Management Chart"). Its Annual Training Plan is a deterministic
scheduler over human-set blocks: "TrainingPeaks will put in all the training
blocks for you, it will set all the weekly TSS targets and ensure you don't go
over the recommended ramp rates." Notably, **no ML-driven adaptive engine is
documented** (**not found**); adaptation is a coach reading the chart and editing
the plan.

**TrainerRoad.** The best-documented adaptive system in the field, and a
model-driven one that is explicitly **not** an LLM. "TrainerRoad AI is the set of
models TrainerRoad trains on its own dataset of millions of rides... runs hundreds
of simulations... predicts how hard it would feel for you, if it is giving you
progressive overload... and what it would do to the workouts that come after it.
Then it picks the workout that gives you the best chance of making the progress
you want" (trainerroad.com, "How does TrainerRoad pick your workouts"). It
markets against generative AI: "It's not a chatbot prone to... hallucinations.
TrainerRoad AI has been developed and trained in-house using massive data sets,
with scientific principles guiding its logic." Adaptation is continuous and
non-stacking: after a missed workout "TrainerRoad re-simulates your plan from
where you actually are, and nothing piles up on the next day... TrainerRoad will
not stack the missed workout on top of the next one." A single post-workout
survey ("how did this effort feel?") feeds the next pick, and a "Fatigue
Detection" layer swaps a session for endurance ("Avoid Intensity," yellow) or for
rest ("Rest Recommended," red) when load crosses a boundary. Its evidence is
self-published cohort analysis ("Riders who followed their plan gained about 5%
in 20-minute power after two months, 9% after four, and about 10% by summer"),
not peer-reviewed, and no backtest methodology is published.

**Whoop.** A readiness and recovery product with the field's strongest
documented evaluation practice. Its Recovery score is computed nightly from HRV,
resting heart rate, respiratory rate, sleep duration, sleep stages, skin
temperature and SpO2, with "one of the two biggest contributors to Recovery"
being HRV compared "to your 30-day baseline" (support.whoop.com); Strain is "a
personalized, non-linear score from 0 to 21... based on the Borg Scale of
Perceived Exertion," and the daily Optimal Strain target is "based on: Your
Recovery score; The Strain you've already accumulated...; Your menstrual cycle
phase." Its conversational coach, Whoop Coach, runs on OpenAI models with
tool-calling and memory: engineering posts describe "Significantly higher (and
more accurate) tool call usage, primarily focused on AIQL queries... for pulling
individualized data like sleep, strain, and recovery" (engineering.whoop.com).
Crucially for the evaluation section, Whoop documents a real eval framework
("you cannot test it like traditional software. You MUST track true and false
positives, error rates, and acceptable failure thresholds at scale," with
"automated Evaluation CI gates that block deployments") and validated a model
swap on "over 4,000 test cases" then "roughly 10% of production load as a
controlled A/B test" (22 percent faster responses, 24 percent more positive
feedback, 42 percent lower costs). Strength Trainer is documented as a validated
muscular-load model built with the PUSH acquisition.

**Strava.** Descriptive analytics plus generative summaries, not a plan engine.
Its Fitness & Freshness is a Banister impulse-response model ("based on an
impulse response model first developed by Dr. Eric W. Banister in 1975"),
subscriber-only and descriptive. Its plan offering is coach-authored, and its
running plans were retired and outsourced: "These plans will now be powered by
Runna" (support.strava.com). Athlete Intelligence "uses generative AI to analyze
data from your activities... to create relevant summaries," per activity, with a
"Say More" option; it summarises, it does not prescribe or adapt. Strava also
ships a read-only MCP connector for external assistants. No plan-level evidence
is published (**not found**).

### 1.3 Wearable ecosystems

**Garmin.** Two plan products with different owners, plus a third adaptive surface.
Garmin Coach plans are authored by named human coaches and performance-adaptive:
"Once you select your distance and goal, you'll be set up with a personalized
training plan, tailored to how many weeks and how many days per week you want to
train," it "changes based on your performance" and "even gives you a confidence
score as you complete runs." The coaches are "Jeff Galloway... Greg McMillan,
physiologist and online running coach, [and] Amy Parkerson-Mitchell, physical
therapist" (garmin.com blog, "Which Garmin Coach is right for you"). Garmin Run
Coach is the machine-adaptive product: it "will create a training plan built for
you that provides personalized daily workouts that adapt to your performance,
recovery and health metrics," from "VO2 max, lactate threshold, training history
and more... sleep quality, stress levels and recovery status," with poor sleep
and recovery calling for "a lighter training day." Daily Suggested Workouts are
the third surface: "seven workout structures" from recovery and base through
tempo, threshold and VO2 max to sprint, mapped "onto the Anaerobic, Low Aerobic
and High Aerobic bars," with sprint work withheld unless recovered ("you shouldn't
expect to see these suggested workouts if you have a significant amount of
recovery time remaining"). The physiology is Firstbeat (Garmin's own blog cites
Gerber 2013, Teisala 2014 and Pietila 2018), with HRV Status built from "3 weeks"
to a personal baseline and Body Battery from beat-to-beat HRV. Garmin does not
publish the plan-generation algorithm (**not found**).

**COROS.** EvoLab supplies the substrate: Training Load on "a 3:1 training cycle
ratio" (three weeks building, then "the fourth week will have a lower
recommendation for enhanced recovery"), Training Status from "a rolling average of
7 days and 42 days," Recovery banded 0 to 100 ("Exhausted" to "Fresh"), and a race
predictor "based on your past 6 weeks' training" (support.coros.com). Plans are
"official" courses "from COROS coaches and professional athletes," with Training
Hub phase labels (Base, Peak, Preparation, Progress, Race, Transition). The
honest, load-bearing detail is what Recovery excludes: "other factors such as
Sleep, HRV, Daily Stress, or muscular fatigue... are not part of the Recovery
calculation, so it's important to listen to your body." Automatic daily replanning
from HRV or sleep is **not found**; COROS plans are coach-authored and delivered
through a web hub.

**Polar.** The Running Program is personalized and adaptive, with the base build
"updated every four weeks" and the app proposing to "proceed to the next level,
continue at the same level or go down a level" while the runner chooses
(support.polar.com). Session targets are heart-rate zones ("the science behind
the Polar heart rate zones is the cornerstone of the program"), event prediction
comes from the Running Index, and adherence is judged by zone ("No stars if you've
trained too much (more than 200%) in the moderate zone"). Notably, creating a
program requires answering a "Physical activity readiness questionnaire," the
closest a wearable comes to the ACSM screening step. FitSpark offers "2-4 workout
options every day... matched to your fitness level, training history and your
recovery and readiness, based on your Nightly Recharge status." The readiness
stack is documented: Nightly Recharge (a Sleep Charge and an ANS Charge "compared
to your usual levels from the past 28 days"), the Orthostatic Test (HRV-based),
and Training Load Pro ("TRIMP and RPE... commonly accepted by the sports science
community"). Polar publishes white papers for these.

**Suunto.** No native plan generator was found (**not found**); Suunto defers to
TrainingPeaks plans, and its own docs note "Training plans created in
TrainingPeaks are not synchronized to Suunto watches."

The wearable pattern matches the rest: a deterministic or coach-built plan, an
adaptive layer driven by recovery and health metrics, and no published generation
algorithm. Two details are worth stealing. Polar screens before it plans, and
COROS is explicit about what its recovery score leaves out.

### 1.4 AI-first endurance engines (TriDot, Athletica, AI Endurance, Humango, 2PEAK)

These are the most useful comparison set, because several publish their method,
and they split sharply into deterministic and model-first designs.

**TriDot (Predictive Fitness, Inc.).** Documented as a deterministic,
assessment-driven system, not an LLM. Its patent describes a "TriDot" as a
normalized performance value computed from a time trial per discipline
("the calculation of an athlete's TriDots begins with an assessment or time trial
for each of the disciplines"), and the plan is chosen to "maximize a total
expected increment of increase of competition performance for a given number of
hours of training time," bounded by a "limiting parameter" of "workload stress"
(US20130040272A1, Google Patents). Re-assessment every three to five weeks
"will be updated along with the athlete's training paces and heart-rate zones,"
and the plan regenerates for the remaining time (same patent). The current site
brands the engine "FitLogic" and markets it explicitly against apps that "rely on
language models trained on internet content," which places it squarely in the
deterministic camp (tridot.com; fitlogic.tech). The patent is **abandoned**, and
no peer-reviewed validation was **not found**; the "20+ years of data" and
"30% less training time" figures are marketing claims without a cited study.

**Athletica.ai.** The most transparent method of the group, and a direct
template for a hybrid. Documented as deterministic load prescription with machine
learning used only upstream: "The load prescription is deterministic. It is a
rule-based calculator with explicit, auditable rules, not a black box and not a
trained model guessing at your training. The machine learning in the system sits
upstream, in building your power and pace profiles and detecting your thresholds
and zones from raw wearable data." The load model is the Banister
impulse-response model, "a slow-building fitness effect and a fast-decaying
fatigue effect." Adaptation is bounded by explicit safety limits: "The model
holds a fitness target for each phase and will move a session's load to hit it,
but never past a set of safety limits. Fatigue is not allowed to run away from
fitness. Form is not allowed to fall below a floor... No single day is allowed to
spike beyond a ceiling scaled to your current fitness." Readiness feeds the next
block from "three channels": heart rate, neuromuscular response, and the
athlete's own RPE and comments, with HRV "chief among them" (Plews et al., 2013)
as a signal (athletica.ai/methodology-banister-training-load, athletica.ai/
methodology). Its AI Coach "does not automatically modify your training... Its
role is to explain, analyze, and suggest, not to act without your input." The
method has a peer-reviewed anchor in the Workout Reserve paper (Zignoli et al.,
*European Journal of Sport Science*, 2026, doi:10.1002/ejsc.70179), and a
field-validation claim on 21 professional cyclists.

**AI Endurance.** The opposite design: model-first. Documented as a neural-network
"Digital Twin" that "learns from your own workouts how you respond to training,
then builds the plan that maximizes your predicted performance on race day,"
and "builds your plan from scratch" rather than adapting a template
(aiendurance.com). Zones are detected from HRV via DFA-alpha-1 thresholds "without
tests." The LLM is a coach layer that "can act" (reschedule workouts, adjust
zones), separate from the planner. It has a peer-reviewed method paper (Andriolo,
Rummel, Gronwald, *Sensors* 2024, doi:10.3390/s24144468) and reports a predictive
accuracy of "about 5%" with at least 100 runs of data. Its safety page is the
most candid in the group: "Should I follow the training plan if I'm injured...?
No... Our AI does not detect injuries in any form... please consult your
physician before following any exercise plan."

**Humango (HumanGO).** Documented as generative-AI based: "built with Generative
AI and LLM models to deliver flexible, hyper-personalized endurance sports
training plans," with "Hugo" as the AI coach, adapting on "sessions, settings,
wearables data and feedback" (humango.ai/faqs). No patent, no peer-reviewed
paper, no white paper, and no outcome evidence were **not found**; the method is
not otherwise described.

**2PEAK (Quevita AG).** Documented as an algorithm plus learning, running since
2003: "The algorithm analyzes your training load and recovery capacity... 2PEAK
always calculates the optimal training load"; "After EVERY session, your training
effort and expected recovery time is analyzed and future workouts are updated"
(2peak.com). No patent, paper or white paper was **not found**, and its only
documented safety measure is an expert-advice disclaimer that the advice "is not
a substitute for medical or professional advice."

## 2. Architecture patterns: deterministic, LLM-authored, or hybrid

The serious field is overwhelmingly **hybrid**, and the split is consistent: the
numbers are deterministic and the model is bounded.

**What is kept deterministic.** Where the method is documented, the training
maths is not left to a model. Athletica calls its load prescription "a rule-based
calculator with explicit, auditable rules, not a black box and not a trained model
guessing at your training," and confines machine learning to threshold and zone
detection (athletica.ai). TriDot's patent computes normalized performance values
from time trials and selects the plan to maximise expected race outcome under a
workload-stress limit, all deterministic (US20130040272A1). Even AI Endurance,
whose planner is a trained network, keeps it a separate, testable artefact rather
than a prompt. TrainerRoad, the field's best-documented adaptive system, is
bluntest of all: its engine "was built in-house for one purpose... It's not a
chatbot prone to... hallucinations," and it markets against tools that use "a
third party LLM that give you generic guidance and template plans"
(trainerroad.com). TrainingPeaks keeps a coach in the loop over a deterministic
TSS scheduler. The pattern across the field is the same as the one Anthropic
describes in "Building effective agents": use "workflows... systems where LLMs
and tools are orchestrated through predefined code paths," because they "offer
predictability and consistency for well-defined tasks," and "find the simplest
solution possible, and only increase complexity when needed" (anthropic.com/
engineering/building-effective-agents, Dec 2024).

**What is handed to a model.** A model is handed the open-ended, language-shaped
work: the coach chat, explaining a session, a short weekly emphasis, a summary.
AI Endurance's product page separates the two cleanly, with the LLM coach
"analyzing activities... creating and rescheduling workouts" as an action layer
over a statistical planner. Athletica's coach "does not automatically modify your
training... Its role is to explain, analyze, and suggest." None of the most
serious products document a model as the sole author of the plan's numbers.

**Why deterministic.** Four reasons recur in the sources:

- **Reproducibility.** Havers et al. 2025 (*Biology of Sport*, PMID 40182716)
  tested the same prompts run repeatedly and found "a high degree of
  reproducibility... 27 out of 28 items showing no differences." That is the good
  case. The same literature shows model plans vary by model and by prompt
  detail, so a plan a runner is halfway through is not something you want to
  regenerate from a prompt and hope matches.
- **Testability and safety.** A rule engine can be unit-tested and bounded;
  a prompt cannot. This is why Athletica phrases its controls as explicit limits
  ("never past a set of safety limits... no single day is allowed to spike beyond
  a ceiling"). It matches our own repo's structure, where the plan engine is pure
  and covered by tests.
- **Cost and latency.** Anthropic's guidance is explicit that agentic systems
  "trade latency and cost for better task performance," and that for many
  applications "optimizing single LLM calls with retrieval and in-context
  examples is usually enough." A plan must render instantly and offline; a model
  call cannot be in that path.
- **Validation.** A deterministic engine can be back-tested; a stochastic one is
  hard to evaluate at all. The evaluation literature below is built on fixed
  rules and expert scoring, not on sampling a model's mood.

**The model layer, when used, is schema-bound.** The reliable way to get a model
to feed a deterministic system is to constrain its output, not to trust free
text. Willard and Louf, "Efficient Guided Generation for Large Language Models"
(arXiv:2307.09702), show generation guided by a grammar or schema "enables the
construction of reliable interfaces by guaranteeing the structure of the
generated text." That is the same move our engine makes: the shaping pass must
return a closed-set quality kind and volume intent, validated twice, or the
deterministic plan stands.

**Verdict.** Fully LLM-authored plans are the minority and the weak position.
Hybrid is the standard, and the strongest products keep the model out of the
load maths entirely.

## 3. Adaptivity: how they react to a missed session, a rough week, feedback and readiness

**What changes, and who decides.** The documented systems adapt *future load*,
not the plan's architecture. TrainerRoad is explicit: "Before every workout it
re-simulates your plan across every workout it could give you and predicts how
each one would go for you," and it keeps the load ceiling in the model, not the
chat. Athletica "moves a session's load to hit" a phase fitness target inside
safety limits, from HR, neuromuscular and RPE/comment signals (athletica.ai).
TriDot regenerates paces and zones after a three to five week re-assessment
(patent). AI Endurance "recommend[s] changes" when readiness is insufficient and
applies adaptations after missed workouts, with the model "updated every 24
hours." Whoop turns a nightly Recovery score into a daily Strain target and lets
its coach talk around it. Humango adapts continuously on "sessions, settings,
wearables data and feedback" (humango.ai). 2PEAK recomputes "after EVERY
session." The consistent pattern: **the engine decides, the model narrates.**

**Readiness and wellness.** HRV, resting heart rate, sleep and subjective
check-ins feed a readiness read. AI Endurance fits "a recovery model to your HRV,
resting heart rate, DFA alpha 1 and training load, together with your morning
check-in and soreness feedback"; Athletica uses a three-channel response model.
Garmin builds an HRV baseline over three weeks and reads Body Battery from
beat-to-beat HRV; Polar compares Nightly Recharge "to your usual levels from the
past 28 days." COROS is the exception that proves the point: it deliberately
leaves sleep, HRV and stress out of its Recovery score. But the evidence for
HRV-guided prescription is modest and should be stated
honestly. Manresa-Rocamora et al. 2021 (*IJERPH* 18:10299, PMID 34639599) found
HRV-guided training was superior for vagal HRV indices but that benefits for
maximal aerobic capacity, second-threshold capacity and endurance performance
were "small" and non-significant, concluding that "if HRV-guided training is
superior to predefined training for producing group-level improvements in fitness
and performance, current data suggest it is only by a small margin." A 2025 RCT
(Ranieri et al., *Med Sci Sports Exerc* 57(7):1510, PMID 39935030) compared heart
rate, race-pace and HRV prescription and found "no interaction effects between
groups," with the race-pace group improving time-trial performance most
reliably. Readiness signals are worth using as a feedback channel; they are not
a licence to promise that adaptive beats predefined.

**Missed sessions.** The documented behaviour is to absorb, not to stack.
TrainerRoad re-simulates "from where you actually are, and nothing piles up on
the next day... TrainerRoad will not stack the missed workout on top of the next
one." AI Endurance "propose[s] adaptations that keep your fitness on track" after
a missed workout; Athletica says "One missed day won't ruin your week. Athletica
recalculates intelligently, not aggressively"; Runna's Plan Realignment offers
Skip, Rearrange, Extend, Rebuild or Continue and recommends rebuilding "to help
minimise injury risk." No serious product documents a "make up the missed miles"
behaviour. V.O2 goes further and freezes its paces so they only move on a race
result, "to help prevent overtraining."

**The open question.** Whether to act automatically or only suggest is a product
choice, and the safest documented systems separate them. Athletica's coach never
changes training without input; AI Endurance proposes and the athlete accepts.
Our own manual-by-default design sits in this camp.

## 4. Safety and guardrails

**Preparticipation screening is the biggest documented gap in AI coaching.** The
ACSM's current exercise preparticipation algorithm screens on three factors:
"the individual's current level of physical activity, presence of signs or
symptoms and/or known cardiovascular, metabolic, or renal disease, and desired
exercise intensity," and deliberately dropped risk-factor profiling to "reduce
possible unnecessary barriers" (Riebe et al. 2015, *Med Sci Sports Exerc*
47(11):2473, PMID 26473759). Zaleski et al. 2024 (*JMIR Med Educ* 10:e51308,
PMID 38206661) scored AI chatbot exercise recommendations and found them only
"41.2% comprehensive" and "90.7% accurate," with the single largest source of
inaccuracy being "the need for exercise preparticipation medical clearance."
That is the failure mode to design against. Among the wearables, Polar is the
lone one that gates plan creation behind a "Physical activity readiness
questionnaire"; the rest start planning with no such step.

**Injury and medical red flags.** Running injury risk is real and partly
screenable. Joachim et al. 2024 (systematic review, PMID 37970801) found
"moderate certainty that increased RED-S risk factors increased RRI risk,
particularly bone stress injuries." A coach system should treat persistent,
focal, progressive pain, and any cardiac or systemic symptom, as a stop-and-reference
signal, not a training question.

**How the best products phrase it.** They refuse and refer, plainly. AI
Endurance: "we do not recommend any structured training in this case. Focus on
getting healthy first... Our AI does not detect injuries in any form... please
consult your physician." 2PEAK disclaims that its advice "is not a substitute for
medical or professional advice." This is exactly the shape our own coach safety
classifier takes: a typed read of none, caution or urgent, and on a confident
hit, a plain line that points to a professional and states no diagnosis.

**Bounding the plan itself.** The engine-level guardrail is a load ceiling:
TriDot's "limiting parameter" of workload stress, Athletica's day-spike ceiling
and experience-scaled fatigue floor. Our own engine has the same idea in the
weekly step ceiling and the long-run share ceiling.

## 5. Quality and evaluation: how you would know a plan generator is good

This is the weakest area across the whole field, and the most important to get
right.

**Expert review is the standard instrument, and it is harsh on model-generated
plans.** Düking et al. 2024 (*J Sports Sci Med* 23:56, PMID 38455449) had coaching
experts score ChatGPT runner plans against 22 criteria and concluded the plans
"are not rated optimal," with quality rising only as more input was supplied, and
advised "avoiding the use of ChatGPT generated training plans without an expert
coach's feedback." Havers et al. 2025 found reproducibility was good but that
quality still tracked prompt detail. Montaruli et al. 2026 (*Br Med Bull*
157(1):ldag010, PMID 41722095) prompted eight leading models for six-month
marathon plans and found most captured the headline components (weekly mileage
progression, tapering, more than 80 percent easy) but that "some engines omitted
key details... failed to differentiate clearly between athlete levels... or
offered inconsistent pacing data," concluding that "significant limitations
regarding personalization and professional oversight necessitate further
validation." A 2025 systematic review of generative AI for exercise prescription
found plans "generally adhere to established exercise guidelines but often lack
specificity, progression, and adaptability to real-time physiological feedback,"
and called the role "complementary rather than substitutive to expert guidance"
(*Applied Sciences* 15(7):3497).

**What counts as evidence, in descending order of strength:**

1. **A controlled outcome trial.** Does the plan produce better race results or
   fewer injuries than an alternative? Montaruli et al. call for exactly this:
   "future studies should evaluate the real-world outcomes of AI-generated
   programs in randomized trials including the integration of personal
   physiological data." Almost nobody in the field has this.
2. **Expert rubric scoring of outputs.** The Düking and Havers method: build a
   panel of criteria from the literature, have qualified coaches score plans,
   measure agreement. This is the cheapest credible evidence and it is what the
   field actually uses.
3. **Backtests and cohort analysis.** Fit a plan's predicted outcome to real
   results. TriDot claims "20+ years of data" but publishes no backtest; Athletica
   reports a field validation on 21 cyclists; AI Endurance reports a prediction
   error. These are self-reported and not independently verified.
4. **Automated evals for the model parts.** For the chat and explanation layer,
   the standard is a rubric-scored judge validated against human labels. Zheng
   et al. 2023 ("Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena,"
   arXiv:2306.05685) showed a strong LLM judge can reach "over 80% agreement" with
   human preference, "the same level of agreement between humans," provided you
   account for position, verbosity and self-enhancement biases. Groundedness
   (does every claim trace to a retrieved source) is the key metric for a
   knowledge-base-grounded coach.
5. **Adherence and safety telemetry.** Completion rates, injury reports and
   quit reasons from real use. Nobody publishes these; they are the honest
   internal signal.

**What would count as evidence for us.** A rubric of plan-quality criteria
(scored by a coach, or by us against the wave-6 constants), a small backtest on
our own plans checking the ceiling and progression invariants, and a groundedness
eval for the coach chat. We have unit tests on the engine, which is necessary but
is not plan-quality evidence.

## 6. The model's role: what to hand an LLM and what to compute

Distilled from the field and the evidence:

**Compute, never prompt.** Weekly volume, long-run distance, pace and zone
targets, phase structure, taper, the spacing of hard sessions, and any safety
ceiling. These are the numbers and they are deterministic everywhere it matters.

**Hand the model (bounded and validated):**
- **Week emphasis and ordering.** A short, unit-free line on what a week is for,
  and a choice among allowed quality kinds and volume intents. This is what our
  shaping pass does, and it is the same shape Athletica and AI Endurance use for
  their coach layer.
- **Explanations and "why".** Language-shaped, grounded in the plan's own
  decisions and the knowledge base.
- **Coach chat.** Open-ended, with retrieval grounding and a style contract.
- **Typed decisions.** A narrow classification (for us, the safety read) is a
  model's job, but as a constrained choice, mapped through a schema, with a
  confidence floor and a deterministic fallback.

**Never hand the model:** the process of setting a distance, a pace, a week's
load, or a safety boundary. Every documented failure in the literature comes
from a model doing arithmetic or planning it is not suited to.

## 7. Assessment: our pipeline against the yardstick

Our current shape, read from the code: a pure deterministic engine
(`packages/shared/src/plan/engine.ts`) with phases, a goal-relative long-run arc,
a research-backed week structure and recovery weeks; a deterministic adapt path
(`adapt.ts` suggestions, `adaptive.ts` applied rebuild of future weeks only); an
AI shaping pass over week intents (`apps/api/src/lib/plan-shape.ts`); a
typed-decision client (`apps/api/src/lib/jev.ts`) used for a safety classification
(`coach-safety.ts`); and a grounded per-session "why" (`why.ts`). Feedback
(`fitness.ts`), readiness (`recovery.ts`), and a grounded coach chat
(`apps/api/src/routes/ai.ts`) round it out.

### 7.1 Where we are at par

- **Hybrid architecture, numbers deterministic.** This is exactly the shape the
  strongest products document. Our engine owns volume, paces, phase structure,
  spacing and the safety ceilings; the model only shapes allowed choices and
  writes language. We are not building the owner's off-hand idea literally. We are
  building the Athletica-style split: deterministic maths, bounded model.
- **Bounded, validated model output.** The shaping pass returns a closed-set
  quality kind and volume intent, validated in two places, with the deterministic
  plan as the fallback on any failure. This is the schema-bound pattern the
  Outlines work argues for, and it matches Athletica's "engine decides, coach
  narrates."
- **A safety classifier that refuses and refers.** A typed none/caution/urgent
  read with a confidence floor, replaced by a plain line that points to a
  professional, is at the level of the best-documented products (AI Endurance,
  2PEAK) and ahead of most AI plan apps, which the Zaleski study shows routinely
  miss preparticipation clearance.
- **Research-grounded plan structure.** The wave-6 constants (2 quality sessions,
  48 to 72 hour spacing, the long-run share falling with volume, the 41 to 60
  percent taper) sit at the level of the published coaching literature and above
  most products, which do not cite their sources.
- **A grounded "why" per session.** Explaining a session from the plan's own
  decisions is a genuine strength; it is the product's stated reason to exist and
  most competitors do not do it.

### 7.2 Where we are behind

- **Adaptation depth and closed-loop speed.** Our adapt path reacts to missed
  sessions, volume bands, three high-RPE sessions, a single-run spike, cross-load
  and a readiness flag, and it rebuilds future weeks from real training. That is
  real, but it is coarser than the leaders: Athletica moves load against a
  phase-level fitness target, AI Endurance retrains its model daily, and
  TrainerRoad "re-simulates your plan across every workout it could give you"
  before every session and picks afresh. We have no fitness or fatigue *model*
  (no CTL/ATL/TSB-style impulse-response); adaptation is band-based rules, not a
  continuous model.
- **Readiness is a flag, not a curve.** `recovery.ts` raises a strained flag from
  resting HR, HRV, sleep, SpO2, respiratory rate and night temperature against a
  personal baseline, and `adapt.ts` surfaces it as an "ease" suggestion. The
  field fits a continuous recovery score and moves load against it. Ours is
  binary and advisory.
- **No published evidence or evaluation of our own.** We have engine unit tests
  and the wave-6 constants, but no plan-quality rubric scored by a coach, no
  backtest of the invariants against real plans, and no groundedness eval for the
  coach. Every serious product either has a method paper (Athletica, AI Endurance)
  or claims a validation, and Whoop goes further with a documented eval framework
  and an A/B-tested model swap. We have none of this yet.
- **Automatic adaptation is designed but not built.** Manual-by-default is the
  right default, but TrainerRoad re-simulates automatically after every ride and
  Whoop's coach reads a fresh daily recovery score. Ours is deferred (PLAN.md
  section 6.6).
- **Strength and cross-training are shallow in the model layer.** The shaping pass
  sees running quality kinds and volume intent, but not strength or mobility
  progression, so the model cannot yet reason about the whole week.

### 7.3 Where we are ahead

- **Stated, sourced structure.** The engine's constants are traced to the
  research in-repo (wave-4, wave-6) and explained per session. TriDot, Humango
  and 2PEAK publish no sources at all; our auditability is unusual.
- **A refusal-first safety stance in chat.** The classifier runs before the
  answer and replaces it on a confident risk read. Most AI plan products document
  no red-flag handling beyond a disclaimer.
- **Deterministic adapt that never rewrites history.** Rebuilding only weeks that
  have not started, seeded with the runner's own logs, is a clean and honest
  design. A model-first planner cannot easily offer this.
- **Metric engine, presentation-edge units.** Keeping the engine unit-free and
  converting at the edge is a discipline many products get wrong, and it is why
  our numbers stay testable.
- **A research-backed "why" tied to the plan's own decisions.** This is our
  differentiator and it is grounded, not generated free-form.

## 8. What a state-of-the-art version would add (prioritised)

1. **A fitness and fatigue model.** Move from band rules to a continuous
   impulse-response-style load model (fitness, fatigue, form) so adaptation can
   target a phase-level fitness goal inside explicit safety limits, the way
   Athletica does. This is the single biggest gap and it unlocks the rest.
2. **A continuous readiness curve, not a flag.** Turn `recovery.ts` into a
   scored readiness read and let it scale a future week's load, bounded, with the
   honest caveat from Manresa-Rocamora that the performance benefit is small.
3. **A plan-quality rubric and a backtest.** Define the criteria from wave-6,
   score generated plans against them, and add a test that every generated plan
   holds its ceilings and progression invariants. This is the evidence the field
   expects and we lack.
4. **A groundedness eval for the coach and explanations.** Check that every
   claim in a coach answer traces to the knowledge base or the user's own data,
   using a judge validated against a handful of hand-labelled cases.
5. **Opt-in automatic adaptation, with record and revert.** Build PLAN.md section
   6.6: a nightly path gated by mode, new-signal, bounded change, cooldown,
   visibility and revert, so automatic is never unguarded.
6. **Widen the shaping pass to the whole week.** Let the bounded model layer see
   strength and mobility so its week emphasis is about the real week.
7. **Per-runner tuning of the constants we already expose.** Age and build
   preference already lean the curve; extend the same treatment to the deload
   cadence and the long-run share, so the plan fits the runner not the average.

## 9. What we should deliberately not do

- **Do not let a model author the numbers.** No distance, pace, weekly load or
  safety boundary from a prompt. Every documented failure comes from this.
- **Do not promise that adaptive beats predefined.** The evidence says the
  benefit is small (Manresa-Rocamora, Ranieri). Use readiness as a feedback
  channel and say plainly that the gain is modest.
- **Do not build a "catch up the missed miles" mechanic.** The field absorbs
  missed sessions; stacking them is an injury risk with no support.
- **Do not chase a fully autonomous, unguarded auto-adapt.** Automatic only with
  the mode switch, the record and revert. An irreversible silent change is worse
  than manual.
- **Do not claim medical detection or diagnosis.** Screen and refer, as the ACSM
  algorithm and the best products do. Never diagnose.
- **Do not add an ACWR or monotony score as a threshold.** Our own research
  (PLAN.md execution log) notes ACWR is contested; keep it out.
- **Do not ship agentic multi-model orchestration for the plan.** The plan path
  must stay instant, offline and testable. Complexity only where it demonstrably
  helps, per Anthropic's own guidance.
- **Do not let the model produce user-facing prose without the writing rules and
  the sanitizer.** A prompt is not a guarantee; the filter is.

## 10. Sources

Everything below was fetched. Pages behind JavaScript or cookie walls were
reached through the Europe PMC REST API (peer-reviewed abstracts), Firecrawl
(a few product sites), or Google Patents' query endpoint. Where a fact could not
be verified, the finding says so.

**Product documentation**

- Runna support: "How does Runna build your training plan around your current
  fitness" (support.runna.com/en/articles/15231838); taper and recovery
  (15272605); Plan Realignment (10026375); skipping a run (15012850); Pace Insight
  (10854865); "Not Feeling 100%" (13531498); aches and pains (13225357); injury and
  overtraining (15279082); training preferences (10393191); Runna Score (7895279).
- V.O2: vdoto2.com (home, Adaptive Trainer, Custom Training Plans, Training
  Definitions); news.vdoto2.com V.O2 FAQ and Adaptive Trainer instructional guide.
- Runcoach: runcoach.com (How It Works, About, Pricing); patent US 8,202,202,
  patents.google.com/patent/US8202202.
- McMillan Running: mcmillanrunning.com (calculator, training plans, custom plans,
  coaching, product).
- RunnersConnect: runnersconnect.net (training plans, pricing, blog on the 10
  percent rule and injury).
- Runkeeper: help.runkeeper.com (personalized race training plans; training plans).
- Garmin: garmin.com blog ("Which Garmin Coach is right for you"; "Garmin
  training plans for runners"; "Types of daily suggested workouts for runners";
  "Garmin Training Status"; "Understanding the HRV Status"; "5 reasons your Body
  Battery is running low"); Forerunner 165 Series owner's manual, "Adaptive
  Training Plans"; garmin-coach/overview; Firstbeat white-papers index.
- COROS: support.coros.com ("Creating and Using Training Plans"; "COROS Fitness
  Metrics Explained"; "Understanding the Recovery Widget"; "COROS Training Hub
  Manual"); us.coros.com/training.
- Polar: polar.com/smart-coaching ("Running Program"; "FitSpark"; "Training Load
  Pro"; "Nightly Recharge"; "Orthostatic Test"; "Recovery Pro");
  support.polar.com, "Get started with the Polar Running Program";
  polar.com/en/science/whitepapers.
- Suunto: suunto.com (home; TrainingPeaks partner page).
- Strava: support.strava.com (Fitness & Freshness; Athlete Intelligence;
  training plans for cyclists; running plans now powered by Runna; Recover
  Athletics; AI assistant connector).
- TrainingPeaks: trainingpeaks.com/learn (What is the Performance Management
  Chart; Applying the Numbers, parts 1 and 3; What is TSS; A Look at Planning by
  TSS with the new ATP).
- TrainerRoad: trainerroad.com/blog (How does TrainerRoad pick your workouts; How
  does TrainerRoad adjust your training plan automatically; What is TrainerRoad
  AI); support.trainerroad.com (Athlete Levels; Fatigue Detection).
- Whoop: support.whoop.com (WHOOP Recovery; WHOOP Strain); developer.whoop.com/
  docs/whoop-101; engineering.whoop.com (AI evaluation framework; GPT-5.1 results);
  whoop.com Locker (Strength Trainer; the research behind Strength Trainer).
- TriDot: tridot.com; fitlogic.tech and its methodology page; patents
  US20130040272A1 and US20210308522A1, patents.google.com.
- Athletica: athletica.ai (Methodology; the Banister load model; Workout Reserve).
- AI Endurance: aiendurance.com (home, product, about, FAQ, DFA-alpha-1 blog).
- Humango: humango.ai (home, app, FAQs).
- 2PEAK: 2peak.com (home; experts page).

**Peer-reviewed and technical literature**

- Riebe D, Franklin BA, Thompson PD, et al. "Updating ACSM's Recommendations for
  Exercise Preparticipation Health Screening." *Med Sci Sports Exerc*
  2015;47(11):2473-2479. PMID 26473759. doi:10.1249/MSS.0000000000000664.
- Zaleski AL, Berkowsky R, Craig KJT, Pescatello LS. "Comprehensiveness, Accuracy,
  and Readability of Exercise Recommendations Provided by an AI-Based Chatbot."
  *JMIR Med Educ* 2024;10:e51308. PMID 38206661. doi:10.2196/51308.
- Joachim MR, et al. "Risk Factors for Running-Related Injury in High School and
  Collegiate Cross-country Runners: A Systematic Review." 2024. PMID 37970801.
- Manresa-Rocamora A, Sarabia JM, Javaloyes A, Flatt AA, Moya-Ramon M. "Heart Rate
  Variability-Guided Training for Enhancing Cardiac-Vagal Modulation, Aerobic
  Fitness, and Endurance Performance: A Methodological Systematic Review with
  Meta-Analysis." *Int J Environ Res Public Health* 2021;18(19):10299. PMID
  34639599. doi:10.3390/ijerph181910299.
- Ranieri LE, Casado A, Martin D, et al. "Performance and Physiological Effects of
  Race Pace-Based Versus Heart Rate Variability-Guided Training Prescription in
  Runners." *Med Sci Sports Exerc* 2025;57(7):1510-1522. PMID 39935030.
  doi:10.1249/MSS.0000000000003671.
- Düking P, Sperlich B, Voigt L, Van Hooren B, Zanini M, Zinner C. "ChatGPT
  Generated Training Plans for Runners are not Rated Optimal by Coaching Experts,
  but Increase in Quality with Additional Input Information." *J Sports Sci Med*
  2024;23(1):56-72. PMID 38455449. doi:10.52082/jssm.2024.56.
- Havers T, Masur L, Isenmann E, et al. "Reproducibility and quality of
  hypertrophy-related training plans generated by GPT-4 and Google Gemini as
  evaluated by coaching experts." *Biol Sport* 2025;42(2):289-329. PMID 40182716.
  doi:10.5114/biolsport.2025.145911.
- Montaruli G, Nikolaidis PT, Racil G, Maffulli N, Migliaccio GM, Padulo J.
  "Artificial intelligence-generated marathon training programs: reliable tools
  in exercise prescription for athletic performance?" *Br Med Bull*
  2026;157(1):ldag010. PMID 41722095. doi:10.1093/bmb/ldag010.
- "Harnessing Generative Artificial Intelligence for Exercise and Training
  Prescription: A Systematic Literature Review." *Applied Sciences*
  2025;15(7):3497. (Abstract via Europe PMC / MDPI.)
- Zignoli A, Giorgi A, Kolodziej F, Martinez-Gonzalez B, Leo P, Laursen PB.
  "Tracking Performance Limits Using Multi-Timescale Maximal Mean Power Ratios."
  *Eur J Sport Sci* 2026;26(6):e70179. doi:10.1002/ejsc.70179.
- Andriolo S, Rummel M, Gronwald T. "Relationship of Cycling Power and Non-Linear
  Heart Rate Variability from Everyday Workout Data." *Sensors*
  2024;24(14):4468. doi:10.3390/s24144468.
- Willard BT, Louf R. "Efficient Guided Generation for Large Language Models."
  arXiv:2307.09702, 2023.
- Zheng L, Chiang W-L, Sheng Y, et al. "Judging LLM-as-a-Judge with MT-Bench and
  Chatbot Arena." arXiv:2306.05685, 2023.
- Anthropic Engineering. "Building effective agents." Dec 2024.
  anthropic.com/engineering/building-effective-agents.

**Not reachable or not published (recorded, not papered over)**

- Nike Run Club and adidas Running publish no plan-generation method (Nike's help
  centre is commerce-only; adidas Runtastic help returned HTTP 403).
- Suunto: no plan-generation method found.
- Strava's engineering blog exists but its data-science posts were not reachable
  by fetch.
- PubMed and several publisher pages (Keele repository, MDPI full text, CDC
  stacks) blocked direct fetch; abstracts were taken through the Europe PMC REST
  API instead.
