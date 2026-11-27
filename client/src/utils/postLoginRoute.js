// Where an already-logged-in visitor should land: the tutorial if they
// haven't finished it yet, otherwise the weekly split. Shared by HomePage
// and LoginPage so the two don't drift apart.
export function getPostLoginRoute() {
  const tutorialDone = localStorage.getItem('fitness-avatar-tutorial-done') === 'true';
  return tutorialDone ? '/split' : '/tutorial';
}
