import { useThemeContext } from "@/contexts/theme-context";

/** Public hook for reading/toggling light & dark mode anywhere in the app. */
export function useTheme() {
  return useThemeContext();
}
