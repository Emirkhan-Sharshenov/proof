import { useCurrentFrame } from "remotion";
import { Card, ExampleNote, Headline, Stage } from "../parts";
import { C, display, enter } from "../theme";

const QUOTE = "Clear process, great results. The checkout redesign paid for itself. Would hire again.";

// Client-written testimonial, typed out.
export const Proof = () => {
  const frame = useCurrentFrame();
  const shown = QUOTE.slice(0, Math.max(0, Math.floor((frame - 24) * 1.6)));
  return (
    <Stage>
      <Headline style={enter(frame, 0)}>
        Testimonials <span style={{ color: C.accent }}>your clients write</span> themselves.
      </Headline>
      <Card style={{ position: "absolute", left: 80, right: 80, top: 760, padding: 56, ...enter(frame, 14) }}>
        <div style={{ fontFamily: display, fontSize: 140, lineHeight: 0.6, color: C.accent }}>“</div>
        <div style={{ fontSize: 54, lineHeight: 1.35, minHeight: 300 }}>{shown}</div>
        <div style={{ marginTop: 36, fontSize: 40, fontWeight: 600 }}>
          Sam Lee <span style={{ fontWeight: 400, color: C.muted }}>· Head of Product</span>
        </div>
        <div
          style={{
            marginTop: 24,
            display: "inline-block",
            fontSize: 34,
            fontWeight: 600,
            color: C.green,
            backgroundColor: C.greenSoft,
            padding: "14px 26px",
            borderRadius: 999,
            ...enter(frame, 100, 14),
          }}
        >
          ✓ Submitted directly by the client
        </div>
      </Card>
      <ExampleNote />
    </Stage>
  );
};
