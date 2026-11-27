/**
 * The machine and cable catalog, used to build strength sessions and to drill
 * down into per-exercise detail. It holds the Planet Fitness baseline the app
 * started with, the common-chain machines the gym presets reference, and the
 * rest of the Planet Fitness floor the research found. Names match the gym
 * presets exactly, so a preset name always resolves to an entry here. Adding a
 * machine is a data change, never new code.
 * Cues mirror the researched exercise library (research/wave-2/4a, 4b; wave-5/13e).
 */

/** Movement pattern, used to balance push/pull, legs and core. */
export type MovePattern =
	| 'pull'
	| 'push'
	| 'squat'
	| 'hinge'
	| 'knee-extension'
	| 'knee-flexion'
	| 'posterior-chain'
	| 'calf'
	| 'core'
	| 'plyometric'
	| 'cardio';

export interface MachineExercise {
	name: string;
	muscles: string[];
	pattern: MovePattern;
	/** Training tool, when the move belongs to one (dumbbells, barbell, kettlebell, bands, home, cable, machine). */
	equipment?: string;
	/** Difficulty rung, used by the bodyweight progression ladder. */
	level?: 'beginner' | 'intermediate' | 'advanced';
	/** One plain sentence on why this matters for running. */
	why: string;
	/** Short "where you should feel it" cue. */
	feel: string;
	/** Key technique cues (3–4), in plain language. */
	form: string[];
	/** Common mistakes to avoid. */
	mistakes: string[];
}

