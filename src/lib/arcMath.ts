/**
 * Pure angle ↔ time math for the circular arc / donut views.
 *
 * Ported from `assets/calendario_antiguo/app/routes/circulol.tsx`
 * (`InteractiveDonut`): `calculateAngle`, `normalizeAngle`.
 * Plus the `minutesToAngle` / `angleToMinutes` helpers described in
 * `docs/reconversion/02-live-arcs-port.md`.
 *
 * ZERO React / React Native / DOM imports — pure math only.
 */

/**
 * Normalize an angle into the [0, 360) range.
 */
export const normalizeAngle = (angle: number): number =>
  ((angle % 360) + 360) % 360;

/**
 * Compute the angle (0-360) of a point relative to the circle center.
 *
 * NOTE: The legacy `calculateAngle` took a `React.MouseEvent` and read
 * `getBoundingClientRect()`/`clientX`/`clientY` (DOM). To keep this module
 * pure, it now takes the point's `x`/`y` already relative to the center.
 */
export const calculateAngle = (x: number, y: number): number =>
  ((Math.atan2(y, x) * 180) / Math.PI + 450) % 360;

/**
 * Convert minutes since midnight to an angle (0-360).
 */
export const minutesToAngle = (minutes: number): number =>
  (minutes / (24 * 60)) * 360;

/**
 * Convert an angle (0-360) to minutes since midnight.
 */
export const angleToMinutes = (angle: number): number =>
  Math.round((angle / 360) * 24 * 60);
