// Serializes registration with sign-out cleanup. A registration already sent to
// Convex must finish before sign-out disables that device.
let suspended = false;
let active: Promise<void> = Promise.resolve();
let generation = 0;

export function resumePushRegistration(): void {
  suspended = false;
}

export function restorePushRegistration(
  work: (isCurrent: () => boolean) => Promise<void>,
): Promise<void> {
  const captured = generation;
  const isCurrent = () => !suspended && captured === generation;
  const run = active.then(async () => {
    if (isCurrent()) await work(isCurrent);
  });
  active = run.catch(() => undefined);
  return run;
}

export async function suspendPushRegistration(): Promise<void> {
  suspended = true;
  generation += 1;
  await active;
}