export const PF_MACHINES: MachineExercise[] = [
	{
		name: 'Leg press',
		muscles: ['quadriceps', 'glutes'],
		pattern: 'squat',
		why: 'Leg drive for the climbs and the last mile, when your legs start to fade.',
		feel: 'Front of the thighs and glutes; not your lower back.',
		form: [
			'Feet shoulder-width on the platform, whole foot in contact.',
			'Lower until knees are about 90°, no deeper if your back rounds.',
			'Press through mid-foot without locking the knees hard.',
		],
		mistakes: ['Letting the lower back round off the pad', 'Bouncing at the bottom'],
	},
	{
		name: 'Leg curl',
		muscles: ['hamstrings'],
		pattern: 'knee-flexion',
		why: 'Hamstrings brake every stride and carry the load on downhills.',
		feel: 'Back of the thighs.',
		form: [
			'Line the knee up with the machine pivot.',
			'Curl smoothly, squeeze the hamstrings at the top.',
			"Lower under control; don't let the stack slam.",
		],
		mistakes: ['Using momentum to swing the pad', 'Hips lifting off the seat'],
	},
	{
		name: 'Leg extension',
		muscles: ['quadriceps'],
		pattern: 'knee-extension',
		why: 'Quads absorb each landing and push you up the climbs.',
		feel: 'Front of the thighs, above the knee.',
		form: [
			'Knee in line with the pivot; pad on the shin, not the foot.',
			'Extend to a straight leg without hyperextending.',
			'Control the return.',
		],
		mistakes: ['Kicking up fast and dropping', 'Seat set too low'],
	},
	{
		name: 'Back extension',
		muscles: ['erector spinae', 'glutes'],
		pattern: 'hinge',
		why: 'Holds your posture tall when you tire late in a long run.',
		feel: 'Lower back and glutes, controlled and never sharp.',
		form: [
			'Hinge from the hips with a neutral spine.',
			'Rise to a straight line without arching past neutral.',
			'Move slowly; stop if you feel it in the joints.',
		],
		mistakes: ['Overextending at the top', 'Jerky reps'],
	},
	{
		name: 'Seated row',
		muscles: ['mid-back', 'lats', 'biceps'],
		pattern: 'pull',
		why: 'A strong upper back keeps your arms relaxed and your posture steady.',
		feel: 'Between the shoulder blades.',
		form: [
			'Sit tall; chest up, small bend in the knees.',
			'Pull the handle to your lower ribs, elbows close.',
			'Squeeze the shoulder blades, then release slowly.',
		],
		mistakes: ['Leaning back to yank the weight', 'Shrugging the shoulders'],
	},
	{
		name: 'Shoulder press',
		muscles: ['shoulders', 'triceps'],
		pattern: 'push',
		why: 'Steady shoulders keep your arm swing loose over long distances.',
		feel: 'Top of the shoulders.',
		form: [
			'Handles at shoulder height, wrists stacked.',
			'Press up and slightly in, without shrugging.',
			'Lower to a comfortable range, with no clanking.',
		],
		mistakes: ['Arching the lower back', 'Bouncing out of the bottom'],
	},
	{
		name: 'Bicep curl',
		muscles: ['biceps'],
		pattern: 'pull',
		why: 'Arm strength keeps your form relaxed when you are tired.',
		feel: 'Front of the upper arms.',
		form: [
			'Elbows pinned to your sides.',
			'Curl without swinging the torso.',
			'Lower slowly to a near-straight arm.',
		],
		mistakes: ['Swinging with the back', 'Half reps at speed'],
	},
	{
		name: 'Tricep extension',
		muscles: ['triceps'],
		pattern: 'push',
		why: 'Triceps drive the arm swing and help you hold good posture.',
		feel: 'Back of the upper arms.',
		form: [
			'Elbows fixed in place, upper arms still.',
			'Extend fully, squeeze, then return under control.',
			'Keep shoulders relaxed.',
		],
		mistakes: ['Elbows drifting', 'Using body weight to push down'],
	},
	{
		name: 'Lat pulldown',
		muscles: ['latissimus dorsi', 'biceps brachii', 'rhomboids', 'lower trapezius'],
		pattern: 'pull',
		equipment: 'cable',
		why: 'Builds the back and shoulder muscles that hold posture and support arm swing, which help you stay tall late in a long run.',
		feel: 'Tension under the armpits and between the shoulder blades, not mainly in the arms.',
		form: [
			'Set the thigh pad snug so the hips stay down.',
			'Start with the arms straight and shoulders reaching up, then pull the bar to the upper chest by driving the elbows down.',
			'Return slowly until the arms are straight and the shoulder blades spread.',
		],
		mistakes: [
			'Leaning back and turning it into a row.',
			'Pulling the bar behind the neck.',
			'Shrugging the shoulders toward the ears.',
		],
	},
	{
		name: 'Seated cable row',
		muscles: [
			'latissimus dorsi',
			'rhomboids',
			'middle trapezius',
			'posterior deltoid',
			'biceps brachii',
		],
		pattern: 'pull',
		equipment: 'cable',
		why: 'Trains the upper back and posture muscles that keep the shoulders from rounding on long runs.',
		feel: 'Work between the shoulder blades and along the sides of the back.',
		form: [
			'Sit tall with a slight knee bend and the chest up.',
			'Pull the handle to the lower chest while squeezing the shoulder blades together.',
			'Let the arms straighten and the shoulder blades spread on the return.',
		],
		mistakes: [
			'Rocking the torso back and forth.',
			'Shrugging the shoulders.',
			'Cutting the return short.',
		],
	},
	{
		name: 'Chest press / pec deck (cable fly)',
		muscles: ['pectoralis major', 'anterior deltoid', 'triceps brachii'],
		pattern: 'push',
		equipment: 'machine',
		why: 'Keeps the pushing muscles and shoulders balanced against all the pulling work, which supports posture and a strong arm drive.',
		feel: 'Effort across the chest and the front of the shoulders.',
		form: [
			'Set the seat so the handles line up with the middle of the chest.',
			'Press until the arms are straight without locking hard, or bring the handles together for the fly.',
			'Return under control until the hands are level with the chest.',
		],
		mistakes: [
			'Seat too high or too low, which shifts the load to the shoulders or neck.',
			'Letting the shoulders roll forward at the bottom.',
			'Using heavy weight and turning the fly into a press.',
		],
	},
	{
		name: 'Hip abduction machine',
		muscles: ['gluteus medius', 'gluteus maximus', 'gluteus minimus'],
		pattern: 'posterior-chain',
		equipment: 'machine',
		why: 'Loads the hip abductors that control the pelvis and knee, and targets the gluteus medius better than free weights.',
		feel: 'Work on the outside of the hip and upper glute, not the front of the hip.',
		form: [
			'Sit tall with the pads on the outside of the thighs.',
			'Push the knees apart against the pads without leaning back.',
			'Return slowly and keep tension on the way in.',
		],
		mistakes: [
			'Using momentum to snap the legs open.',
			'Leaning the torso back to cheat the range.',
			'Loading so heavy that the front of the hip takes over.',
		],
	},
	{
		name: 'Hip adduction machine',
		muscles: ['adductor magnus', 'adductor longus', 'adductor brevis', 'gracilis'],
		pattern: 'posterior-chain',
		equipment: 'machine',
		why: 'Trains the inner-thigh adductors that running also loads and that help stabilise the leg, a direct way to build the strength behind groin-injury prevention.',
		feel: 'Work on the inside of the thighs.',
		form: [
			'Sit with the pads on the inside of the knees.',
			'Squeeze the legs together under control.',
			'Open slowly back to the start without letting the pads fly.',
		],
		mistakes: [
			'Bouncing at the end of the squeeze.',
			'Using a range that pinches the front of the hip.',
			'Loading too heavy and losing control of the return.',
		],
	},
	{
		name: 'Hip thrust / glute drive machine',
		muscles: ['gluteus maximus', 'biceps femoris', 'hamstrings'],
		pattern: 'hinge',
		equipment: 'machine',
		why: 'The most direct way to load hip extension, which trains the gluteus maximus and hamstrings harder than a squat.',
		feel: 'Work in the glutes and the back of the thighs, not the lower back.',
		form: [
			'Set the pad across the hips and plant the feet so the shins are near vertical at the top.',
			'Drive the hips up until the body is straight, squeezing the glutes.',
			'Lower until the hips are just off the pad and repeat.',
		],
		mistakes: [
			'Arching the lower back at the top instead of finishing with the glutes.',
			'Feet too far forward, which turns it into a hamstring move.',
			'Pushing through the toes and losing the heels.',
		],
	},
	{
		name: 'Seated calf raise',
		muscles: ['soleus', 'gastrocnemius'],
		pattern: 'calf',
		equipment: 'machine',
		why: 'Trains the soleus, a major force producer in running, by bending the knee and shifting work away from the gastrocnemius.',
		feel: 'Deep work in the lower calf and near the Achilles.',
		form: [
			'Place the balls of the feet on the platform with the knees bent about 90 degrees.',
			'Lower the heels for a full stretch, then press up onto the toes.',
			'Pause at the top and lower slowly.',
		],
		mistakes: [
			'Bouncing out of the bottom stretch.',
			'Cutting the range short.',
			'Letting the knees drift so the load moves to the quads.',
		],
	},
	{
		name: 'Standing calf raise',
		muscles: ['gastrocnemius', 'soleus'],
		pattern: 'calf',
		equipment: 'machine',
		why: 'Trains both calf muscles with the knee straight, adding the gastrocnemius that the seated version leaves out; the two positions together cover the calf.',
		feel: 'Work high in the calf and a stretch down near the heel.',
		form: [
			'Stand with the balls of the feet on the platform and the knees almost straight.',
			'Lower the heels for a full stretch, then press up onto the toes.',
			'Pause at the top and lower slowly.',
		],
		mistakes: [
			'Bending the knees and turning it into a squat.',
			'Using a small range with no stretch.',
			'Bouncing with momentum.',
		],
	},
	{
		name: 'Smith machine squat',
		muscles: ['quadriceps', 'gluteus maximus', 'adductor magnus'],
		pattern: 'squat',
		equipment: 'machine',
		why: 'A guided squat that loads the legs with less balance demand than a free squat, useful when a barbell squat is not comfortable.',
		feel: 'Work in the front of the thighs and the glutes.',
		form: [
			'Set the bar on the upper back and the feet slightly in front of the bar.',
			'Sit down and back until the thighs are near parallel, keeping the chest up.',
			'Drive through the whole foot to stand.',
		],
		mistakes: [
			'Feet too far under the bar, which pushes the knees forward.',
			'Letting the heels lift.',
			'Rounding the lower back at the bottom.',
		],
	},
	{
		name: 'Hack squat',
		muscles: ['quadriceps', 'gluteus maximus'],
		pattern: 'squat',
		equipment: 'machine',
		why: 'A machine squat that lets you load the quadriceps heavily with the back supported, good for leg strength without spinal loading.',
		feel: 'Heavy work in the front of the thighs.',
		form: [
			'Set the shoulders under the pads and the feet mid-platform.',
			'Lower until the knees are bent to a comfortable depth.',
			'Press through the whole foot to stand without locking hard.',
		],
		mistakes: [
			'Going deeper than the hips can control, which rounds the lower back.',
			'Letting the knees cave in.',
			'Bouncing out of the bottom.',
		],
	},
	{
		name: 'Pendulum squat',
		muscles: ['quadriceps', 'gluteus maximus'],
		pattern: 'squat',
		equipment: 'machine',
		why: 'A guided squat on a curved arc that keeps the torso upright and loads the quadriceps deeply with a stable path.',
		feel: 'Deep work in the front of the thighs with the chest staying tall.',
		form: [
			'Set the shoulders under the pads and the feet flat on the platform.',
			'Lower on the arc until you reach a controlled depth.',
			'Drive up through the whole foot to stand.',
		],
		mistakes: [
			'Loading too heavy before the depth is controlled.',
			'Letting the hips tuck under at the bottom.',
			'Pushing only through the toes.',
		],
	},
	{
		name: 'Leg press (single-leg variation)',
		muscles: ['quadriceps', 'gluteus maximus', 'adductor magnus', 'hamstrings'],
		pattern: 'squat',
		equipment: 'machine',
		why: 'Loads the whole lower body with no spinal load, and a single-leg version adds balance and side-to-side strength that running depends on.',
		feel: 'Work through the front of the thigh and the glute.',
		form: [
			'Set the feet flat on the platform about hip width, or use one foot for the single-leg version.',
			'Lower until the knees are bent to a comfortable depth without the hips rolling under.',
			'Press through the whole foot without locking the knees hard.',
		],
		mistakes: [
			'Going so deep the tailbone tucks under.',
			'Letting the heels lift.',
			'For the single-leg version, letting the knee cave inward.',
		],
	},
	{
		name: 'Cable pull-through',
		muscles: ['gluteus maximus', 'hamstrings', 'erector spinae'],
		pattern: 'hinge',
		equipment: 'cable',
		why: 'Teaches the hip hinge and loads the glutes and hamstrings with a light spinal load, a good cable alternative to the hip thrust.',
		feel: 'Stretch in the back of the thighs as you hinge and a squeeze in the glutes at the top.',
		form: [
			'Face away from a low pulley with the rope between the legs.',
			'Push the hips back and let the rope pull the hands between the legs.',
			'Squeeze the glutes to stand tall without leaning back.',
		],
		mistakes: [
			'Turning it into a squat by bending the knees too much.',
			'Rounding the lower back at the bottom.',
			'Leaning back and arching at the top.',
		],
	},
	{
		name: 'Cable woodchop / Pallof press',
		muscles: ['obliques', 'rectus abdominis', 'transverse abdominis', 'quadratus lumborum'],
		pattern: 'core',
		equipment: 'cable',
		why: 'Trains the trunk to resist rotation and side bending, which supports the stable pelvis that running needs.',
		feel: 'Work across the waist and deep in the trunk as you resist the cable pulling you around.',
		form: [
			'Set the pulley at chest height and stand side-on to it.',
			'For the Pallof press, hold the handle at the chest and press straight out without letting the torso rotate.',
			'For the woodchop, pull the handle down and across under control, then return slowly.',
		],
		mistakes: [
			'Letting the torso twist instead of resisting it.',
			'Using the arms only with no trunk tension.',
			'Rushing the return.',
		],
	},
	{
		name: 'Assisted pull-up / dip',
		muscles: ['latissimus dorsi', 'biceps brachii', 'pectoralis major', 'triceps brachii'],
		pattern: 'pull',
		equipment: 'machine',
		why: 'A scalable way to train pulling and pushing strength for posture and upper-body balance, useful for general fitness more than running speed.',
		feel: 'Work in the back and arms, with the assist taking part of your body weight.',
		form: [
			'Set the assist so you can complete the reps with good form.',
			'Pull until the chin clears the bar, or lower until the elbows are bent about 90 degrees for dips.',
			'Return under control to a full stretch.',
		],
		mistakes: [
			'Choosing too little assist and using momentum.',
			'Cutting the range short.',
			'Shrugging the shoulders at the bottom.',
		],
	},
	{
		name: 'Back extension / reverse hyper',
		muscles: ['erector spinae', 'gluteus maximus', 'hamstrings'],
		pattern: 'posterior-chain',
		equipment: 'machine',
		why: 'Trains the lower back and posterior chain; a machine with pelvic restraint isolates the lumbar extensors better than a bench, and the reverse hyper loads the glutes and hamstrings with a light spinal load.',
		feel: 'Work along the lower back and into the glutes.',
		form: [
			'Set the pad so the pelvis is held and the hips can move freely.',
			'Extend smoothly against the pad and stop before the back hyperextends.',
			'Lower under control without collapsing.',
		],
		mistakes: [
			'Swinging with the hips and glutes when the goal is the lower back.',
			'Bouncing into end-range hyperextension.',
			'Setting the pad so the pelvis lifts.',
		],
	},
	{
		name: 'Seated leg curl',
		muscles: ['hamstrings', 'gastrocnemius'],
		pattern: 'knee-flexion',
		equipment: 'machine',
		why: 'Isolates the hamstrings through knee flexion; emphasise the lowering phase to train the eccentric quality that protects against hamstring strains.',
		feel: 'Work in the back of the thigh, not the calf.',
		form: [
			'Line the knee up with the machine pivot and set the pad just above the ankles.',
			'Pull the pad toward the thighs and keep the hips down.',
			'Lower slowly to near-full knee extension.',
		],
		mistakes: [
			'Letting the hips lift off the seat.',
			'Swinging the pad with momentum.',
			'Placing the pad on the calf instead of above the ankle.',
		],
	},
	{
		name: 'Rear delt / lateral raise machine',
		muscles: ['posterior deltoid', 'lateral deltoid', 'trapezius'],
		pattern: 'pull',
		equipment: 'machine',
		why: 'Trains the shoulder muscles that hold the arms and posture; a low-priority machine for running but useful for balanced shoulders and healthy posture.',
		feel: 'Work on the back and side of the shoulder.',
		form: [
			'Set the seat so the handles sit at shoulder height.',
			'Raise the arms out to the sides, or back for the rear delt, to shoulder level.',
			'Lower under control.',
		],
		mistakes: [
			'Shrugging the shoulders to lift the weight.',
			'Using momentum and swinging.',
			'Raising above shoulder height.',
		],
	},
	{
		name: 'Farmer / trap-bar carry',
		muscles: [
			'forearm flexors',
			'upper trapezius',
			'obliques',
			'quadratus lumborum',
			'gluteus maximus',
		],
		pattern: 'core',
		equipment: 'machine',
		why: 'Loads grip, trunk and lower body while you walk, training the anti-rotation and posture muscles that support a stable stride.',
		feel: 'Grip and forearms working hard, with the sides of the trunk braced to stay upright.',
		form: [
			'Pick up a heavy weight in each hand, or use a trap bar, with a flat back.',
			'Stand tall with the shoulders back and the ribs down.',
			'Walk short, controlled steps for the set distance without letting the weights swing.',
		],
		mistakes: [
			'Letting the shoulders round forward.',
			'Leaning to one side or letting the torso sway.',
			'Taking long strides that make the weights swing.',
		],
	},
	{
		name: 'Lying leg curl',
		muscles: ['hamstrings', 'gastrocnemius'],
		pattern: 'knee-flexion',
		equipment: 'machine',
		why: 'Trains the hamstrings through knee flexion on a flat bench, the setup some runners find easier to control than the seated version.',
		feel: 'Work in the back of the thigh, not the calf.',
		form: [
			'Lie face down with the knees just past the edge of the bench and the pad above the heels.',
			'Curl the heels toward the glutes without lifting the hips.',
			'Lower slowly to near-full knee extension.',
		],
		mistakes: [
			'Lifting the hips off the bench to swing the pad.',
			'Swinging the weight up and letting it drop.',
			'Setting the pad on the calf instead of above the heel.',
		],
	},
	{
		name: 'Glute kickback machine',
		muscles: ['gluteus maximus', 'hamstrings'],
		pattern: 'hinge',
		equipment: 'machine',
		why: 'Loads the gluteus maximus through hip extension, a direct way to build the hip drive that pushes you forward on every stride.',
		feel: 'Work in the working glute, not the lower back.',
		form: [
			'Set the pad against the back of the thigh and brace the torso on the support.',
			'Push the leg back and up by squeezing the glute, keeping the hips square.',
			'Return slowly without letting the pad slam.',
		],
		mistakes: [
			'Arching the lower back to add range.',
			'Twisting the hips to one side.',
			'Using a fast, uncontrolled kick.',
		],
	},
	{
		name: 'Ab crunch machine',
		muscles: ['rectus abdominis', 'obliques'],
		pattern: 'core',
		equipment: 'machine',
		why: 'Trains the trunk to flex under load, which adds to the core work that holds your posture when you tire late in a run.',
		feel: 'Work across the front of the stomach, not the hip flexors.',
		form: [
			'Set the seat so the chest pad sits high and the hips are pinned.',
			'Curl the ribs toward the pelvis through a short range.',
			'Return slowly and keep tension on the way back.',
		],
		mistakes: [
			'Pulling with the arms and neck.',
			'Using a range so long it turns into a hip hinge.',
			'Bouncing out of the bottom.',
		],
	},
	{
		name: 'Rotary torso machine',
		muscles: ['obliques', 'rectus abdominis', 'transverse abdominis'],
		pattern: 'core',
		equipment: 'machine',
		why: 'Trains the trunk to rotate under control, which supports the pelvis through the twist of each running stride.',
		feel: 'Work across the waist, not a sharp pull in the lower back.',
		form: [
			'Set the seat so the pads sit across the shoulders and the hips are held.',
			'Turn through a comfortable range, stopping short of any pinch.',
			'Return slowly and keep the hips still.',
		],
		mistakes: [
			'Loading heavy and yanking into the turn.',
			'Letting the hips rotate with the torso.',
			'Forcing a range that pinches the lower back.',
		],
	},
	{
		name: "Captain's chair leg raise",
		muscles: ['rectus abdominis', 'hip flexors', 'obliques'],
		pattern: 'core',
		equipment: 'machine',
		why: 'Trains the lower trunk and hip flexors with the body hanging, a good finisher for the core that steadies your stride.',
		feel: 'Work low in the stomach, with a stretch as the legs lower.',
		form: [
			'Rest the forearms on the pads and let the body hang with the shoulders down.',
			'Raise the knees, or straight legs, under control and curl the pelvis up.',
			'Lower slowly without swinging.',
		],
		mistakes: [
			'Swinging the legs for momentum.',
			'Letting the shoulders creep up to the ears.',
			'Dropping the legs fast between reps.',
		],
	},
	{
		name: 'Rowing machine',
		muscles: ['quadriceps', 'glutes', 'latissimus dorsi', 'rhomboids', 'biceps brachii'],
		pattern: 'cardio',
		equipment: 'machine',
		why: 'Low-impact aerobic work that also trains the legs and upper back, a good way to add cross-training volume without more running impact.',
		feel: 'Legs driving first, then the back pulling, with the arms finishing the stroke.',
		form: [
			'Sit tall and drive with the legs before the back swings.',
			'Pull the handle to the lower ribs as the legs finish, shoulders down.',
			'Return arms first, then hinge forward, then bend the knees.',
		],
		mistakes: [
			'Pulling with the arms before the legs.',
			'Rowing with a rounded lower back.',
			'Rushing the recovery between strokes.',
		],
	},
	{
		name: 'Battling ropes',
		muscles: ['deltoids', 'pectoralis major', 'forearms'],
		pattern: 'cardio',
		equipment: 'battle ropes',
		why: 'A short, hard conditioning move that lifts the heart rate and works the shoulders and trunk without loading the legs.',
		feel: 'Burning in the shoulders and a quick breath, with the trunk holding you steady.',
		form: [
			'Hold a rope in each hand with the knees soft and the chest up.',
			'Drive one arm up and the other down fast, alternating.',
			'Keep the waves reaching the anchor and the hips still.',
		],
		mistakes: [
			'Standing tall and swinging the arms instead of driving waves.',
			'Letting the shoulders round forward.',
			'Holding the breath.',
		],
	},
	{
		name: 'Medicine-ball chest pass',
		muscles: ['pectoralis major', 'deltoids', 'triceps brachii'],
		pattern: 'push',
		equipment: 'medicine ball',
		why: 'Trains upper-body power the way a push does, quick and forceful, which is useful for arm drive and general athleticism.',
		feel: 'A strong push through the chest and arms as you throw.',
		form: [
			'Hold the ball at the chest with the elbows out.',
			'Throw it straight forward to a partner or wall.',
			'Catch and reset, then repeat with the same force.',
		],
		mistakes: [
			'Pushing with the arms only and no leg or hip drive.',
			'Throwing with a rounded back.',
			'Letting the effort drop as the set goes on.',
		],
	},
	{
		name: 'Medicine-ball slam',
		muscles: ['rectus abdominis', 'latissimus dorsi', 'deltoids'],
		pattern: 'core',
		equipment: 'medicine ball',
		why: 'A trunk-driven power move that trains the abs to snap the whole body, the kind of force transfer that helps at the end of a run.',
		feel: 'The abs and lats doing the work as you drive the ball down.',
		form: [
			'Lift the ball overhead with the arms long.',
			'Slam it down hard with the whole trunk, hinging at the hips.',
			'Pick it up and reset, keeping the back flat.',
		],
		mistakes: [
			'Slamming with the arms only and no trunk.',
			'Rounding the lower back on the pick-up.',
			'Rushing so the slams get smaller.',
		],
	},
	{
		name: 'TRX row',
		muscles: ['latissimus dorsi', 'rhomboids', 'biceps brachii'],
		pattern: 'pull',
		equipment: 'suspension trainer',
		why: 'A bodyweight row on the suspension straps that trains the upper back and the trunk holding you steady, with no demo frames in the open library yet.',
		feel: 'The back working as you pull the chest to the handles, with the trunk braced.',
		form: [
			'Hold the handles and lean back so the body is straight and the heels take the weight.',
			'Pull the chest up to the handles, elbows in and shoulders down.',
			'Lower slowly to a straight line, keeping the hips up.',
		],
		mistakes: [
			'Letting the hips sag so the body bends at the waist.',
			'Pulling with the arms only and no shoulder-blade movement.',
			'Standing too upright so there is no load.',
		],
	},
];

/** A running-relevant strength circuit: legs + posterior chain + push/pull balance. */
export function defaultCircuit(
	available: string[] = PF_MACHINES.map((m) => m.name),
): MachineExercise[] {
	const byName = new Map(PF_MACHINES.map((m) => [m.name, m]));
	const want = [
		'Leg press',
		'Leg curl',
		'Back extension',
		'Leg extension',
		'Seated row',
		'Shoulder press',
		'Bicep curl',
		'Tricep extension',
	];
	return want
		.map((n) => byName.get(n))
		.filter((m): m is MachineExercise => !!m && available.includes(m.name));
}

export function findMachine(name?: string): MachineExercise | undefined {
	if (!name) return undefined;
	return PF_MACHINES.find((m) => m.name === name);
}
