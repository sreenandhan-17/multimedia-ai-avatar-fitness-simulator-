export const FORM_CHECKPOINTS = {
  'push-up': [
    {
      id: 'elbows-45',
      icon: '📐',
      title: 'Keep Elbows at 45°',
      summary: 'Tuck elbows at ~45° to ribs. Do not flare wide to protect shoulders.',
      detail: 'Arrow shape: when viewed from above, your body and arms should look like an arrow, not a T.',
    },
    {
      id: 'rigid-core',
      icon: '🛡️',
      title: 'Maintain Rigid Core',
      summary: 'Lock a straight line from head through hips down to heels.',
      detail: 'Squeeze glutes and brace abdominals. Avoid sagging hips or piking buttocks upward.',
    },
    {
      id: 'full-depth',
      icon: '🎯',
      title: 'Reach 90° Depth',
      summary: 'Lower chest smoothly until elbows reach at least a 90° bend.',
      detail: 'Incomplete dips will be flagged as partial depth. Aim for chest inches off the floor.',
    },
    {
      id: 'full-lockout',
      icon: '🔒',
      title: 'Full Top Lockout',
      summary: 'Press all the way up until arms are fully extended at the top.',
      detail: 'Lock out elbows to register the completion stage before beginning the next repetition.',
    },
  ],
  'squat': [
    {
      id: 'upright-torso',
      icon: '🧍',
      title: 'Keep Chest Proud & Upright',
      summary: 'Maintain neutral spine with chest lifted and gaze forward.',
      detail: 'Avoid excessive forward lean to protect the lumbar spine.',
    },
    {
      id: 'parallel-depth',
      icon: '📉',
      title: 'Squat to 90° Parallel',
      summary: 'Lower until thighs are at least parallel to floor (knees <= 90°).',
      detail: 'Ensure your hips sink lower than your knees to achieve full muscle recruitment.',
    },
    {
      id: 'knees-track',
      icon: '🦵',
      title: 'Knees Track Over Toes',
      summary: 'Push knees outward in line with your toes.',
      detail: 'Do not allow knees to cave inward (valgus collapse) during descent or ascent.',
    },
    {
      id: 'drive-heels',
      icon: '⚡',
      title: 'Drive Through Heels',
      summary: 'Press through heels and midfoot back to full standing lockout.',
      detail: 'Squeeze glutes at the top to complete each repetition cleanly.',
    },
  ],
  'bicep-curl': [
    {
      id: 'pin-elbows',
      icon: '📌',
      title: 'Pin Elbows to Ribs',
      summary: 'Keep upper arms fixed at sides; do not swing shoulders.',
      detail: 'Isolate the biceps by keeping your elbows directly beneath your shoulders.',
    },
    {
      id: 'peak-squeeze',
      icon: '🔥',
      title: 'Peak Contraction',
      summary: 'Curl fully upward and squeeze biceps firmly at the peak.',
      detail: 'Bring forearms up until elbow angle closes below 70° for full contraction.',
    },
    {
      id: 'tempo-control',
      icon: '⏱️',
      title: 'Controlled Negative',
      summary: 'Lower the weight smoothly over 2 seconds under constant tension.',
      detail: 'Do not let arms drop rapidly. Control the eccentric phase for maximum gains.',
    },
    {
      id: 'full-extension',
      icon: '🔒',
      title: 'Full Bottom Extension',
      summary: 'Extend arms fully at the bottom before starting the next rep.',
      detail: 'Reset to lockout (> 150°) to ensure full range of motion.',
    },
  ],
};

export function getCheckpointsForExercise(exerciseId = '') {
  const id = exerciseId.toLowerCase();
  if (id.includes('squat') || id.includes('lunge')) {
    return FORM_CHECKPOINTS['squat'];
  }
  if (id.includes('curl')) {
    return FORM_CHECKPOINTS['bicep-curl'];
  }
  return FORM_CHECKPOINTS['push-up'];
}
