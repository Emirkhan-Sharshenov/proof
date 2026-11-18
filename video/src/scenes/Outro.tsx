import { interpolate, useCurrentFrame } from "remotion";
import { Logo, Stage } from "../parts";
import { C, display, easeOut, enter } from "../theme";

export const Outro = () => {
  const frame = useCurrentFrame();
  return (
    <Stage dark>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          padding: "0 80px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            scale: interpolate(frame, [0, 22], [0.6, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: easeOut,
              output: "perceptual-scale",
            }),
            opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          <Logo size={180} dark />
        </div>
        <div style={{ fontFamily: display, fontWeight: 700, fontSize: 130, letterSpacing: "-0.03em", ...enter(frame, 8) }}>
          Folioseen
        </div>
        <div style={{ fontSize: 60, lineHeight: 1.25, color: "#C9CDD6", ...enter(frame, 18) }}>
          Know who read your portfolio.
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 60,
            fontWeight: 600,
            backgroundColor: C.accent,
            color: "#fff",
            padding: "36px 72px",
            borderRadius: 32,
            ...enter(frame, 32),
          }}
        >
          Start free
        </div>
        <div style={{ fontSize: 44, color: "#9AA0AC", ...enter(frame, 42) }}>app.folioseen.workers.dev</div>
      </div>
    </Stage>
  );
};
