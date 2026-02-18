class Cat {
  /**
   * @param {GameEngine} game
   * @param {number} x
   * @param {number} y
   * @param {{
   *   run: HTMLImageElement,
   *   sit: HTMLImageElement,
   *   jump: HTMLImageElement,
   *   attack: HTMLImageElement,
   *   die?: HTMLImageElement
   * }} sheets
   */
  constructor(game, x, y, sheets) {
    this.game = game;
    this.x = x;
    this.y = y;

    // movement
    this.speed = 200; // px/sec
    this.facingLeft = false;

    // sprite constants
    this.FRAME_W = 32;
    this.FRAME_H = 32;
    this.SCALE = 4; // MUST be integer for pixel art

    // helper to create animator (single-row sheets)
    const makeAnimator = (img, frames, frameDuration, loop) =>
      new Animator(img, 0, 0, this.FRAME_W, this.FRAME_H, frames, frameDuration, loop, this.SCALE);

    // animations (use your exact frame counts)
    this.anim = {
      run: makeAnimator(sheets.run, 7, 0.08, true),
      sit: makeAnimator(sheets.sit, 3, 0.18, true),
      jump: makeAnimator(sheets.jump, 13, 0.06, true),
      attack: makeAnimator(sheets.attack, 9, 0.06, true),
    };

    // optional die
    if (sheets.die) {
      this.anim.die = makeAnimator(sheets.die, 15, 0.07, false);
    }

    // state
    this.state = "sit";

    // key edge detection (to avoid reset spam)
    this.prevSpace = false;
    this.prevA = false;

    // optional: if you ever want to trigger die
    this.dead = false;
  }

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    if (this.anim[this.state]) this.anim[this.state].reset();
  }

  
update() {
  const dt = this.game.clockTick;

  // Omni movement: Arrow keys + WASD
  const left  = !!(this.game.keys["ArrowLeft"]  || this.game.keys["a"] || this.game.keys["A"]);
  const right = !!(this.game.keys["ArrowRight"] || this.game.keys["d"] || this.game.keys["D"]);
  const up    = !!(this.game.keys["ArrowUp"]    || this.game.keys["w"] || this.game.keys["W"]);
  const down  = !!(this.game.keys["ArrowDown"]  || this.game.keys["s"] || this.game.keys["S"]);

  let dx = 0;
  let dy = 0;

  if (left && !right) dx = -1;
  else if (right && !left) dx = 1;

  if (up && !down) dy = -1;
  else if (down && !up) dy = 1;

  // Normalize diagonal so it's not faster
  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.sqrt(2);
    dx *= inv;
    dy *= inv;
  }

  this.x += dx * this.speed * dt;
  this.y += dy * this.speed * dt;

  // Facing direction for sprite flip
  if (dx < 0) this.facingLeft = true;
  else if (dx > 0) this.facingLeft = false;

  // Animation: run when moving, sit when idle
  if (dx !== 0 || dy !== 0) this.setState("run");
  else this.setState("sit");

  // Keep on screen bounds
  const canvas = this.game.ctx.canvas;
  const drawW = this.FRAME_W * this.SCALE;
  const drawH = this.FRAME_H * this.SCALE;

  this.x = Math.max(0, Math.min(this.x, canvas.width - drawW));
  this.y = Math.max(0, Math.min(this.y, canvas.height - drawH));
}

draw(ctx) {
  const anim = this.anim[this.state];
  if (!anim) return;

  if (this.facingLeft) {
    ctx.save();
    ctx.translate(this.x + this.FRAME_W * this.SCALE, this.y);
    ctx.scale(-1, 1);
    anim.drawFrame(this.game.clockTick, ctx, 0, 0);
    ctx.restore();
  } else {
    anim.drawFrame(this.game.clockTick, ctx, this.x, this.y);
  }
}
}
