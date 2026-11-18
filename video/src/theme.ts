import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";
import { Easing, interpolate } from "remotion";

export const { fontFamily: display } = loadDisplay("normal", { weights: ["600", "700"], subsets: ["latin"] });
export const { fontFamily: body } = loadBody("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

// Same palette as the landing page.
export const C = {
  bg: "#F6F6F3",
  ink: "#111318",
  muted: "#5B606C",
  line: "#E3E4E8",
  card: "#FFFFFF",
  accent: "#1D4ED8",
  accentSoft: "#DCE6FF",
  green: "#15803D",
  greenSoft: "#DCFCE7",
} as const;

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

// Fade + rise in, starting at `start` frames, lasting `len` frames.
export const enter = (frame: number, start: number, len = 18) => ({
  opacity: interpolate(frame, [start, start + len], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut }),
  translate: interpolate(frame, [start, start + len], ["0px 40px", "0px 0px"], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  }),
});
