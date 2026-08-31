# 001 — Add subtle active-tab icon feedback

- **Status**: TODO
- **Commit**: 86f7868
- **Severity**: LOW
- **Category**: Purpose & frequency
- **Estimated scope**: 1 file, approximately 35–50 lines

## Problem

The three primary tabs correctly avoid sliding or fading whole screens, but the
tab icons currently communicate selection only through an immediate colour
change. In `app/(tabs)/_layout.tsx:28-65`, each `tabBarIcon` ignores the
`focused` value supplied by Expo Router:

```tsx
// app/(tabs)/_layout.tsx:28-39 — current
<Tabs.Screen
  name="index"
  options={{
    title: "Plan",
    tabBarIcon: ({ color }) => (
      <CalendarDays
        size={24}
        color={color}
        strokeWidth={2.25}
      />
    ),
  }}
/>
```

Plan, Shop, and Spending are high-frequency peer destinations. Whole-screen
motion would make navigation feel slower and imply hierarchy that does not
exist. A near-imperceptible icon response is appropriate because it provides
feedback and state indication without delaying navigation or moving readable
content.

## Target

Create one private `AnimatedTabIcon` component inside
`app/(tabs)/_layout.tsx` and use it for all three tab icons.

Exact motion contract:

- Use Reanimated 4; do not use React Native core `Animated`.
- Animate only `opacity` and `transform: [{ scale }]`.
- Use one shared progress value so opacity and scale stay synchronized.
- Focused state: `opacity: 1`, `scale: 1`.
- Unfocused state: `opacity: 0.75`, `scale: 0.96`.
- Duration: `120ms` in both directions.
- Easing: `Easing.bezier(0.23, 1, 0.32, 1)`.
- Initialize the shared value from the initial `focused` prop so the selected
  icon does not animate on initial app mount.
- When `focused` changes, update progress with `withTiming`. A new change must
  retarget from the current visual state; do not restart a keyframe sequence.
- Respect `useReducedMotion()`: keep the `100ms` opacity transition, but force
  scale to `1` so there is no movement.
- Keep Expo Router's existing active/inactive colour handling. Do not animate
  colour manually.
- Do not add bounce, spring overshoot, haptics, label animation, a sliding
  selection pill, or any screen-level tab transition.

The implementation shape should be equivalent to:

```tsx
const TAB_EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

function AnimatedTabIcon({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.set(
      withTiming(focused ? 1 : 0, {
        duration: reduceMotion ? 100 : 120,
        easing: TAB_EASE_OUT,
      }),
    );
  }, [focused, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [0.75, 1]),
    transform: [
      {
        scale: reduceMotion
          ? 1
          : interpolate(progress.get(), [0, 1], [0.96, 1]),
      },
    ],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
```

Each icon callback must accept `focused` and wrap only the icon:

```tsx
tabBarIcon: ({ color, focused }) => (
  <AnimatedTabIcon focused={focused}>
    <CalendarDays size={24} color={color} strokeWidth={2.25} />
  </AnimatedTabIcon>
),
```

## Repo conventions to follow

- The app uses Expo Router `Tabs` and React Native Reanimated 4; both are
  already installed. Do not add dependencies.
- `components/ui/Button.tsx:12-13` defines the same strong ease-out curve as
  `Easing.bezier(0.23, 1, 0.32, 1)`.
- `components/ui/Button.tsx:69-89` demonstrates the required
  `useReducedMotion`, `useSharedValue`, `useAnimatedStyle`, `withTiming`, and
  compiler-safe `.get()` / `.set()` conventions.
- Use NativeWind for static styling. The animated `opacity` and `transform`
  values belong in `useAnimatedStyle`; do not introduce `StyleSheet`.
- Keep the existing 24-point Lucide icons, stroke width, colours, tab labels,
  spacing, accessibility semantics, and tab routes unchanged.

## Steps

1. In `app/(tabs)/_layout.tsx`, import `useEffect` from React and import
   `Animated`, `Easing`, `interpolate`, `useAnimatedStyle`,
   `useReducedMotion`, `useSharedValue`, and `withTiming` from
   `react-native-reanimated`.
2. Add the module-level `TAB_EASE_OUT` constant with
   `Easing.bezier(0.23, 1, 0.32, 1)`.
3. Add the private `AnimatedTabIcon` component before `TabsLayout`, following
   the exact state values, durations, reduced-motion branch, and `.get()` /
   `.set()` API shown in the Target section.
4. Update the Plan, Shop, and Spending `tabBarIcon` callbacks to destructure
   `focused` and wrap their existing Lucide icon in `AnimatedTabIcon`.
5. Confirm `app/_layout.tsx` still sets the `(tabs)` stack route to
   `animation: "none"`; do not change that settled navigation behaviour.

## Boundaries

- Do NOT edit any file other than `app/(tabs)/_layout.tsx`.
- Do NOT animate the tab screens, tab-bar position, labels, colours, height,
  padding, or active indicator.
- Do NOT introduce a custom `tabBarButton`; preserve the native press target,
  navigation semantics, and accessibility behaviour.
- Do NOT add haptics. A tab change already has visible colour and icon-state
  feedback, and haptics at this frequency would be noisy.
- Do NOT use springs or keyframes; this frequent interaction must remain crisp
  and interruptible.
- Do NOT add new dependencies or change routes.
- If the cited code has drifted since commit `86f7868`, STOP and report the
  mismatch instead of improvising.

## Verification

- **Mechanical**:
  - Run `pnpm typecheck`; expect exit code 0.
  - Run `pnpm lint`; expect exit code 0.
  - Run `pnpm exec jest --runInBand --watchman=false`; expect all suites to
    pass.
- **Feel check**:
  - Run the iOS app and switch Plan → Shop → Spending → Plan. The destination
    content must change immediately; only the icons should subtly settle.
  - Record the tab bar and review it at 10% playback speed. The selected icon
    must move only from scale `0.96` to `1` while opacity moves from `0.75` to
    `1`; there must be no bounce, label movement, tab-bar movement, or screen
    fade/slide.
  - Tap different tabs rapidly. Motion must retarget from the current visual
    state without snapping, replaying from zero, or leaving multiple icons at
    full opacity.
  - Enable iOS **Settings → Accessibility → Motion → Reduce Motion**, relaunch
    the app, and switch tabs again. Icons must crossfade over `100ms` with no
    scale change.
  - Feel-check a release build on the slowest supported physical device. Expo
    Go or a development simulator is not sufficient for a frame-rate verdict.
- **Done when**: all three icons use the shared component, tab navigation is
  immediate, rapid selection is interruption-safe, Reduce Motion removes
  scaling, the root `(tabs)` route still uses `animation: "none"`, and all
  mechanical checks pass.
