import { interpolate, useCurrentFrame } from "remotion";
import { ExampleNote, Headline, Stage } from "../parts";
import { C, easeOut, enter } from "../theme";

const Notification = ({ start, emoji, title, text }: { start: number; emoji: string; title: string; text: string }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        display: "flex",
        gap: 28,
        padding: "36px 40px",
        borderRadius: 40,
        backgroundColor: "rgba(255,255,255,0.96)",
        boxShadow: "0 24px 60px rgba(17,19,24,0.18)",
        opacity: interpolate(frame, [start, start + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        translate: interpolate(frame, [start, start + 18], ["0px -120px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: easeOut,
        }),
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          flexShrink: 0,
          borderRadius: 48,
          backgroundColor: "#2AABEE",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 50,
        }}
      >
        {emoji}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 32, color: C.muted }}>
          <span style={{ fontWeight: 600, color: C.ink }}>FolioseenBot</span>
          <span>now</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 42, lineHeight: 1.3 }}>
          <b>{title}</b> {text}
        </div>
      </div>
    </div>
  );
};

export const Alert = () => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      {/* Phone wallpaper feel */}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${C.bg} 0%, ${C.accentSoft} 100%)` }} />
      <Headline style={enter(frame, 0)}>
        Get pinged the moment <span style={{ color: C.accent }}>they open it.</span>
      </Headline>
      <div style={{ position: "absolute", left: 60, right: 60, top: 720, display: "flex", flexDirection: "column", gap: 32 }}>
        <Notification start={18} emoji="👀" title="Northside Studio" text="opened your link, on desktop." />
        <Notification start={78} emoji="📖" title="Northside Studio" text="finished reading — 3m 25s in total." />
      </div>
      <ExampleNote />
    </Stage>
  );
};
