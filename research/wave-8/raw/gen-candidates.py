#!/usr/bin/env python3
"""Generate research/wave-8/01-candidates.md from the curated selection.

Selection data: id -> (partition, pattern, our group, have-note, one-line
description written in our own words). Everything else (name, level,
equipment, URL) comes from calistree-classified.tsv, harvested from
calistree.app datasheet pages.
"""
from pathlib import Path

HERE = Path(__file__).resolve().parent
RAW = HERE

P_LEGS = "legs-front-hip"
P_POST = "posterior-calves"
P_CORE = "core-stability-plyo"
P_UP = "upper-body"
P_MOB = "mobility"

# id: (partition, pattern, our muscle group, have-note, description)
SEL = {
	# ---- legs and front of hip ----
	"e004": (P_LEGS, "squat", "Legs", "", "Wide-stance bodyweight squat that biases the adductors and glutes."),
	"e031": (P_LEGS, "squat", "Legs", "", "Full-depth squat to the deepest comfortable range, a mobility-strength hybrid."),
	"e0xp": (P_LEGS, "squat", "Legs", "", "Isometric hold in the bottom squat position for hip and knee capacity."),
	"e0is": (P_LEGS, "squat", "Legs", "", "Wide-stance isometric hold that trains adductor and hip strength."),
	"e0yb": (P_LEGS, "squat", "Legs", "", "Wider, deeper horse stance hold for adductor range with load-bearing."),
	"e0el": (P_LEGS, "squat", "Legs", "", "Lateral stepping while holding the low horse stance position."),
	"e0y4": (P_LEGS, "squat", "Legs", "", "Cross-behind lunge that hits glute medius and outer hip from a new angle."),
	"e0ac": (P_LEGS, "squat", "Legs", "", "Single-leg squat on one foot with the other behind, a step toward the pistol."),
	"e0ea": (P_LEGS, "squat", "Legs", "", "Deep single-leg squat with the free leg threaded across in front."),
	"e0ec": (P_LEGS, "squat", "Legs", "", "Hand-assisted version of the dragon squat for building the range safely."),
	"e048": (P_LEGS, "squat", "Legs", "", "Partial-range single-leg squat, the first rung toward a full pistol."),
	"e07v": (P_LEGS, "squat", "Legs", "related: Assisted pistol squat", "Full single-leg squat on one straight-legged support-free rep."),
	"e10g": (P_LEGS, "squat", "Legs", "", "Pistol squat with the working foot elevated, easing ankle range demands."),
	"e0ey": (P_LEGS, "squat", "Legs", "", "Single-leg squat touching a box behind, controlled descent and drive up."),
	"e0ss": (P_LEGS, "squat", "Legs", "", "Single-leg squat to a chair seat, an accessible unilateral squat rung."),
	"e0yu": (P_LEGS, "squat", "Legs", "", "Isometric wall sit for quad endurance at the knee-flexed position."),
	"e0yv": (P_LEGS, "squat", "Legs", "", "Single-leg wall sit, a big step up in unilateral quad demand."),
	"e0k4": (P_LEGS, "squat", "Legs", "", "Alternating forward lunges walked across the floor."),
	"e0q1": (P_LEGS, "squat", "Legs", "related: Split squat", "Split squat taken to the deepest range with the knee tracking far forward."),
	"e148": (P_LEGS, "squat", "Legs", "related: Dumbbell split squat", "Deep lunge holding dumbbells for loaded knee-over-toe strength."),
	"e0sp": (P_LEGS, "squat", "Legs", "", "Split squat with the front foot raised, loading the quad through a long range."),
	"e0st": (P_LEGS, "squat", "Legs", "", "Lunge against a wall that loads the quad as a leg press with bodyweight."),
	"e0k5": (P_LEGS, "squat", "Legs", "", "Lunge combined with an overhead dumbbell press in one sequence."),
	"e0k6": (P_LEGS, "squat", "Legs", "", "Lunge performed with weight held overhead for trunk and hip demand."),
	"w016": (P_LEGS, "squat", "Legs", "related: Reverse lunge", "Reverse lunge finished with a high knee drive, mirroring running gait."),
	"e16l": (P_LEGS, "squat", "Legs", "", "Sumo-stance squat rising onto the toes, pairing quad and calf work."),
	"e0gq": (P_LEGS, "knee-extension", "Legs", "", "Sissy squat with hand support, an open knee-angle quad strengthener."),
	"e0gn": (P_LEGS, "knee-extension", "Legs", "", "Partial sissy squat, a gentler entry to the deep-knee quad pattern."),
	"e0go": (P_LEGS, "knee-extension", "Legs", "", "Full sissy squat, the strongest bodyweight knee-extension progression."),
	"e0ef": (P_LEGS, "knee-extension", "Legs", "", "Kneeling lean-back that trains the quad through terminal extension."),
	"e1e1": (P_LEGS, "knee-extension", "Legs", "", "Reverse nordic with band or cable assistance to build the range."),
	"e17w": (P_LEGS, "knee-extension", "Legs", "", "Lying straight-knee lifts that extend the quad without load."),
	"e1c0": (P_LEGS, "knee-extension", "Legs", "", "Leg extension machine worked one leg at a time."),
	"e0yp": (P_LEGS, "knee-extension", "Legs", "", "Wall-supported lift of the forefoot that strengthens the tibialis anterior."),
	"e10q": (P_LEGS, "knee-extension", "Legs", "", "Tibialis raise weighted with a kettlebell held at the feet."),
	"e19s": (P_LEGS, "squat", "Legs", "related: Step-up", "Step-down from a small height, the Patrick step for controlled knee tracking."),
	"e11o": (P_LEGS, "squat", "Legs", "related: Goblet squat", "Narrow-stance heels-raised goblet squat biased to the quadriceps."),
	"e0an": (P_LEGS, "core", "Legs", "", "Seated straight-leg lift hold that compresses the hip flexors against the torso."),
	"e0a9": (P_LEGS, "core", "Legs", "", "One-leg version of the seated pike compression hold."),
	"e0ap": (P_LEGS, "core", "Legs", "", "Seated straddle lift hold compressing both hip flexors in a wide position."),
	"e0zp": (P_LEGS, "core", "Legs", "", "Flutter kicks performed while holding the seated pike compression."),
	"e12f": (P_LEGS, "core", "Legs", "", "Standing knee drive against band resistance, a hip flexor strengthener."),
	"e1eg": (P_LEGS, "core", "Legs", "", "Standing knee drive on a cable machine for loaded hip flexion."),
	"e1eo": (P_LEGS, "core", "Legs", "", "Straight-leg raise on a cable, loading the hip flexor through full range."),
	"e165": (P_LEGS, "core", "Legs", "", "Band-resisted adduction pulling the leg across the midline."),
	"e1en": (P_LEGS, "core", "Legs", "", "Standing adduction on a cable for the groin muscles."),
	"e16n": (P_LEGS, "core", "Legs", "", "Lying leg sweep across the body that trains the adductors without equipment."),
	"e1c3": (P_LEGS, "squat", "Legs", "", "Leg press with a wide stance that biases glutes and adductors."),
	"e1c2": (P_LEGS, "squat", "Legs", "", "Leg press with a narrow stance that biases the quadriceps."),
	"e032": (P_LEGS, "squat", "Legs", "related: Step-up", "Step-up onto a high surface demanding a deep single-leg drive."),
	"e0z1": (P_LEGS, "squat", "Legs", "", "Lateral step-ups on a box done at speed, a quick-feet unilateral drill."),
	# ---- posterior chain and calves ----
	"e0dw": (P_POST, "hinge", "Legs", "", "Conventional barbell deadlift from the floor."),
	"e13r": (P_POST, "hinge", "Legs", "related: Dumbbell Romanian deadlift", "Dumbbell deadlift, the floor hinge with hand-held weight."),
	"e14z": (P_POST, "hinge", "Legs", "", "B-stance deadlift with the rear foot as a kickstand, split stance load."),
	"e0ji": (P_POST, "hinge", "Legs", "", "Single-leg barbell deadlift balancing on one foot."),
	"e0h2": (P_POST, "hinge", "Legs", "", "Barbell good morning, a hip hinge loaded across the upper back."),
	"e040": (P_POST, "hinge", "Legs", "", "Single-leg good morning, a bodyweight balance hinge."),
	"e0jo": (P_POST, "hinge", "Glutes", "related: Two-hand kettlebell swing", "Kettlebell swing done one-handed, adding an anti-rotation demand."),
	"e0eo": (P_POST, "posterior-chain", "Glutes", "", "Reverse hyperextension raising the legs behind from a supported front position."),
	"e0rv": (P_POST, "posterior-chain", "Back", "related: Back extension", "Prone floor back extension lifting the chest and legs."),
	"e0pl": (P_POST, "hinge", "Glutes", "related: Glute bridge", "Glute bridge with the feet elevated for a longer glute range."),
	"e0pm": (P_POST, "hinge", "Glutes", "related: Single-leg glute bridge", "Single-leg glute bridge with the working foot on a raised surface."),
	"e01m": (P_POST, "posterior-chain", "Back", "", "Face-down hold lifting chest and legs, the mirror of the hollow hold."),
	"e01s": (P_POST, "posterior-chain", "Back", "", "Arch body hold with opposite arm and leg lifted, a unilateral back line hold."),
	"e0va": (P_POST, "posterior-chain", "Back", "", "Prone back-extension hold, the yoga locust, for the whole back line."),
	"e0wk": (P_POST, "posterior-chain", "Glutes", "", "Quadruped glute kickback extending one hip behind."),
	"e03m": (P_POST, "posterior-chain", "Glutes", "", "Bent-knee hip abduction lift from quadruped, the classic fire hydrant."),
	"e00n": (P_POST, "knee-flexion", "Legs", "", "Hamstring curl pulling a stability ball toward the hips."),
	"e0en": (P_POST, "knee-flexion", "Legs", "related: Sliding leg curl", "Slider leg curl done one leg at a time."),
	"e12d": (P_POST, "knee-flexion", "Legs", "", "Standing hamstring curl against a short band."),
	"e1by": (P_POST, "knee-flexion", "Legs", "", "Seated leg curl machine worked one leg at a time."),
	"e1cj": (P_POST, "posterior-chain", "Glutes", "", "Roman-chair hip extension on one leg for unilateral posterior load."),
	"e1cl": (P_POST, "posterior-chain", "Glutes", "", "Single-leg roman-chair extension weighted with a dumbbell or kettlebell."),
	"e0pk": (P_POST, "hinge", "Legs", "", "Good morning done seated, isolating the hamstrings at the hip."),
	"e0rw": (P_POST, "calf", "Legs", "", "Double-leg calf raise off a step through a full stretch-to-rise range."),
	"e14u": (P_POST, "calf", "Legs", "", "Ledge calf raise holding a dumbbell for load."),
	"e149": (P_POST, "calf", "Legs", "", "Calf raise in the donkey position with a loaded hip stretch."),
	"e1c4": (P_POST, "calf", "Legs", "", "Calf press driven with the leg press machine."),
	"e1c6": (P_POST, "calf", "Legs", "", "Single-leg calf press on the leg press for unilateral calf load."),
	"e0kq": (P_POST, "calf", "Legs", "", "Band pull toward the shin that trains dorsiflexion strength."),
	"e0av": (P_POST, "calf", "Legs", "", "Standing ankle rolls that train eversion and inversion control."),
	"e0z6": (P_POST, "calf", "Legs", "", "Walking on the toes to load calves and foot muscles."),
	"e0z5": (P_POST, "calf", "Legs", "", "Walking on the heels to load the tibialis anterior and shin."),
	"e17e": (P_POST, "calf", "Legs", "", "Standing big-toe press that trains the flexors of the great toe."),
	"e17f": (P_POST, "calf", "Legs", "", "Standing big-toe lift that trains the extensors of the great toe."),
	"e0s4": (P_POST, "posterior-chain", "Glutes", "", "Side-lying straight-leg lift for the glute medius without equipment."),
	"e12g": (P_POST, "posterior-chain", "Glutes", "", "Side-lying leg lift against a short band."),
	# ---- core, stability and plyometric ----
	"e057": (P_CORE, "core", "Core", "", "Hollow body hold, the trunk stiffener held hips and shoulders off the floor."),
	"e0q0": (P_CORE, "core", "Core", "", "Hollow position rocked back and forth without losing shape."),
	"e008": (P_CORE, "core", "Core", "", "V-up folding torso and legs to meet overhead."),
	"e0oo": (P_CORE, "core", "Core", "", "Tuck-up, the easier folded version of the V-up."),
	"e0s0": (P_CORE, "core", "Core", "", "Reverse crunch with straight legs hinging the hips off the floor."),
	"e006": (P_CORE, "core", "Core", "", "Seated trunk rotation touching the floor on both sides."),
	"e06p": (P_CORE, "core", "Core", "", "Lying windshield wiper sweeping bent legs side to side."),
	"e06q": (P_CORE, "core", "Core", "", "Double leg raise from supine, a hip-flexor and trunk combination."),
	"e10o": (P_CORE, "core", "Core", "", "Supine chin tuck training the deep front-of-neck flexors."),
	"e10p": (P_CORE, "core", "Core", "", "Isometric hold of the supine chin tuck position."),
	"e03e": (P_CORE, "core", "Core", "", "Reverse plank held on the elbows, opening the front line."),
	"e07e": (P_CORE, "core", "Core", "", "Plank balanced on one hand for anti-rotation control."),
	"e10s": (P_CORE, "core", "Core", "", "Plank position passing a kettlebell from hand to hand."),
	"e00t": (P_CORE, "core", "Core", "", "Stability ball pike tucking the hips toward the chest."),
	"e11g": (P_CORE, "core", "Core", "", "Russian twist performed with feet on a stability ball."),
	"e11h": (P_CORE, "core", "Core", "", "Bicycle crunches supported by a stability ball under the shins."),
	"e00z": (P_CORE, "core", "Core", "", "Forearm plank on a stability ball circling the elbows."),
	"e02h": (P_CORE, "core", "Core", "", "L-sit held with hands on a chair or box."),
	"e12y": (P_CORE, "core", "Core", "", "Floor L-sit lifting one leg at a time toward full extension."),
	"e1bl": (P_CORE, "core", "Core", "", "Tucked L-sit lifting from the floor, the first compression rung."),
	"e007": (P_CORE, "core", "Core", "", "Boat pose, the V-shaped trunk and hip flexor isometric hold."),
	"e1er": (P_CORE, "core", "Core", "related: Cable woodchop / Pallof press", "Pallof press held isometrically against cable rotation."),
	"e14w": (P_CORE, "core", "Core", "", "Kettlebell woodchop driving rotation from hip to shoulder."),
	"e04r": (P_CORE, "core", "Core", "", "Hanging knee tucks to the chest from a bar hang."),
	"e04s": (P_CORE, "core", "Core", "", "Hanging straight-leg raise to horizontal from a bar hang."),
	"e0ja": (P_CORE, "core", "Core", "", "Hanging knee raise to touch the elbows."),
	"e0ax": (P_CORE, "core", "Legs", "", "Single-leg balance hold with the raised leg forward, the front scale."),
	"e0er": (P_CORE, "core", "Legs", "", "Single-leg balance hold with the raised leg behind, the back scale."),
	"e0ft": (P_CORE, "core", "Glutes", "related: Warrior II", "Warrior 3 single-leg hinge balance held horizontally."),
	"e0fr": (P_CORE, "core", "Legs", "", "Half moon single-leg standing balance with an open hip."),
	"e0w6": (P_CORE, "core", "Legs", "", "Downward dog balanced on one leg, an inverted single-leg hold."),
	"e170": (P_CORE, "core", "Glutes", "", "Single-leg hip hinge with a square pelvis, the hip airplane."),
	"e19p": (P_CORE, "core", "Glutes", "", "Pelvic drop and hike on a step for hip control."),
	"e0g2": (P_CORE, "core", "Legs", "", "Copenhagen plank from the knee, an easier adductor side plank."),
	"e0g3": (P_CORE, "core", "Legs", "", "Copenhagen plank with foot support on a low surface."),
	"e005": (P_CORE, "plyometric", "Legs", "related: Jump squat", "Wide-stance squat jump."),
	"e05x": (P_CORE, "plyometric", "Legs", "related: Jump squat", "Squat jump taken through a deep range."),
	"e0we": (P_CORE, "plyometric", "Legs", "", "Tuck jump pulling the knees high at the top."),
	"e08m": (P_CORE, "plyometric", "Legs", "", "Standing long jump for horizontal power."),
	"e0df": (P_CORE, "plyometric", "Legs", "", "Frog jump, a deep squat jump with a long forward reach."),
	"e1a1": (P_CORE, "plyometric", "Legs", "related: Depth drop", "Depth jump dropping off a box and rebounding straight up."),
	"e1a0": (P_CORE, "plyometric", "Legs", "", "Vertical jump launched from a seated position on a box."),
	"e16i": (P_CORE, "plyometric", "Legs", "", "Repeated hops on a single leg."),
	"e09w": (P_CORE, "plyometric", "Legs", "", "Lateral hops over a line, side to side."),
	"e17m": (P_CORE, "plyometric", "Glutes", "", "Skater jump bounding laterally between single-leg landings."),
	"e0a7": (P_CORE, "plyometric", "Legs", "", "Scissor jump switching split-stance legs in the air."),
	"w015": (P_CORE, "plyometric", "Glutes", "", "Single-leg hinge snap to vertical, a hip-dominant hop."),
	"e0z0": (P_CORE, "plyometric", "Legs", "", "Step-up exploded into a jump off the top leg."),
	"e1g2": (P_CORE, "plyometric", "Legs", "", "Rope skipping, a springy calf and ankle plyometric (needs a rope)."),
	# ---- upper body ----
	"e14x": (P_UP, "push", "Shoulders", "", "Dumbbell overhead press with a rotating grip path."),
	"e13f": (P_UP, "push", "Chest", "", "Dumbbell bench press on a bench."),
	"e157": (P_UP, "push", "Chest", "", "Incline dumbbell bench press for the upper chest and front delt."),
	"e0ph": (P_UP, "push", "Chest", "", "Dumbbell chest fly on a bench through a wide stretch."),
	"e0kn": (P_UP, "push", "Chest", "", "Horizontal band press from the chest."),
	"e10j": (P_UP, "push", "Arms", "", "Bench or chair dip with bent knees for triceps and chest."),
	"e034": (P_UP, "push", "Chest", "", "Parallel-bar dip (needs bars)."),
	"e03s": (P_UP, "push", "Chest", "", "Push-up with the feet elevated, shifting load to the shoulders."),
	"e05h": (P_UP, "push", "Shoulders", "", "Pike push-up from an incline, the entry rung of the overhead press."),
	"e02w": (P_UP, "push", "Shoulders", "", "Pike push-up with feet elevated, a steeper shoulder press angle."),
	"e02n": (P_UP, "push", "Chest", "", "Push-up exploding into a hand clap."),
	"e02i": (P_UP, "push", "Chest", "", "Plyo push-up clapped at chest height."),
	"e156": (P_UP, "push", "Arms", "", "Triceps kickback with a dumbbell on a bench."),
	"e1cs": (P_UP, "push", "Shoulders", "related: Shoulder press", "Machine shoulder press with a neutral grip handle."),
	"e025": (P_UP, "pull", "Back", "", "Barbell bent-over row to the waist."),
	"e15m": (P_UP, "pull", "Back", "", "Heavy two-kettlebell row from a bent-over hinge."),
	"e140": (P_UP, "pull", "Back", "", "Bent-over row pulling a long band."),
	"e1cg": (P_UP, "pull", "Back", "related: Seated cable row", "Seated cable row reaching far forward to stretch before each pull."),
	"e161": (P_UP, "pull", "Back", "", "Single-arm lat pulldown with a band anchored overhead."),
	"e1e7": (P_UP, "pull", "Back", "related: Lat pulldown", "Lat pulldown with a narrow neutral grip."),
	"e1e8": (P_UP, "pull", "Back", "related: Lat pulldown", "Lat pulldown with parallel handles."),
	"e1e9": (P_UP, "pull", "Back", "related: Lat pulldown", "Lat pulldown worked one arm at a time."),
	"e1ea": (P_UP, "pull", "Back", "related: Lat pulldown", "Lat pulldown with an underhand grip."),
	"e1eq": (P_UP, "pull", "Back", "", "Face pull drawing a cable to the eyes for rear delts and traps."),
	"e1dn": (P_UP, "pull", "Shoulders", "related: Rear delt / lateral raise machine", "Reverse fly on double cables for the rear delts."),
	"e0kt": (P_UP, "pull", "Shoulders", "", "Rear delt fly opening a band at chest height."),
	"e134": (P_UP, "pull", "Arms", "", "Two-dumbbell biceps curl from standing."),
	"e10t": (P_UP, "pull", "Arms", "", "Hammer curl with a dumbbell in each hand, neutral grip."),
	"e05z": (P_UP, "pull", "Back", "", "Pull-up with feet resting on a box, the first bar rung."),
	"e14p": (P_UP, "pull", "Back", "", "Pull-up counterweighted by a band (needs a bar)."),
	"e0sx": (P_UP, "pull", "Back", "", "Half-range pull-up to build the mid pull."),
	"e01a": (P_UP, "pull", "Back", "", "Active hang with shoulders pulled down, a bar hang base."),
	"e0cc": (P_UP, "pull", "Back", "", "Bent-arm hang held at the top of the pull (needs a bar)."),
	"e0qc": (P_UP, "pull", "Back", "", "Hanging scapular pulls, retraction and protraction from a dead hang."),
	"e0qd": (P_UP, "pull", "Back", "", "Shoulder circles taken from a bar hang."),
	"e1cg2": None,  # placeholder removed below
	# ---- mobility ----
	"e0q5": (P_MOB, "core", "Legs", "", "Deep kneel with one ankle across, a pigeon-style hip opener squat."),
	"e03q": (P_MOB, "core", "Legs", "", "Frog stretch opening the hips in a wide quadruped position."),
	"e0ht": (P_MOB, "core", "Legs", "", "Rocking motion inside the frog stretch to deepen the adductors."),
	"e0aq": (P_MOB, "core", "Legs", "", "Seated wide-leg forward fold for the adductors and hamstrings."),
	"e0b7": (P_MOB, "core", "Legs", "", "Standing wide-leg fold toward the floor."),
	"e0kg": (P_MOB, "core", "Core", "", "Straddle side bend stretching the quadratus lumborum."),
	"e1b0": (P_MOB, "core", "Legs", "", "Straddle stretch against a wall weighted toward deeper range."),
	"e0wm": (P_MOB, "core", "Legs", "", "Supported middle split held short of full range."),
	"e00v": (P_MOB, "core", "Glutes", "", "Seated 90-90 hip position for internal and external rotation."),
	"e0i9": (P_MOB, "core", "Glutes", "", "Active 90-90 rotations driving hip rotation strength through range."),
	"e17v": (P_MOB, "core", "Legs", "", "Flow from a deep squat into the 90-90 hip position."),
	"e17u": (P_MOB, "core", "Glutes", "", "Deep squat with hip internal rotation work."),
	"e0o1": (P_MOB, "core", "Glutes", "", "Supported squat hip circles opening rotation."),
	"e0o2": (P_MOB, "core", "Core", "", "Squat position reaching the arms to open the upper back."),
	"e17r": (P_MOB, "core", "Legs", "", "Elbows prying the knees outward from a deep squat."),
	"e172": (P_MOB, "core", "Glutes", "", "Happy baby supine hip opener pulling the knees wide."),
	"e02a": (P_MOB, "hinge", "Back", "", "Back bridge hold opening the front of the hips and spine."),
	"e1f2": (P_MOB, "core", "Legs", "", "Dancer pose standing quad stretch with a shoulder opener."),
	"e17t": (P_MOB, "hinge", "Legs", "related: Hamstring stretch", "Kneeling half-split hamstring stretch."),
	"e18c": (P_MOB, "hinge", "Legs", "", "Seated forward fold resting on the heels for calves and hamstrings."),
	"e0fn": (P_MOB, "hinge", "Legs", "", "Triangle pose folding over one straight leg."),
	"e00i": (P_MOB, "hinge", "Legs", "", "Jefferson curl rolling down the spine under a light load."),
	"e182": (P_MOB, "calf", "Legs", "", "Kneel seated on the heels for a deep ankle dorsiflexion hold."),
	"e0b8": (P_MOB, "calf", "Legs", "", "Standing shift from toes to heels to move the ankle through range."),
	"e17p": (P_MOB, "calf", "Legs", "related: Ankle rocks", "Kneeling rock driving the knee over the toes for ankle range."),
	"e04z": (P_MOB, "posterior-chain", "Back", "", "Cobra pose extending the spine from prone."),
	"e0fu": (P_MOB, "push", "Shoulders", "", "Dolphin pose loading shoulder flexion and the hamstrings."),
	"e0j3": (P_MOB, "pull", "Shoulders", "", "Shoulder dislocates sweeping a strap overhead for shoulder range."),
	"e0b5": (P_MOB, "pull", "Shoulders", "", "Standing scapular retraction and protraction circles."),
	"e0ty": (P_MOB, "core", "Shoulders", "", "Chin-tuck neck retraction for the deep neck flexors."),
	"e0xq": (P_MOB, "push", "Back", "", "Extended puppy pose stretching the lats and upper back overhead."),
	"e0e8": (P_MOB, "core", "Glutes", "", "Seated figure-4 with an active leg raise for the piriformis."),
	"e0x1": (P_MOB, "core", "Glutes", "", "Seated figure-4 hold with the leg lifted and held."),
	"e0kv": (P_MOB, "core", "Legs", "related: Kneeling hip flexor stretch", "Kneeling lunge with hands down, the deepest hip flexor stretch hold."),
	"e0kd": (P_MOB, "pull", "Shoulders", "", "Arm screw stretch rotating the straight arm for shoulder range."),
	"e0nm": (P_MOB, "core", "Back", "", "Child pose resting fold for the back and hips."),
	"e0yy": (P_MOB, "core", "Legs", "related: Standing quad stretch", "Wall-supported deep quad stretch at end range, the couch stretch."),
}

