// introscene.js
class IntroScene {
  /**
   * @param {GameEngine} game
   * @param {HTMLImageElement} bgImage
   * @param {Object} assets (sprite sheets etc)
   * @param {(playerName: string) => void} onDoneName
   */
  constructor(game, bgImage, assets, onDoneName) {
    this.game = game;
    this.bg = bgImage;
    this.assets = assets;
    this.onDoneName = onDoneName;

    this.removeFromWorld = false;

    // Vanessa (host cat) uses run sheet
    this.vanessa = new VanessaHost(game, -200, this.getGroundY(), assets.runSheet);

    // dialogue sequencing
    this.dialogIndex = 0;
    this.dialog = [
      "Hi, I'm Vanessa!",
      "Welcome to Cat Café.",
      "What's your name?"
    ];
  }

  getCanvas() {
    return this.game.ctx.canvas;
  }

  getGroundY() {
    // place on bottom with a small margin
    const c = this.getCanvas();
    const scale = 4;
    const frameH = 32;
    return Math.round(c.height - frameH * scale - 40);
  }

  clearClick() {
    this.game.click = null;
  }

  update() {
    // keep host on correct ground if resized
    this.vanessa.y = this.getGroundY();

    // phase 1: Vanessa auto-runs to a target X
    const targetX = Math.round(this.getCanvas().width * 0.55);
    this.vanessa.targetX = targetX;
    this.vanessa.update();

    // if Vanessa hasn't arrived, ignore dialogue clicks
    if (!this.vanessa.arrived) {
        if (this.game.click) this.game.click = null;
        return;
    }

    const click = this.game.click;
    if (click) {
        this.game.click = null;

        // If we're ON the last line ("What's your name?"), then transition immediately
        if (this.dialogIndex === this.dialog.length - 1) {
        if (typeof this.onDoneName === "function") this.onDoneName(null);
        this.removeFromWorld = true;
        return;
        }

        // otherwise advance dialogue
        this.dialogIndex = Math.min(this.dialogIndex + 1, this.dialog.length - 1);
    }
  }


  draw(ctx) {
    const c = this.getCanvas();

    // background
    if (this.bg) ctx.drawImage(this.bg, 0, 0, c.width, c.height);

    // host cat
    this.vanessa.draw(ctx);

    // speech bubble once arrived
    if (this.vanessa.arrived) {
      const text = this.dialog[this.dialogIndex];
      drawSpeechBubble(ctx, {
        x: Math.round(this.vanessa.x + 120),
        y: Math.round(this.vanessa.y - 90),
        text,
      });
      // hint
      drawHint(ctx, "Click to continue...");
    } else {
      drawHint(ctx, "Loading intro...");
    }
  }
}

/** Host cat that auto-runs to a target and then idles */
class VanessaHost {
  constructor(game, x, y, runSheet) {
    this.game = game;
    this.x = x;
    this.y = y;

    this.FRAME_W = 32;
    this.FRAME_H = 32;
    this.SCALE = 4;

    this.speed = 260; // px/sec intro speed
    this.facingLeft = false;

    this.animRun = new Animator(runSheet, 0, 0, this.FRAME_W, this.FRAME_H, 7, 0.08, true, this.SCALE);
    this.targetX = 600;
    this.arrived = false;
  }

  update() {
    const dt = this.game.clockTick;
    if (!this.arrived) {
      this.x += this.speed * dt;
      if (this.x >= this.targetX) {
        this.x = this.targetX;
        this.arrived = true;
      }
    }
  }

  draw(ctx) {
    // run animation; once arrived it’ll still animate (looks fine)
    this.animRun.drawFrame(this.game.clockTick, ctx, this.x, this.y, this.facingLeft);
  }
}

/** Simple canvas speech bubble */
function drawSpeechBubble(ctx, { x, y, text }) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const padding = 12;
  ctx.font = "20px monospace";
  const metrics = ctx.measureText(text);
  const w = Math.round(metrics.width + padding * 2);
  const h = 46;

  // bubble
  ctx.fillStyle = "white";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;

  roundRect(ctx, x, y, w, h, 10, true, true);

  // tail
  ctx.beginPath();
  ctx.moveTo(x + 30, y + h);
  ctx.lineTo(x + 45, y + h + 16);
  ctx.lineTo(x + 60, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // text
  ctx.fillStyle = "black";
  ctx.fillText(text, x + padding, y + 30);

  ctx.restore();
}

function drawHint(ctx, text) {
  ctx.save();
  ctx.font = "16px monospace";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillText(text, 20, 30);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}