import { Composition, Folder, Still } from "remotion";
import { Ad } from "./Ad";
import { OgImage } from "./OgImage";
import { Alert } from "./scenes/Alert";
import { Analytics } from "./scenes/Analytics";
import { Hook } from "./scenes/Hook";
import { Links } from "./scenes/Links";
import { Outro } from "./scenes/Outro";
import { Proof } from "./scenes/Proof";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Ad"
        component={Ad}
        durationInFrames={855}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ voiceover: false }}
      />
      <Still id="OgImage" component={OgImage} width={1200} height={630} />
      <Folder name="Scenes">
        <Composition id="Hook" component={Hook} durationInFrames={135} fps={30} width={1080} height={1920} />
        <Composition id="Links" component={Links} durationInFrames={150} fps={30} width={1080} height={1920} />
        <Composition id="Analytics" component={Analytics} durationInFrames={180} fps={30} width={1080} height={1920} />
        <Composition id="Alert" component={Alert} durationInFrames={150} fps={30} width={1080} height={1920} />
        <Composition id="Proof" component={Proof} durationInFrames={150} fps={30} width={1080} height={1920} />
        <Composition id="Outro" component={Outro} durationInFrames={150} fps={30} width={1080} height={1920} />
      </Folder>
    </>
  );
};
