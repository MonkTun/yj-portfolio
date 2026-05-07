/**
 * Shared prop shape used by every reactbits-style background wrapper in
 * this folder. Real reactbits components have their own (richer) prop
 * APIs — when you `npx jsrepo add` one, replace the matching wrapper file
 * with code that maps these shared knobs onto the upstream component's
 * actual props.
 */
export type BitsBackgroundProps = {
  intensity: number;
  speed: number;
  colorA: string;
  colorB: string;
};
