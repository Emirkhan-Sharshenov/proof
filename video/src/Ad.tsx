import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Audio } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";
import { Alert } from "./scenes/Alert";
import { Analytics } from "./scenes/Analytics";
import { Hook } from "./scenes/Hook";
import { Links } from "./scenes/Links";
import { Outro } from "./scenes/Outro";
import { Proof } from "./scenes/Proof";

type Props = { readonly voiceover: boolean };

// 30 fps. Scene lengths sum to 915 frames; five 12-frame transitions overlap → 855 frames (28.5 s).
// Scenes start at frames 0, 123, 261, 429, 567, 705; each voice line starts ~0.3 s into its scene.
export const Ad = ({ voiceover }: Props) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {voiceover ? (
        <>
          <Audio name="VO 1" src={staticFile("voiceover/1.mp3")} from={8} premountFor={fps} />
          <Audio name="VO 2" src={staticFile("voiceover/2.mp3")} from={131} premountFor={fps} />
          <Audio name="VO 3" src={staticFile("voiceover/3.mp3")} from={269} premountFor={fps} />
          <Audio name="VO 4" src={staticFile("voiceover/4.mp3")} from={437} premountFor={fps} />
          <Audio name="VO 5" src={staticFile("voiceover/5.mp3")} from={575} premountFor={fps} />
          <Audio name="VO 6" src={staticFile("voiceover/6.mp3")} from={713} premountFor={fps} />
        </>
      ) : null}
    <TransitionSeries>
      <TransitionSeries.Sequence name="Hook" durationInFrames={135} premountFor={fps}>
        <Hook />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 12 })} />
      <TransitionSeries.Sequence name="Links" durationInFrames={150} premountFor={fps}>
        <Links />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: 12 })} />
      <TransitionSeries.Sequence name="Analytics" durationInFrames={180} premountFor={fps}>
        <Analytics />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: 12 })} />
      <TransitionSeries.Sequence name="Alert" durationInFrames={150} premountFor={fps}>
        <Alert />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: 12 })} />
      <TransitionSeries.Sequence name="Proof" durationInFrames={150} premountFor={fps}>
        <Proof />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 12 })} />
      <TransitionSeries.Sequence name="Outro" durationInFrames={150} premountFor={fps}>
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    </>
  );
};
