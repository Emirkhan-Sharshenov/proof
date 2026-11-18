import { AbsoluteFill } from "remotion";
import { Logo } from "./parts";
import { body, C, display } from "./theme";

// 1200×630 link preview for the landing page (public/og.png in the main site).
export const OgImage = () => (
  <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: body, color: C.ink, padding: 72, flexDirection: "row", gap: 56 }}>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Logo size={56} />
        <span style={{ fontFamily: display, fontWeight: 700, fontSize: 40, letterSpacing: "-0.02em" }}>Folioseen</span>
      </div>
      <div style={{ fontFamily: display, fontWeight: 700, fontSize: 76, lineHeight: 1.02, letterSpacing: "-0.03em" }}>
        Know who read your portfolio.
      </div>
      <div style={{ fontSize: 28, color: C.muted, lineHeight: 1.4 }}>
        A personal link for every client. See which case studies they opened and for how long.
      </div>
    </div>
    <div
      style={{
        width: 430,
        alignSelf: "center",
        backgroundColor: C.card,
        borderRadius: 28,
        border: `2px solid ${C.line}`,
        boxShadow: "0 20px 50px rgba(17,19,24,0.10)",
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 22,
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 600 }}>Northside Studio opened your link</div>
      {[
        ["Checkout redesign", "2:10", 1],
        ["Pricing & packages", "0:55", 0.42],
        ["Brand refresh", "0:20", 0.16],
      ].map(([label, time, w]) => (
        <div key={label as string}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, marginBottom: 8 }}>
            <span>{label}</span>
            <span style={{ fontWeight: 600 }}>{time}</span>
          </div>
          <div style={{ height: 12, borderRadius: 6, backgroundColor: C.line }}>
            <div style={{ height: "100%", width: `${(w as number) * 100}%`, borderRadius: 6, backgroundColor: C.accent }} />
          </div>
        </div>
      ))}
      <div style={{ fontSize: 16, color: C.muted }}>Example data</div>
    </div>
  </AbsoluteFill>
);