# Remove the accidental placeholder key if present.
SEL.pop("e1cg2", None)

PARTS = [P_LEGS, P_POST, P_CORE, P_UP, P_MOB]
PART_TITLES = {
	P_LEGS: "Legs and front of hip",
	P_POST: "Posterior chain and calves",
	P_CORE: "Core, stability and plyometric",
	P_UP: "Upper body",
	P_MOB: "Mobility (stretches and holds)",
}

# Skip list: Calistree exercises our catalog already carries. id -> our name.
SKIP = {
	# legs and front of hip
	"e001": "Butt kicks (warm-up drill)",
	"e002": "High knees (warm-up drill)",
	"e02b": "Bulgarian split squat",
	"e0bb": "Step-up, Step-up onto a chair",
	"e01t": "Assisted pistol squat",
	"e0kz": "Kneeling hip flexor stretch",
	"e0u5": "Hip flexor stretch",
	"e0b2": "Standing quad stretch",
	"e067": "Quad stretch",
	"e0yy": "(overlaps) Wall quad stretch vs our standing quad stretch",
	"e0ee": "Nordic hamstring curl, Assisted Nordic curl",
	"e0em": "Sliding leg curl",
	"e0eg": "Calf raise, Double-leg calf raise",
	"e0ek": "Single-leg calf raise, Single-leg calf raise off a step",
	"e0zs": "Bent-knee soleus raise",
	"e0zt": "Bent-knee soleus raise (single-leg)",
	"e0rx": "Single-leg calf raise off a step",
	"e14s": "Dumbbell calf raise",
	"e14t": "Single-leg dumbbell calf raise",
	"e14a": "Dumbbell calf raise (weighted donkey calf raise)",
	"e14v": "Single-leg calf raise off a step (weighted ledge version)",
	"e1bx": "Seated leg curl, Lying leg curl",
	"e1bz": "Leg extension",
	"e1c1": "Leg press",
	"e1c5": "Leg press (single-leg variation)",
	"e1c9": "Leg press (seated horizontal press)",
	"e1cc": "Seated calf raise",
	"e1dq": "Standing calf raise (bar path)",
	"e0ff": "Clamshells (banded)",
	# posterior chain and calves
	"e0eh": "Glute bridge",
	"e0ei": "Single-leg glute bridge",
	"e0pj": "Barbell hip thrust, Hip thrust / glute drive machine",
	"e0eo": "(related) Reverse hyperextension vs our Back extension / reverse hyper",
	"e0rv": "(related) Prone hyperextension vs our Back extension",
	"e1ci": "Back extension / reverse hyper (45-degree hip extension)",
	"e1cn": "Back extension",
	"e1ck": "Back extension (weighted)",
	"e1bv": "Glute kickback machine",
	"e1ef": "Cable hip extension (kickback family)",
	"e1em": "Hip abduction machine (cable abduction)",
	"e166": "Hip abduction machine (banded seated)",
	"e0e6": "Supine figure-4 piriformis stretch",
	"e0e7": "Seated pigeon-style hip stretch",
	"e0bz": "Pigeon pose (figure-4 hip stretch)",
	"e0y6": "Leg swings (front to back)",
	"e0y7": "Leg swings (side to side)",
	"e0y9": "Leg swings (front to back)",
	"e0ya": "Leg swings (side to side)",
	"e0au": "Ankle circles and alphabet",
	"e0yz": "Knee-to-wall ankle rock",
	"e0yr": "Standing straight-knee calf stretch",
	"e0yq": "Standing straight-knee calf stretch (single-leg)",
	"e0f7": "(related) Wobble board calf stretch vs our standing calf stretch",
	# core, stability and plyometric
	"e0xo": "Plank",
	"e0ew": "Dead bug",
	"e0wu": "Dead bug (toe-tap march)",
	"e0wv": "Dead bug (alternating)",
	"e0in": "Bird dog",
	"e0lf": "Bird dog (double-arm-and-leg)",
	"e0ae": "Side plank",
	"e0af": "Side plank (dip variant)",
	"e0ag": "Side plank (knee-to-elbow variant)",
	"e0cy": "Side plank (leg-raise variant)",
	"e0g4": "Copenhagen adductor plank",
	"e0dv": "Cable woodchop / Pallof press",
	"e1es": "Cable woodchop / Pallof press",
	"e1e5": "Cable woodchop / Pallof press",
	"e1ep": "Cable woodchop / Pallof press",
	"e150": "Cable woodchop / Pallof press (kneeling)",
	"e1e3": "Ab crunch machine",
	"e1e0": "Smith machine squat",
	"e0ii": "Cat-cow",
	"e05j": "Incline push-up",
	"e0p5": "Archer push-up",
	"e087": "Push-up",
	# upper body
	"e07j": "Lat pulldown",
	"e14l": "Seated cable row, Seated row",
	"e1ch": "Seated row (machine)",
	"e1cr": "Shoulder press",
	"e1bp": "Hip adduction machine",
	"e1bs": "Chest press / pec deck (cable fly)",
	"e0e4": "Dumbbell lateral raise, Rear delt / lateral raise machine",
	"e0gt": "Band pull-apart",
	"e0gr": "Dumbbell farmer carry, Farmer / trap-bar carry",
	"e13g": "Suitcase carry",
	"e0g0": "Renegade row",
	"e131": "Dumbbell row",
	"e132": "One-arm dumbbell row (single dumbbell)",
	"e07g": "One-arm dumbbell row",
	"e0ju": "Turkish get-up",
	"e0jt": "Turkish get-up (half)",
	"e0jn": "Two-hand kettlebell swing",
	"e0jq": "Goblet squat, Dumbbell goblet squat, Kettlebell goblet squat",
	"e0k3": "Reverse lunge, Dumbbell reverse lunge",
	"e0h1": "Barbell front squat",
	"e0h0": "Barbell back squat",
	"e0jj": "Single-leg kettlebell deadlift",
	"e0jk": "Dumbbell overhead press",
	"e13b": "Dumbbell overhead press (double)",
	"e154": "Seated row (bent-over dumbbell)",
	"e10n": "Dumbbell row (chest-supported)",
	"e1ei": "Rear delt / lateral raise machine (cable lateral raise)",
	"e1ej": "Tricep extension (cable overhead variant)",
	"e1eb": "Bicep curl (single-arm cable curl)",
	"e1ed": "Bicep curl (cable curl)",
	# mobility
	"e037": "Downward dog",
	"e0c1": "Pigeon pose (figure-4 hip stretch)",
	"e02d": "Seated butterfly adductor stretch",
	"e0q4": "Hamstring stretch (kneeling forward fold)",
	"e0x0": "Supine hamstring stretch with strap",
	"e0e6": "Supine figure-4 piriformis stretch",
	"e0e7": "Seated pigeon-style hip stretch",
	"e056": "Hip circles",
	"e0ke": "Thoracic rotations (quadruped t-spine)",
	"e0uk": "Thoracic rotations (quadruped t-spine)",
	"e10b": "Thoracic rotation (supine)",
	"e0zx": "Kneeling lat stretch (side child)",
	"e0da": "Doorway chest stretch (wall pec)",
	"e06r": "Doorway chest stretch (lying pec)",
	"e0b3": "Arm circles",
	"e0a8": "Arm circles",
	"e0y2": "Arm circles (crossover)",
	"e16p": "Hip circles (standing)",
	"e16q": "Cat-cow (standing)",
	"e16o": "Cat-cow (circling)",
	"e17d": "Hip circles (assisted standing)",
	"e17g": "Cat-cow (one-leg)",
	"e14h": "Foam roll quads",
	"e14i": "Foam roll glutes",
	"e14j": "Foam roll hamstrings",
	"e0j4": "Foam roll (back)",
	"e0j5": "Foam roll (armpit/lat)",
	"e0j6": "Foam roll (side)",
}
SKIP = {k: v for k, v in SKIP.items() if v}

