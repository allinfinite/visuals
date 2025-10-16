declare module 'bezier-easing' {
  interface BezierEasing {
    (t: number): number;
  }

  function bezierEasing(
    mX1: number,
    mY1: number,
    mX2: number,
    mY2: number
  ): BezierEasing;

  export = bezierEasing;
}

