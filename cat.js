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

  const left = !!this.game.keys["ArrowLeft"];
  const right = !!this.game.keys["ArrowRight"];
  const jump = !!this.game.keys["ArrowUp"]; // Space
  const attack = !!(this.game.keys["a"] || this.game.keys["A"]);

  // ---- horizontal movement always allowed ----
  if (left && !right) {
    this.facingLeft = true;
    this.x -= this.speed * dt;
  } else if (right && !left) {
    this.facingLeft = false;
    this.x += this.speed * dt;
  }

  // ---- choose animation state (while held) ----
  // Priority: jump > attack > run(if moving) > sit
  if (jump) {
    this.setState("jump");
  } else if (attack) {
    this.setState("attack");
  } else if (left || right) {
    this.setState("run");
  } else {
    this.setState("sit");
  }

  // ---- keep cat on screen ----
  const canvas = this.game.ctx.canvas;
    const drawW = this.FRAME_W * this.SCALE;
    this.x = Math.max(0, Math.min(this.x, canvas.width - drawW));
    }


  draw(ctx) {
    const anim = this.anim[this.state] || this.anim.sit;
    anim.drawFrame(this.game.clockTick, ctx, this.x, this.y, this.facingLeft);
  }
}
