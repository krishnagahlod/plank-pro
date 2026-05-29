import { FORM } from "@/lib/constants";
import { OneEuroFilter } from "@/lib/pose/oneEuroFilter";
import type { Keypoint } from "@/lib/pose/plankState";

/**
 * Per-keypoint smoother backed by the One Euro Filter. Each landmark has
 * three independent filters (x, y, score) so position and confidence are
 * smoothed separately. Score uses a slightly higher minimum cutoff so brief
 * occlusions register but momentary drops don't kill the signal.
 */
export class KeypointSmoother {
  private filters: Array<{
    x: OneEuroFilter;
    y: OneEuroFilter;
    score: OneEuroFilter;
  }> = [];

  constructor(numKeypoints = 17) {
    for (let i = 0; i < numKeypoints; i++) {
      this.filters.push({
        x: new OneEuroFilter(FORM.ONE_EURO_MIN_CUTOFF, FORM.ONE_EURO_BETA),
        y: new OneEuroFilter(FORM.ONE_EURO_MIN_CUTOFF, FORM.ONE_EURO_BETA),
        score: new OneEuroFilter(2.0, 0.0),
      });
    }
  }

  push(kps: Keypoint[], timeMs: number): Keypoint[] {
    return kps.map((kp, i) => {
      if (i >= this.filters.length) return kp;
      const f = this.filters[i];
      return {
        x: f.x.filter(kp.x, timeMs),
        y: f.y.filter(kp.y, timeMs),
        score: f.score.filter(kp.score ?? 0, timeMs),
        name: kp.name,
      };
    });
  }

  reset(): void {
    for (const f of this.filters) {
      f.x.reset();
      f.y.reset();
      f.score.reset();
    }
  }
}
