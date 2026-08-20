import { useFonts as useExpoFonts } from "expo-font";
import { Oxygen_300Light, Oxygen_400Regular } from "@expo-google-fonts/oxygen";
import {
  NunitoSans_300Light,
  NunitoSans_600SemiBold,
} from "@expo-google-fonts/nunito-sans";

/**
 * Fonts used by the mockup (nuevo_frontend.html):
 *  - "Oxygen" (300) for headings / titles
 *  - "Nunito Sans" (300 / 600) for navigation and body labels
 * Registered under stable family names so styles can reference them.
 */
export const fontAssets = {
  "Oxygen-Light": Oxygen_300Light,
  "Oxygen-Regular": Oxygen_400Regular,
  "NunitoSans-Light": NunitoSans_300Light,
  "NunitoSans-SemiBold": NunitoSans_600SemiBold,
} as const;

export type FontName = keyof typeof fontAssets;

export function useFonts() {
  const [loaded, error] = useExpoFonts(fontAssets);
  return { loaded, error };
}