PART_SKIP_KEYS = {
	P_LEGS: ["e001", "e002", "e02b", "e0bb", "e0kz", "e0u5", "e0b2", "e067",
	         "e0ee", "e0em", "e0eg", "e0ek", "e0zs", "e0zt",
	         "e0rx", "e14s", "e14t", "e1bx", "e1bz", "e1c1", "e1c5", "e1c9", "e1cc",
	         "e1dq", "e0ff"],
	P_POST: ["e0eh", "e0ei", "e0pj", "e1ci", "e1cn", "e1ck", "e1bv",
	         "e1ef", "e1em", "e166", "e0e6", "e0e7", "e0bz", "e0y6", "e0y7", "e0y9",
	         "e0ya", "e0au", "e0yz", "e0yr", "e0yq", "e0f7", "e14a", "e14v"],
	P_CORE: ["e0xo", "e0ew", "e0wu", "e0wv", "e0in", "e0lf", "e0ae", "e0af", "e0ag",
	         "e0cy", "e0g4", "e0dv", "e1es", "e1e5", "e1ep", "e150", "e1e3", "e1e0",
	         "e0ii", "e05j", "e0p5", "e087"],
	P_UP: ["e07j", "e14l", "e1ch", "e1cr", "e1bp", "e1bs", "e0e4", "e0gt", "e0gr",
	       "e13g", "e0g0", "e131", "e132", "e07g", "e0ju", "e0jt", "e0jn", "e0jq",
	       "e0k3", "e0h1", "e0h0", "e0jj", "e0jk", "e13b", "e154", "e10n",
	       "e1ej", "e1ed", "e1ei", "e1eb"],
	P_MOB: ["e037", "e0c1", "e02d", "e0q4", "e0x0", "e0e6", "e0e7", "e056", "e0ke",
	        "e0uk", "e10b", "e0zx", "e0da", "e06r", "e0b3", "e0a8", "e0y2", "e16p",
	        "e16q", "e16o", "e17d", "e17g", "e14h", "e14i", "e14j", "e0j4", "e0j5",
	        "e0j6"],
}

