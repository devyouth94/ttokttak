import Svg, { Circle, G, Path } from "react-native-svg";

type AppLogoIconProps = {
  size?: number;
};

export function AppLogoIcon({
  size = 100,
}: AppLogoIconProps): React.JSX.Element {
  return (
    <Svg height={size} viewBox="252 252 526 520" width={size}>
      <Circle cx={384} cy={384} fill="#2E7D32" r={108} />
      <Path
        d="M628 292 Q640 270 652 292 L744 462 Q754 482 730 482 H550 Q526 482 536 462 Z"
        fill="#357ABD"
      />
      <Circle
        cx={384}
        cy={640}
        fill="none"
        r={84}
        stroke="#F4B400"
        strokeWidth={48}
      />
      <G fill="none" stroke="#D64545" strokeLinecap="round" strokeWidth={48}>
        <Path d="M556 556 L724 724" />
        <Path d="M724 556 L556 724" />
      </G>
    </Svg>
  );
}
