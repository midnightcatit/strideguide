# Gym equipment inventories

Scope: the strength machines and free-weight equipment most often present at common gym
chains, university and recreation gyms, and a typical home setup, so the app can offer a
machine list that reflects what a user actually has. Compiled 2026-11-23. The app today
assumes a single Planet Fitness location with 8 machines (see
`packages/shared/src/plan/machines.ts`).

How to read the labels:

- **Documented** means the chain's own equipment page names the item or category.
- **Reported** means a reliable third-party guide or a widely repeated member report lists it.
- **Estimate** means it is the usual floor plan for that kind of gym, not a published list.

Note on naming: the brief says "Planck Fitness". That is treated here as a typo for Planet
Fitness, since the app's current catalog is Planet Fitness.

Machine names are given as they are normally labelled on the gym floor, which is also how a
user would recognise them.

---

## Planet Fitness

Membership tier: low cost, machine-first. Full circuit of selectorized (pin-loaded) machines,
a Smith machine, cable towers, and a limited free-weight area. No Olympic barbells, no squat
or power racks, no deadlift platform, no bumper plates. Dumbbells usually stop around 75 lb
(about 34 kg), some clubs 80 lb.

Equipment commonly present:

- Chest press machine (Documented on PF's own strength categories and reported machine lists)
- Pec fly / rear delt machine (Reported)
- Shoulder press machine (Documented, and in the PF 30-minute circuit)
- Lat pulldown machine (Reported)
- Seated row machine (Documented, and in the PF 30-minute circuit)
- Assisted pull-up / dip machine (Gravitron) (Reported)
- Bicep curl machine (Reported)
- Tricep extension machine (Reported)
- Cable crossover station / dual adjustable pulley (Documented on PF's own page)
- Lateral raise machine (Estimate, select clubs only)
- Leg press machine (Documented, and in the PF 30-minute circuit)
- Leg extension machine (Reported)
- Seated leg curl machine (Documented, and in the PF 30-minute circuit)
- Lying leg curl machine (Estimate, some clubs)
- Hip abductor machine (Reported)
- Hip adductor machine (Reported)
- Calf raise machine (Reported)
- Glute / kickback machine (Estimate, newer clubs)
- Hack squat machine (Estimate, some clubs only)
- Ab crunch machine, rotary torso machine (Reported)
- Back extension / hyperextension bench (Reported)
- Captain's chair (leg raise station) (Reported)
- Smith machine (Documented on PF's own page; usually one, often two or three)
- Fitbench (Documented on PF's own page)
- Free weights: dumbbells about 5 to 75 lb, fixed-weight barbells about 20 to 60 lb, flat and
  adjustable benches (Documented categories; exact ranges reported)
- Functional: TRX station, medicine balls, kettlebells, Bosu, strength bands (Documented on
  PF's own page; note the site lists these under functional accessories, some clubs may not
  have kettlebells on the floor)
- Cardio: treadmill, elliptical, rower, upright bike, stepmill, recumbent stepper, recumbent
  bike, Arc trainer, upper body ergometer (Documented on PF's own page)
- Stretch area: mats, foam rollers, stability balls, yoga mats (Reported)

Highest value for runners:

1. Leg press (leg drive and climbing strength)
2. Leg curl (hamstrings that brake each stride)
3. Leg extension (quads that absorb landings)
4. Back extension (posture late in a long run)
5. Seated row and shoulder press (posture and relaxed arm swing)
6. Cable tower (adductor, hip and core work with no barbell needed)

Machine versus free-weight mix: heavily machine-led. A runner can build a complete strength
plan at Planet Fitness with no barbell at all.

---

## Anytime Fitness

24-hour franchised clubs. Equipment varies more by location than at Planet Fitness, but the
strength floor is usually a mix of selectorized machines plus a real free-weight area with
racks. The brand's own blog names rowing machine, cross-trainer, stationary bike, pull-up
bar, resistance bands, dumbbells and kettlebells as core kit, but does not publish a per-club
machine list.

Equipment commonly present:

- Leg press, leg extension, seated or lying leg curl (Reported; the brand features a line of
  leg machines from one maker, commonly leg press, leg extension, leg abduction)
- Hip abductor and adductor (Reported)
- Chest press, shoulder press, lat pulldown, seated row, pec deck (Estimate, standard
  selectorized set)
- Bicep curl and tricep extension machines (Estimate)
- Cable crossover or functional trainer (Estimate)
- Assisted pull-up / dip (Estimate)
- Squat rack or power rack with Olympic barbell and plates (Reported; one of the main
  differences from Planet Fitness)
- Smith machine (Estimate, most clubs)
- Adjustable and flat benches, dumbbell rack (Reported)
- Kettlebells, resistance bands, pull-up bar (Reported on the brand blog)
- Rowing machine, treadmills, cross-trainers, bikes (Reported on the brand blog)

Highest value for runners:

1. Squat rack or power rack with a barbell (heavy lower body and posterior chain)
2. Leg press and leg curl
3. Leg extension
4. Cable or lat pulldown station for the upper back
5. Rowing machine for low-impact aerobic cross-training

Machine versus free-weight mix: more balanced than Planet Fitness. Racks and barbells are
usually available, so a runner can do compound lower-body work.

---

## LA Fitness

Larger, higher-tier clubs. The chain's own Equipment page groups kit into cardio, free weights
and selectorized equipment, and names dumbbells, barbells, free weights and benches. There is
no single published machine list, so the machine set below is reported plus estimate.

Equipment commonly present:

- Cardio: treadmills, ellipticals, stair climbers, upright and recumbent bikes, rowers
  (Documented category; specific items reported)
- Selectorized chest press, shoulder press, lat pulldown, seated row, pec deck, bicep and
  tricep machines (Estimate, standard selectorized set)
- Leg press, leg extension, seated and lying leg curl, hip abductor and adductor, calf raise
  (Reported / Estimate)
- Cable crossover and functional trainer (Estimate)
- Squat racks and Smith machines (Reported by members; often several)
- Flat, incline and decline benches (Reported)
- Dumbbell rack, Olympic barbells, weight plates (Documented as free weights)
- Kettlebells, medicine balls, battle ropes, mats (Estimate, functional area)
- Optional areas at some clubs: basketball court, pool, group studio, a "glute room" and
  Pilates studio (Documented on the LA Fitness site)

Highest value for runners:

1. Squat rack or Smith machine for squats and split squats
2. Leg press and leg curl
3. Calf raise
4. Cable station for upper back and core
5. Free dumbbells for single-leg work that machines cannot do

Machine versus free-weight mix: more balanced than Planet Fitness, with a genuine free-weight
room. Barbell training is realistic here.

---

## 24 Hour Fitness

Multisport clubs with three tiers (typically Sport, Super-Sport, Ultra-Sport), so available kit
depends on the tier. The brand's editorial pages discuss equipment but do not publish a
machine list, so most of this is reported or estimate.

Equipment commonly present:

- Cardio: treadmill, elliptical, stationary bike, stair climber, rower, upper body ergometer
  (Reported; the brand's own articles name these)
- Selectorized chest press, shoulder press, lat pulldown, seated row, pec deck (Estimate)
- Leg press, leg extension, leg curl, hip abductor and adductor, calf raise (Estimate)
- Cable stations and functional trainers (Estimate)
- Squat racks, Smith machine, Olympic barbells, plates (Estimate, common in higher tiers)
- Dumbbells, adjustable and flat benches, kettlebells, resistance bands (Reported)
- Functional area with boxes, sleds and turf at some clubs (Estimate)
- Higher tiers add group studios, pools, sauna or steam (Documented amenities)

Highest value for runners:

1. Squat rack with barbell
2. Leg press and leg curl
3. Calf raise and hip adductor and abductor work for stride stability
4. Cable station for upper back
5. Rower for cross-training

Machine versus free-weight mix: mixed, weighted toward whichever tier the club is. Verify per
location before promising racks.

---

## Gold's Gym

Positioned around serious strength. Gold's own site states it is "equipped with cutting-edge
machines and free weights", and its blog teaches machine progression, but there is no public
per-club machine list. Strength floor leans toward free weights compared with Planet Fitness.

Equipment commonly present:

- Extensive dumbbell rack and Olympic barbells with plates (Estimate, core to the brand)
- Squat racks or power racks and dedicated lifting platforms (Estimate, common)
- Smith machine (Estimate)
- Bench press stations, flat and adjustable benches (Estimate)
- Selectorized chest press, shoulder press, lat pulldown, seated row, pec deck (Estimate)
- Leg press, leg extension, leg curl, hip abductor and adductor, calf raise (Estimate)
- Cable crossover and functional trainer (Estimate)
- Kettlebells, medicine balls, battle ropes, sleds, turf functional area (Estimate)
- Cardio: treadmills, ellipticals, bikes, stair climbers, rowers (Estimate)

Highest value for runners:

1. Squat rack or platform with a barbell (the main draw for runners who want heavy leg work)
2. Leg press and leg curl
3. Calf raise
4. Cable station for upper back and core
5. Turf or sled work for acceleration and power, if the club has a functional space

Machine versus free-weight mix: free-weight led. Best of the big-box chains for barbell
training if the runner wants squats and deadlifts.

---

## Crunch

Mid-market clubs with a strong free-weight and functional reputation. Crunch's own site
publishes an equipment article naming dumbbells, standard and Olympic barbells, weight
machines, kettlebells, battle ropes and medicine balls, plus cardio. Reported guides say the
selectorized machines are supplied by a mix of makers.

Equipment commonly present:

- Dumbbells, standard and Olympic barbells, EZ curl bars, weight plates (Documented / Reported)
- Squat racks or power racks and Smith machines (Reported)
- Cable stations and functional trainers (Reported)
- Selectorized chest press, shoulder press, lat pulldown, seated row, pec deck, plus
  plate-loaded leverage machines (Reported)
- Leg press, leg extension, leg curl, hip abductor and adductor (Estimate)
- Kettlebells, battle ropes, medicine balls, plyo boxes, sleds (Documented on Crunch's site)
- Cardio: treadmills, ellipticals, stair climbers, bikes, rowers (Documented / Estimate)
- HIITZone style functional area at many clubs (Reported)

Highest value for runners:

1. Squat rack or Smith machine for squats and split squats
2. Leg press and leg curl
3. Cable station for upper back and anti-rotation core work
4. Kettlebell for single-leg and posterior-chain moves
5. Battle ropes or sled for conditioning, if the goal includes power

Machine versus free-weight mix: balanced to free-weight led. Good availability of both, so a
profile here should include racks and machines.

---

## Equinox

Premium clubs. Kit is high-spec (commonly a single top-tier commercial brand per site), and
clubs differ a lot by location and floor plate. Equinox's own content discusses a Smith
machine and its class formats, but there is no public machine list. Member reports note that
some sites are thin on heavy racks relative to boutique lifting gyms.

Equipment commonly present:

- Premium selectorized strength machines (Estimate; often one main commercial brand, for
  example Hoist or Technogym per member reports)
- Cable crossover and functional trainers (Estimate)
- Smith machine (Documented in Equinox's own article)
- Squat racks, barbells and plates (Estimate; present but count varies by site)
- Dumbbells, benches (Estimate)
- Pilates equipment and reformer at studio-equipped clubs (Documented)
- Cardio: treadmills, bikes, rowers, stair climbers (Estimate)
- Recovery and spa areas at many clubs (Documented amenities)

Highest value for runners:

1. Squat rack with barbell (confirm per club, count varies)
2. Leg press and leg curl
3. Cable station for upper back and core
4. Selectorized leg extension
5. Treadmill only for structured treadmill work, not as a substitute for outdoor runs

Machine versus free-weight mix: machine and premium-selector led, with free weights present.
Because site layouts differ, this profile should be treated as the least certain of the
chains, and the user should be able to tick the racks on or off.

---

## YMCA

Community nonprofit centres. Kit is usually practical and mid-range, aimed at all ages.
Widely reported as: selectorized machines, a weight room, free weights and a stretching area.
There is no central equipment list; the mix varies by branch and funding.

Equipment commonly present:

- Selectorized chest press, shoulder press, lat pulldown, seated row, leg press, leg
  extension, leg curl, hip abductor and adductor (Reported)
- Cable machines (Reported)
- Dumbbells and adjustable benches (Reported)
- Squat rack or Smith machine at some branches (Estimate)
- Cardio: treadmills, ellipticals, stationary bikes, rowing machines (Reported)
- Stretching area and mats (Documented category)
- Free-weight room (Documented category)

Highest value for runners:

1. Leg press and leg curl
2. Leg extension
3. Seated row and lat pulldown
4. Cable station for hip and core work
5. Cardio rower for cross-training

Machine versus free-weight mix: machine led, similar in spirit to Planet Fitness but usually
with a real weight room. Treat barbell availability as uncertain per branch.

---

## University / recreation gyms

Campus recreation centres and student gyms. The usual fit-out is a large free-weight area plus
a full machine circuit, because these facilities serve both general students and varsity
athletes. Vendor guides for rec centres describe multiple racks, platforms and Olympic kit as
standard.

Equipment commonly present:

- Multiple power racks, half racks or squat racks with safeties (Reported in rec-centre
  vendor guides)
- Lifting platforms, Olympic bars, bumper plates and plate storage (Reported)
- Smith machines (Reported)
- Adjustable benches (Reported)
- Full selectorized circuit: chest press, shoulder press, lat pulldown, seated row, pec deck,
  leg press, leg extension, leg curl, hip abductor and adductor, calf raise (Estimate)
- Cable crossover and functional trainer (Estimate)
- Dumbbells, kettlebells, medicine balls, bands, turf area (Estimate)
- Cardio: treadmills, ellipticals, bikes, rowers, stair climbers (Estimate)
- Some have an indoor track, pool or climbing wall (Estimate)

Highest value for runners:

1. Power rack with a barbell (best single item for runner strength)
2. Lifting platform for deadlift and clean work
3. Leg press and leg curl
4. Cable station for upper back and core
5. Turf or sled space for power and acceleration work

Machine versus free-weight mix: the most free-weight capable of the group, plus a full machine
circuit. A profile here should default to racks on.

---

## Typical home gym starter kit

Not a chain, so this is a common buying pattern rather than a published list. The recurring
guidance from home-gym review sites and beginner guides is: barbell, rack, bench and plates
first, then dumbbells, then cardio.

Equipment commonly present:

- Adjustable dumbbells, or a small fixed dumbbell set (Reported as the usual first buy)
- Kettlebell (Reported)
- Adjustable bench that does flat, incline and decline (Reported)
- Barbell and weight plates (Reported, often the second stage of buying)
- Power rack or squat stand with a pull-up bar (Reported, common next step)
- Resistance bands and a pull-up bar (Reported, minimal setups)
- Mat, foam roller, stability ball (Estimate, near universal)
- Cardio: a treadmill, bike or rower, or none at all if the user runs outside (Estimate)
- Optional leg curl and leg extension bench attachment, cable pulley tower, or a plate-loaded
  leg press (Estimate, more advanced setups)

Highest value for runners:

1. Adjustable dumbbells (covers lunges, split squats, step-ups, single-leg confidence)
2. Adjustable bench (step-ups, hip thrusts, split squats, Bulgarian split squats)
3. Kettlebell (swings and single-leg work for the posterior chain)
4. Power rack and barbell when the space and budget allow (squats and deadlifts)
5. Resistance bands (glute and hip work, warm-ups)

Machine versus free-weight mix: free-weight led, machine-light. At home the app should lead
with bodyweight and dumbbell moves and treat machines as optional.

---

## United Kingdom chains

### PureGym

PureGym's own equipment page lists a strength area with plate-loaded machines, free weights
from 5 to 90 lb (their US page wording), and a functional area. Reported UK member info adds
squat racks, Smith machines, half racks and dumbbells up to about 70 kg.

Equipment commonly present:

- Plate-loaded machines: chest press, shoulder press, lat pulldown, leg press, hip abductor
  (Documented on PureGym's own page)
- Free weights from light to heavy dumbbells (Documented)
- Squat racks, half racks, Smith machines (Reported)
- Functional area: battle ropes, kettlebells, medicine balls, Bosu, stability balls, foam
  rollers, resistance bands, plyo boxes, TRX (Documented on PureGym's own page)
- Cardio: treadmills, cross-trainers, bikes, ellipticals, rowers (Documented)

Highest value for runners:

1. Squat rack or half rack (confirm per site)
2. Leg press and leg curl
3. Lat pulldown and seated row
4. Kettlebells for posterior chain
5. Rower for cross-training

Machine versus free-weight mix: balanced, leaning free-weight. A good profile for either style.

### The Gym Group

The Gym Group's own equipment page states every gym has at least about 170 items of equipment
and free weights, and lists named pin-loaded machines plus free weights. Dumbbells are listed
as 2 to 50 kg.

Equipment commonly present (named on The Gym Group's own equipment page):

- Arm curl machine
- Chest press machine
- Lat pulldown machine
- Seated row machine
- Hip abductor machine
- Leg curl machine
- Leg extension machine
- Triceps press machine
- Ab crunch machine (shown on the same page)
- Back extension machine (shown on the same page)
- Adjustable bench
- Dumbbells, 2 to 50 kg
- Cardio: elliptical, rowing machine, treadmill, upright bike (Documented named guides)
- Low-impact area with exercise balls and yoga mats (Documented)

Highest value for runners:

1. Leg curl and leg extension (hamstring and quad balance)
2. Chest press and back extension (posture)
3. Seated row and lat pulldown (upper back)
4. Free-weight area for squats and split squats with dumbbells or a barbell
5. Rowing machine

Machine versus free-weight mix: balanced, well documented for the machine names, which makes
it a good template for a UK gym profile.

---

## Mapping to the app

### What the app supports today

`PF_MACHINES` in `packages/shared/src/plan/machines.ts` holds 8 moves: Leg press, Leg curl,
Leg extension, Back extension, Seated row, Shoulder press, Bicep curl, Tricep extension. The
catalog builder in `packages/shared/src/plan/catalog.ts` filters this set by an allowed list,
so the plumbing for "which machines does the user have" already exists; it just needs a wider
catalog and a gym profile to fill it.

### Machine names worth adding beyond the current 8

These are the most widely present machines across the chains above, ordered by how often they
show up and how useful they are for a runner:

1. Chest press (present at every chain here)
2. Lat pulldown (present at every chain here)
3. Pec fly / rear delt (very common, adds horizontal pull and shoulder balance)
4. Hip adductor and hip abductor (common; stride stability and knee tracking)
5. Calf raise (common; ankle and calf capacity for runners)
6. Cable tower or cable crossover (common; broad movement range, core and hips)
7. Smith machine (near universal outside bare-bones gyms; squat and press substitute when no
   rack exists)
8. Hip thrust or glute machine (growing presence; direct glute work)
9. Assisted pull-up / dip (common; upper-body pulling for beginners)
10. Ab crunch machine (common; optional, runners get more from anti-rotation work)

Keep the original 8 as the Planet Fitness baseline, then add the rest as optional. Each added
move needs to stay a pure data entry (name, muscles, pattern, why, feel, form, mistakes) to
match the existing `MachineExercise` shape and the project rule to prefer data over code.

### Free-weight and bodyweight support

The brief notes a home kit and free-weight-heavy chains. The app already has a bodyweight set
and a dumbbell set in `packages/shared/src/plan/bodyweight.ts`. For the gyms above, the useful
free-weight additions are: adjustable bench, squat rack or power rack, barbell and plates,
dumbbells, kettlebell. These map to the existing `EquipmentPreference` values (`machines`,
`bodyweight`, `bodyweight-dumbbells`, `both`) rather than to new machine names, so a profile
can raise the free-weight share without inventing new logic.

### How a user could pick a gym profile

1. Start from a preset list that matches the chains above: Planet Fitness (machine only,
   choose the 8 baseline plus optional extras), Anytime Fitness, LA Fitness, 24 Hour Fitness,
   Gold's Gym, Crunch, Equinox, YMCA, University rec, PureGym, The Gym Group, Home gym.
2. Show the preset as a checklist of machines and free-weight categories, pre-ticked to that
   chain's common set, so the user confirms what is actually in their club. Presets are a
   starting point, never a promise, because per-location variation is real, especially for
   Anytime Fitness, Equinox and YMCA branches.
3. Store the confirmed list in the existing per-user machine allowance (the `available` list
   already threaded through `defaultCircuit`), and store the free-weight mix in the existing
   equipment preference, so no new schema is required.
4. For the home profile, default to the bodyweight and dumbbell sets and treat machines as
   optional extras, which matches how home kit is actually bought.

Planet Fitness differs from the rest in that it is the only profile here that should default
to machines only with free weights effectively absent. Every other preset should start with at
least some free-weight or rack access, except a minimal home setup.

---

## Sources

Chain pages (self-reported equipment):

- Planet Fitness, Our Clubs: https://www.planetfitness.com/our-clubs
- LA Fitness, Equipment: https://www.lafitness.com/Pages/equipment.aspx
- Gold's Gym home page (equipment claim): https://www.goldsgym.com/
- Crunch, What Equipment Does Crunch Fitness Provide: https://www.crunch.com/thehub/what-equipment-does-crunch-fitness-provide/
- Equinox, Do More With: Smith Machine: https://www.equinox.com/articles/2025/04/do-more-with-smith-machine
- Anytime Fitness, Best Gym Equipment for a Full-Body Workout: https://www.anytimefitness.com/en-in/blog/the-most-effective-fitness-equipment-for-a-full-body-workout
- 24 Hour Fitness, Eight Pieces of Equipment Perfect for Beginners: https://www.24hourfitness.com/24life/fitness/2016/eight-pieces-of-equipment-perfect-for-beginners
- YMCA of Northern Colorado, Health and Fitness (fitness centre description): https://www.ymcanorth.org/health__fitness
- PureGym, Our Gym Equipment and Facilities: https://www.puregym.com/us/equipment
- The Gym Group, Equipment and Machines: https://www.thegymgroup.com/equipment/

Third-party and reference material:

- PF Guides, Planet Fitness Equipment List: https://pfguides.com/planet-fitness-equipment-list/
- YMCA membership guide, YMCA Amenities and Equipment: https://ymcamembershipcost.com/ymca-amenities-equipment/
- Skelcore, What Machines and Racks Belong in a Student Recreation Center: https://www.skelcore.com/guides/what-machines-racks-belong-student-recreation-center
- Anatomy Fitness, Recreation Center Gym Equipment Guide USA: https://anatomyfitness.co/blogs/news/recreation-center-gym-equipment-guide-usa-anatomy-fitness
- Garage Gym Reviews, Best Budget Home Gym Equipment: https://www.garagegymreviews.com/the-best-budget-home-gym-equipment
- REP Fitness, Best Home Gym Equipment for Beginners: https://repfitness.com/blogs/guides/best-home-gym-equipment-for-beginners
- Health Flexio, Crunch Fitness Machines Guide: https://healthflexio.com/what-machines-does-crunch-fitness-have/
- LA Fit Membership Cost, LA Fitness Equipment List: https://lafitmembershipcost.com/la-fitness-equipment-list/

Repo references:

- `packages/shared/src/plan/machines.ts` (current 8 Planet Fitness machines)
- `packages/shared/src/plan/catalog.ts` (allowed-machine filtering)
- `packages/shared/src/plan/bodyweight.ts` (bodyweight and dumbbell sets)
- `packages/shared/src/types.ts` (`EquipmentPreference`)
