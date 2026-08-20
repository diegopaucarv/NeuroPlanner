// Auto-generated from global.css @theme — keep in sync manually
export const theme = {
  black: "#010101",
  "bright-lavender": "#bf83fb",
  mauve: "#d6b8f5",
  "lavender-veil": "#f2e7fe",
  charcoal: "#515151",
  "carbon-black": "#191919",
  "vintage-grape": "#473a63",
  // Mockup colors (Phase 0)
  background: "#1f1f1f",
  text: "#cccaca", // 95% opacity
  accent: "#D9B5FF", // 85% opacity
} as const;

export type ThemeColor = keyof typeof theme;

// Font families matching the mockup (nuevo_frontend.html)
export const fonts = {
  heading: "Oxygen-Light", // Oxygen 300 — page titles
  headingRegular: "Oxygen-Regular", // Oxygen 400
  body: "NunitoSans-Light", // Nunito Sans 300 — nav / labels
  bodySemiBold: "NunitoSans-SemiBold", // Nunito Sans 600 — active nav
} as const;
