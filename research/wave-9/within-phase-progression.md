# Wave 9: within-phase rep progression

Research-only note. No code or architecture decisions. Written to back the engine
change that ramps reps across a phase's own weeks instead of holding one rep count
until the phase boundary, and that lets RPE drift up a point over the same span.

## Question

Does the corpus already cover a within-phase ramp (base 10 to 11 to 12 reps, then
a reset to build's 8 and peak's 6)? If not, is the shape supported well enough to
encode, and what are the real sources?

## What the corpus already holds

- Wave 7, 17a (session structure) covers the phase arc as a coarse thing: 2 to 3
  heavy full-body sessions in base, 1 to 2 maintenance sessions with intensity
  kept and sets cut through build and peak, one short session early in the taper.
  It does not say how reps move inside a phase, only that load is held at the
  top of the plan and volume steps down.
- Wave 1, 3b (programming) gives the band the engine stays inside: 2 to 6 sets of
  3 to 10 reps at above 70% 1RM or 1 to 2 reps in reserve, beginners starting at
  1 to 2 sets. It fixes the band, not the week-to-week motion within one phase.
- Wave 1, 3a (economy and injury) is about the stimulus, not rep prescription.

So the boundary reset (build 8, peak 6) is covered by 17a's arc; the within-phase
ramp itself is not covered.

## The sources for the ramp

The progression rule the engine encodes (climb reps inside a rep band, then reset
at the phase change) is the standard one from the resistance-training position
stand and its companion progression review. Both are real and verified against
Europe PMC metadata:

1. American College of Sports Medicine. Progression models in resistance training
   for healthy adults. Med Sci Sports Exerc. 2009;41(3):687-708.
   doi:10.1249/MSS.0b013e3181915670. For novice training it recommends a
   repetition range of 8 to 12 RM, and for progression it recommends a 2 to 10
   percent increase in load when the individual can perform the current workload
   for one to two repetitions over the desired number. That is the reps-before-load
   rule this ramp follows: hold the load, add reps across the phase until the top
   of the band, then step the phase and let the load rise as the rep count drops.

2. Kraemer WJ, Ratamess NA. Fundamentals of resistance training: progression and
   exercise prescription. Med Sci Sports Exerc. 2004;36(4):674-688.
   doi:10.1249/01.MSS.0000121945.36635.61. Sets out progression as varying the
   prescription variables over time to keep the stimulus advancing and to avoid
   overtraining; reps and load are the two it names first.

The phase boundary and its drop follow wave 7, 17a and the running review it cites
(Blagrove, Howatson and Hayes, 2018): base is the higher-volume, lower-rep-stress
block, build and peak keep load with fewer sets, and the taper is short.

## What is a chosen encoding, not a trial result

- The exact numeric path (base 10 then 11 then 12; build 8; peak 6) is a chosen
  encoding of the 8 to 12 RM novice band plus the phase arc, not a curve any trial
  tested. Exercise counts and set counts do not translate into rep counts one to
  one, and no runner trial compares an intra-phase rep ramp with a flat rep count.
- RPE 6 at the low end of a phase, drifting to 7 at its top, sits at the moderate
  end of the ACSM guidance and matches the app's existing RPE 7 to 8 training
  intent at the phase peak.
- The ramp assumes load is constant within a phase and the runner logs reps; it is
  an RPE/RIR prescription, which is the practical stand-in where 1RM testing is
  not done (wave 1, 3b).

## Rules out

- A single flat rep count for a whole phase with a step only at the boundary.
- Reading the ramp as a trial-tested curve; it is a chosen encoding of a real
  progression rule.
