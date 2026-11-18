import { interpolate, useCurrentFrame } from "remotion";
import { Card, ExampleNote, Headline, Stage } from "../parts";
import { C, enter } from "../theme";

const Row = ({ name, slug, start, copied }: { name: string; slug: string; start: number; copied: number }) => {
  const frame = useCurrentFrame();
  const isCopied = frame >= copied;
  return (
    <Card style={{ display: "flex", alignItems: "center", gap: 28, padding: "40px 44px", ...enter(frame, start) }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 50, fontWeight: 600 }}>{name}</div>
        <div style={{ marginTop: 10, fontSize: 36, color: C.muted, fontFamily: "monospace" }}>/v/{slug}</div>
      </div>
      <div
        style={{
          fontSize: 38,
          fontWeight: 600,
          padding: "20px 32px",
          borderRadius: 999,
          backgroundColor: isCopied ? C.greenSoft : C.ink,
          color: isCopied ? C.green : "#fff",
          scale: interpolate(frame, [copied - 4, copied, copied + 6], [1, 0.92, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {isCopied ? "Copied" : "Copy"}
      </div>
    </Card>
  );
};

export const Links = () => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <Headline style={enter(frame, 0)}>
        Send every client <span style={{ color: C.accent }}>their own link.</span>
      </Headline>
      <div style={{ position: "absolute", left: 80, right: 80, top: 640, display: "flex", flexDirection: "column", gap: 36 }}>
        <Row name="Northside Studio" slug="8f3k2q" start={16} copied={70} />
        <Row name="Acme Inc." slug="b7m1xa" start={28} copied={999} />
        <Row name="Blue Harbor" slug="q9d4re" start={40} copied={999} />
      </div>
      <ExampleNote />
    </Stage>
  );
};
