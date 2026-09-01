# 002 — Calm the household entry motion

- **Status**: DONE
- **Commit**: 4c8c079
- **Severity**: MEDIUM
- **Category**: Purpose & frequency, accessibility, cohesion
- **Estimated scope**: 4 files, approximately 120–180 lines removed or simplified

## Problem

The create and join household routes are occasional onboarding screens, but
they currently animate almost every block independently after the native stack
has already animated the route. In `app/household-setup.tsx:128-190`, five
separate `FadeInUp` / `FadeInDown` spring entrances are delayed from 100ms to
500ms:

```tsx
<Animated.View
  entering={FadeInUp.delay(100).springify().damping(90)}
  className="items-center"
>
```

`app/join-household.tsx:136-219` repeats the same pattern through a 600ms
stagger. Because `app/_layout.tsx:267-274` already uses the native stack's
`default` transition and a `fade` under Reduce Motion, the extra choreography
duplicates spatial feedback, delays useful controls, and has no reduced-motion
branch.

The join success state compounds the issue in `app/join-household.tsx:83-128`
and `app/join-household.tsx:246-333`: it scales from zero, launches autonomous
emoji confetti for two seconds, and blocks navigation for 2.5 seconds. The same
screen also produces repeated haptics because the join handler and
`components/ui/CodeInput.tsx:30-45` both announce an error.

The post-create state in `components/household-setup/InviteCode.tsx:35-113`
uses the same staggered springs, emoji celebration, and a second custom button
animation, so leaving it untouched would immediately break cohesion after the
new creation form submits.

## Target

- Let Expo Router's existing native stack transition own forward/back spatial
  movement. Remove all per-block mount entrances from the two form states.
- Keep the shared `Button` press feedback. Use it for the join screen back
  control so feedback begins on press-in and remains within the 44pt target.
- For an inline validation error, use a single opacity entrance over **150ms**
  with `Easing.bezier(0.23, 1, 0.32, 1)`. Do not translate or scale it.
- Replace the confetti sequence with one calm success state. Crossfade the
  success container over **200ms** using
  `Easing.bezier(0.23, 1, 0.32, 1)`. Do not use `scale(0)`, rotation,
  autonomous particles, or multiple staggered children.
- Respect `useReducedMotion()`: the native stack already switches to `fade`;
  inline errors and the success state may keep opacity because it explains a
  state change, but must never translate, scale, or bounce.
- Produce exactly one success or error haptic per join attempt, from the join
  handler. `CodeInput` must not emit a second error haptic.
- Keep all animation work on Reanimated's UI runtime and use compiler-safe
  `.get()` / `.set()` if a shared value remains. Prefer declarative entering
  opacity for the two retained state transitions.

## Repo conventions to follow

- `app/_layout.tsx:267-274` owns native navigation motion and already maps
  Reduce Motion to `fade`.
- `components/ui/Button.tsx` provides 100–120ms press feedback, the shared
  strong ease-out curve, and a Reduce Motion branch.
- `app/restock-setup.tsx` uses one screen-level transition per activation step
  instead of animating every descendant.
- Use NativeWind for static layout and Reanimated only for animated opacity.
- Do not add dependencies.

## Steps

1. In `app/household-setup.tsx`, replace the five animated wrappers around the
   initial form with ordinary `View` wrappers and remove unused Reanimated
   entrance imports. Preserve the post-create mutation and navigation
   behaviour while bringing its presentation into the shared frame.
2. In `app/join-household.tsx`, replace the per-block form entrances with
   ordinary layout. Keep the native route transition and use the shared
   icon-only ghost `Button` for Back.
3. Replace `ConfettiParticles` and `ConfettiParticle` with one success
   container entering via a 200ms opacity fade. Reuse the new household artwork
   as a decorative image and keep the existing navigation destination.
4. Give the inline error message a 150ms opacity entrance using the exact
   strong ease-out curve.
5. In `components/ui/CodeInput.tsx`, remove the autonomous spring shake and
   duplicate error haptic. Preserve the visible error border and the public
   value/onChange behaviour.
6. In `components/household-setup/InviteCode.tsx`, use the same shared
   onboarding frame and shared Button feedback; remove staggered entrances,
   emoji art, and the bespoke copy-scale sequence.
7. Add regression coverage for the retained motion contract and the absence of
   autonomous confetti/staggered form entrances.

## Boundaries

- Do NOT change the route graph, authentication flow, household mutations, or
  navigation destinations.
- Do NOT add a dependency, schema field, index, environment variable, or
  offline behaviour.
- Do NOT hand-roll the screen transition in JavaScript.
- Do NOT animate layout properties, blur intensity, or shadows.
- Do NOT add looping motion, particles, bounce, or per-character haptics.
- If the cited code has drifted since commit `4c8c079`, re-audit before
  implementation rather than applying the excerpts blindly.

## Verification

- **Mechanical**:
  - Run `npm run typecheck`; expect exit code 0.
  - Run `npm run lint`; expect exit code 0.
  - Run focused Jest coverage for the household screens and `CodeInput`, then
    `npm test -- --runInBand --watchman=false`; expect all suites to pass.
- **Feel check**:
  - Navigate create → join → create. The platform push/back gesture must remain
    interactive and content must be usable immediately, without a second wave
    of staggered motion.
  - Submit an invalid invite code. Confirm one error haptic and one short error
    fade, with no shake.
  - Join successfully. Confirm the success state crossfades once with no
    confetti or bounce and navigation still reaches the same destination.
  - Enable Reduce Motion and repeat. The native route must fade and the two
    retained state changes must use opacity only.
  - A simulator can verify layout and sequencing; judge frame pacing on a
    release build on the slowest supported physical device.
- **Done when**: native navigation owns route movement, the forms have no
  staggered mount choreography, validation and success use only the specified
  opacity transitions, haptics are not duplicated, and all checks pass.
