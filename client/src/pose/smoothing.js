/**
 * Angle smoother using a rolling average window to eliminate camera noise.
 */
export class AngleSmoother {
  constructor(windowSize = 5) {
    this.windowSize = windowSize;
    this.history = {};
  }

  smooth(key, value) {
    if (!this.history[key]) {
      this.history[key] = [];
    }

    const arr = this.history[key];
    arr.push(value);
    if (arr.length > this.windowSize) {
      arr.shift();
    }

    const sum = arr.reduce((acc, curr) => acc + curr, 0);
    return Math.round(sum / arr.length);
  }

  reset() {
    this.history = {};
  }
}
