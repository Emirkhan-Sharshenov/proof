import { interpolate, useCurrentFrame } from "remotion";
import { Card, ExampleNote, Headline, Stage } from "../parts";
import { C, easeOut, enter } from "../theme";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const Bar = ({ label, seconds, start }: { label: string; seconds: number; start: number }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [start, start + 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 42 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt(seconds * p)}</span>
      </div>
      <div style={{ height: 22, borderRadius: 11, backgroundColor: C.line }}>
        <div style={{ height: "100%", borderRadius: 11, backgroundColor: C.accent, width: `${(seconds / 130) * 100 * p}%` }} />
      </div>
    </div>
  );
};

export const Analytics = () => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <Headline style={enter(frame, 0)}>
        See what they read — <span style={{ color: C.accent }}>and for how long.</span>
      </Headline>
      <Card style={{ position: "absolute", left: 80, right: 80, top: 700, ...enter(frame, 14) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 48 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 28,
              backgroundColor: C.ink,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
              fontWeight: 600,
            }}
          >
            NS
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 46, fontWeight: 600 }}>Northside Studio</div>
            <div style={{ fontSize: 34, color: C.muted }}>opened your link · 2 min ago</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 600, color: C.green, backgroundColor: C.greenSoft, padding: "12px 24px", borderRadius: 999 }}>
            Live
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <Bar label="Checkout redesign" seconds={130} start={30} />
          <Bar label="Pricing & packages" seconds={55} start={42} />
          <Bar label="Brand refresh" seconds={20} start={54} />
        </div>
      </Card>
      <ExampleNote />
    </Stage>
  );
};
