import { interpolate, useCurrentFrame } from "remotion";
import { Headline, Stage } from "../parts";
import { C, display, enter } from "../theme";

// "You sent your portfolio. Then… silence."
export const Hook = () => {
  const frame = useCurrentFrame();
  const dots = Math.floor(frame / 8) % 4;

  return (
    <Stage dark>
      <Headline dark style={enter(frame, 0)}>
        You sent your portfolio.
      </Headline>

      {/* Sent message bubble */}
      <div style={{ position: "absolute", right: 80, top: 640, maxWidth: 760, ...enter(frame, 14) }}>
        <div
          style={{
            backgroundColor: C.accent,
            color: "#fff",
            fontSize: 48,
            lineHeight: 1.3,
            padding: "36px 44px",
            borderRadius: "44px 44px 12px 44px",
          }}
        >
          Hi! Here’s my portfolio — happy to chat 👋
          <div style={{ marginTop: 18, fontSize: 36, opacity: 0.85, textDecoration: "underline" }}>my-portfolio.com</div>
        </div>
        <div style={{ textAlign: "right", marginTop: 16, fontSize: 34, color: "#9AA0AC" }}>Delivered</div>
      </div>

      {/* Waiting */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 1100,
          fontSize: 56,
          color: "#9AA0AC",
          ...enter(frame, 40),
          opacity: interpolate(frame, [40, 55, 95, 110], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Waiting for a reply{".".repeat(dots)}
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 260,
          fontFamily: display,
          fontWeight: 700,
          fontSize: 120,
          letterSpacing: "-0.03em",
          ...enter(frame, 70, 20),
        }}
      >
        Then… <span style={{ color: "#9AA0AC" }}>silence.</span>
      </div>
    </Stage>
  );
};
