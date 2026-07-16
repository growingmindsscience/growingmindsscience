/**
 * Controlled vocabulary of observable developmental mechanisms (plan 2.1:
 * "intention line that names no observable developmental mechanism" is a
 * grader hard-fail; the check is membership in this list). ~40 tags across
 * the six domains. Matthew ratifies and extends; the grader only ever
 * checks membership, so additions are safe.
 */
export const MECHANISM_TAGS: Record<string, string> = {
  // language
  joint_attention: "Shared focus on an object or event",
  serve_and_return: "Back-and-forth contingent interaction",
  receptive_vocabulary: "Understanding heard words",
  expressive_vocabulary: "Producing words",
  gesture_communication: "Pointing, showing, waving to communicate",
  narrative_skills: "Sequencing events into a told story",
  phonological_awareness: "Hearing sounds inside words",
  dialogic_engagement: "Child as active partner in shared reading/talk",
  // fine motor
  pincer_grasp: "Thumb-forefinger pickup of small-safe items",
  bilateral_coordination: "Two hands working together",
  hand_eye_coordination: "Guiding the hands by sight",
  crossing_midline: "Reaching across the body's center",
  tool_use: "Using an object to act on another",
  in_hand_manipulation: "Repositioning an object within one hand",
  // gross motor
  core_stability: "Trunk strength and postural control",
  balance: "Staying upright through weight shifts",
  locomotion: "Crawling, cruising, walking, running",
  motor_planning: "Sequencing body movements toward a goal",
  vestibular_input: "Movement and head-position sensing",
  proprioception: "Sensing body position and effort",
  // cognitive
  object_permanence: "Knowing hidden things still exist",
  cause_effect: "Acting to produce an expected outcome",
  categorization: "Grouping by kind or feature",
  spatial_reasoning: "Fitting, stacking, orienting in space",
  pattern_recognition: "Noticing and extending regularities",
  number_sense: "Attending to quantity and change in quantity",
  one_to_one_correspondence: "Matching one item to one slot or word",
  working_memory: "Holding information briefly in mind",
  inhibitory_control: "Stopping a prepotent response",
  cognitive_flexibility: "Shifting between rules or perspectives",
  symbolic_play: "One thing standing for another in play",
  problem_solving: "Trying means toward a blocked goal",
  // social-emotional
  social_referencing: "Checking a caregiver's reaction for guidance",
  turn_taking: "Alternating roles in interaction",
  imitation: "Reproducing observed actions",
  emotional_coregulation: "Settling with a caregiver's calm support",
  emotion_labeling: "Naming feeling states",
  autonomy_practice: "Doing a real task by oneself",
  empathy_development: "Responding to another's feelings",
  // sensory
  tactile_discrimination: "Telling textures apart by touch",
  sensory_exploration: "Learning object properties through the senses",
  auditory_discrimination: "Telling sounds apart",
  visual_tracking: "Following movement with the eyes",
  oral_motor: "Mouth and tongue strength and control",
};

export const MECHANISM_TAG_SET = new Set(Object.keys(MECHANISM_TAGS));
