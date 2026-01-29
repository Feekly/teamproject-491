class Animator {
  constructor(
    spritesheet,
    xStart,
    yStart,
    width,
    height,
    frameCount,
    frameDuration,
    loop = true,
    scale = 4 // IMPORTANT: integer scale for pixel art
  ) {
    Object.assign(this, {
      spritesheet,
      xStart,
      yStart,
      width,
      height,
      frameCount,
      frameDuration,
      loop,
      scale,
    });
    this.elapsedTime = 0;
    this.totalTime = frameCount * frameDuration;
  }

  reset() {
    this.elapsedTime = 0;
  }

  currentFrame() {
    return Math.floor(this.elapsedTime / this.frameDuration);
  }

  isDone() {
    return this.elapsedTime >= this.totalTime;
  }

  /**
   * @param {number} tick
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {boolean} flip  mirror horizontally (for facing left)
   */
  drawFrame(tick, ctx, x, y, flip = false) {
    this.elapsedTime += tick;

    if (this.loop) {
      this.elapsedTime = this.elapsedTime % this.totalTime;
    } else {
      if (this.elapsedTime >= this.totalTime) this.elapsedTime = this.totalTime - 0.000001;
    }

    const frame = this.currentFrame();
    const sx = this.xStart + this.width * frame;
    const sy = this.yStart;

    const dw = this.width * this.scale;
    const dh = this.height * this.scale;

    if (!flip) {
      ctx.drawImage(this.spritesheet, sx, sy, this.width, this.height, x, y, dw, dh);
      return;
    }

    // flip horizontally
    ctx.save();
    ctx.translate(x + dw, y);
    ctx.scale(-1, 1);
    ctx.drawImage(this.spritesheet, sx, sy, this.width, this.height, 0, 0, dw, dh);
    ctx.restore();
  }
}
