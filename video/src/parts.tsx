import type React from "react";
import { AbsoluteFill } from "remotion";
import { body, C, display } from "./theme";

export const Stage: React.FC<{ dark?: boolean; children: React.ReactNode }> = ({ dark, children }) => (
  <AbsoluteFill style={{ backgroundColor: dark ? C.ink : C.bg, fontFamily: body, color: dark ? C.bg : C.ink }}>
    {children}
  </AbsoluteFill>
);

// Top headline block, inside the safe area.
export const Headline: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; dark?: boolean }> = ({
  children,
  style,
  dark,
}) => (
  <div
    style={{
      position: "absolute",
      left: 80,
      right: 80,
      top: 190,
      fontFamily: display,
      fontWeight: 700,
      fontSize: 96,
      lineHeight: 1.04,
      letterSpacing: "-0.03em",
      color: dark ? C.bg : C.ink,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      backgroundColor: C.card,
      borderRadius: 40,
      border: `2px solid ${C.line}`,
      boxShadow: "0 30px 80px rgba(17,19,24,0.10)",
      padding: 48,
      ...style,
    }}
  >
    {children}
  </div>
);

// Required on every shot with invented names or numbers.
export const ExampleNote: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 110,
      textAlign: "center",
      fontSize: 30,
      color: dark ? "#9AA0AC" : C.muted,
    }}
  >
    Example data
  </div>
);

export const Logo: React.FC<{ size?: number; dark?: boolean }> = ({ size = 96, dark }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <rect x="1" y="1" width="26" height="26" rx="8" fill={dark ? C.bg : C.ink} />
    <path
      d="M8 14.5l4 4 8-9"
      stroke={dark ? C.ink : C.bg}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
