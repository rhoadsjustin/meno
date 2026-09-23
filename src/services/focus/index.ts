/**
 * Focus goal (docs/05 §1). With several passages in progress, one is the
 * focus: the verse every widget shows, the recite-to-unlock shield asks for,
 * and a widget tap opens. The user picks it ("Show on widgets"); until they
 * do — or once that pick is finished or archived — the oldest active goal
 * stands in, which is how Meno behaved before multiple goals shared a screen.
 *
 * Pure: repos load the goals and the stored pick, this decides.
 */
export type FocusCandidate = { id: string; status: string; createdAt: Date };

export function resolveFocusGoal<T extends FocusCandidate>(
  goals: readonly T[],
  focusId: string | null | undefined
): T | undefined {
  const active = goals.filter((g) => g.status === 'active');
  const picked = focusId ? active.find((g) => g.id === focusId) : undefined;
  if (picked) return picked;
  return active.reduce<T | undefined>(
    (oldest, g) => (!oldest || g.createdAt.getTime() < oldest.createdAt.getTime() ? g : oldest),
    undefined
  );
}