URL_BASE = "https://calistree.app/datasheet/"


def load_rows():
	rows = {}
	lines = (RAW / "calistree-classified.tsv").read_text().splitlines()
	header = lines[0].split("\t")
	for line in lines[1:]:
		r = dict(zip(header, line.split("\t")))
		rows[r["id"]] = r
	return rows


def slugify(name: str) -> str:
	s = name.lower()
	s = s.replace("'", "")
	out = []
	for ch in s:
		if ch.isalnum():
			out.append(ch)
		elif ch in " -.,()/":
			out.append("-")
	slug = "".join(out)
	while "--" in slug:
		slug = slug.replace("--", "-")
	return slug.strip("-")


def level_label(r) -> str:
	return r["our_level"] or r["level"].lower()


def main():
	rows = load_rows()
	# sanity: every selected id exists
	missing = [i for i in SEL if i not in rows]
	if missing:
		raise SystemExit(f"unknown ids: {missing}")
	out = []
	out.append("# Wave 8 candidates: the Calistree harvest, selected")
	out.append("")
	out.append("Selected from calistree.app's exercise library (1,961 datasheet pages harvested on")
	out.append("2026-11-27; method and raw evidence in raw/). Each candidate lists our proposed slug,")
	out.append("display name (Calistree's name, cited), our muscle group and movement pattern,")
	out.append("equipment, level, the source URL, and a one-line description in our own words.")
	out.append("Calistree's level words map to ours: Novice and Beginner = beginner,")
	out.append("Intermediate = intermediate, Advanced = advanced. Elite and Herculean skills")
	out.append("(111 exercises) were excluded as circus-skill work no runner plan needs.")
	out.append("")
	out.append("Items our catalog already carries are not in these tables; each partition ends")
	out.append("with a skip list naming them so the research sessions do not re-research them.")
	out.append("Where a Calistree exercise is a near-variant of ours but distinct enough to add,")
	out.append("the Have column says what it overlaps.")
	out.append("")
	for part in PARTS:
		items = [(i, v) for i, v in SEL.items() if v[0] == part]
		items.sort(key=lambda kv: (kv[1][2], kv[1][1], rows[kv[0]]["name"].lower()))
		out.append(f"## {PART_TITLES[part]}")
		out.append("")
		out.append("| slug | display name | muscle group | pattern | equipment | level | Calistree URL | Have | what it is |")
		out.append("| --- | --- | --- | --- | --- | --- | --- | --- | --- |")
		for i, (_, pattern, group, have, desc) in items:
			r = rows[i]
			slug = slugify(r["name"])
			url = f"{URL_BASE}{r['slug']}-{i}"
			eq = r["tier"] if r["tier"] in ("bodyweight", "dumbbells", "bands", "machines") else r["tier"]
			eq_txt = r["equipment"] if r["equipment"] else r["tier"]
			out.append(f"| `{slug}` | {r['name']} | {group} | {pattern} | {eq_txt} ({eq}) |"
				f" {level_label(r)} | {url} | {have} | {desc} |")
		out.append("")
		skip_ids = [k for k in PART_SKIP_KEYS.get(part, []) if k in rows]
		if skip_ids:
			out.append(f"### Already in our catalog, skip ({len(skip_ids)})")
			out.append("")
			out.append("| Calistree exercise | our entry it duplicates |")
			out.append("| --- | --- |")
			for i in sorted(skip_ids, key=lambda x: rows[x]["name"].lower()):
				r = rows[i]
				url = f"{URL_BASE}{r['slug']}-{i}"
				out.append(f"| [{r['name']}]({url}) | {SKIP[i]} |")
			out.append("")
	counts = {p: sum(1 for v in SEL.values() if v[0] == p) for p in PARTS}
	skip_total = sum(len([k for k in v if k in rows]) for v in PART_SKIP_KEYS.values())
	out.append("## Counts")
	out.append("")
	for p in PARTS:
		out.append(f"- {PART_TITLES[p]}: {counts[p]}")
	out.append(f"- Total new candidates: {sum(counts.values())}")
	out.append(f"- Skip-list entries (already ours): {skip_total}")
	out.append("")
	(HERE.parent / "01-candidates.md").write_text("\n".join(out) + "\n")
	print("partitions:", counts, "total:", sum(counts.values()))


if __name__ == "__main__":
	main()
