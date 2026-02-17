// characterselect.js
class CharacterSelectScene {
  /**
   * @param {GameEngine} game
   * @param {HTMLImageElement} bgImage
   * @param {(selectedKey: string) => void} onSelected
   */
  constructor(game, bgImage, onSelected) {
    this.game = game;
    this.bg = bgImage;
    this.onSelected = onSelected;
    this.removeFromWorld = false;

    // Your names 
    this.cats = [
      { key: "bibo", label: "Bibo" },
      { key: "siam", label: "Siam" },
      { key: "tygi", label: "Tygi" },
      { key: "claire", label: "Claire" },
      { key: "mini", label: "Mini" },
      { key: "demun", label: "Demun" },
    ];
  }

  getCanvas() {
    return this.game.ctx.canvas;
  }

  getPanelRect() {
    const c = this.getCanvas();
    const w = Math.round(c.width * 0.75);
    const h = Math.round(c.height * 0.55);
    const x = Math.round((c.width - w) / 2);
    const y = Math.round((c.height - h) / 2);
    return { x, y, w, h };
  }

  getCatRects() {
    const panel = this.getPanelRect();

    const rowY = Math.round(panel.y + panel.h * 0.55);
    const startX = Math.round(panel.x + panel.w * 0.15);
    const endX = Math.round(panel.x + panel.w * 0.85);

    const gap = (endX - startX) / (this.cats.length - 1);

    const size = 80;
    const rects = [];

    for (let i = 0; i < this.cats.length; i++) {
      const cx = Math.round(startX + gap * i);
      rects.push({
        cat: this.cats[i],
        x: cx - Math.round(size / 2),
        y: rowY - Math.round(size / 2),
        w: size,
        h: size,
      });
    }
    return rects;
  }

  pointInRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  update() {
    const click = this.game.click;
    if (!click) return;

    const rects = this.getCatRects();
    for (const r of rects) {
      if (this.pointInRect(click.x, click.y, r)) {
        this.game.click = null;

        const selected = r.cat;

        if (typeof this.onSelected === "function") this.onSelected(selected);

        this.removeFromWorld = true;
        return;
      }
    }

    // click anywhere else just clears click
    this.game.click = null;
  }

  draw(ctx) {
    const c = this.getCanvas();

    // background
    if (this.bg) ctx.drawImage(this.bg, 0, 0, c.width, c.height);

    // panel
    const p = this.getPanelRect();
    ctx.save();
    ctx.fillStyle = "rgba(255, 240, 250, 0.92)";
    ctx.strokeStyle = "rgba(255, 105, 180, 0.8)";
    ctx.lineWidth = 8;
    roundRect(ctx, p.x, p.y, p.w, p.h, 18, true, true);

    // title + instructions
    ctx.fillStyle = "rgba(90, 30, 120, 0.9)";
    ctx.font = "44px monospace";
    ctx.fillText("CHARACTERS", p.x + 40, p.y + 80);

    ctx.font = "18px monospace";
    ctx.fillText("Choose a cat to represent you as the café host.", p.x + 40, p.y + 120);
    ctx.fillText("Click a cat to choose your name and continue.", p.x + 40, p.y + 150);

    // clickable cat “slots” (placeholders for now)
    const rects = this.getCatRects();
    ctx.font = "18px monospace";

    for (const r of rects) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 3;
      roundRect(ctx, r.x, r.y, r.w, r.h, 10, true, true);

      // label under slot
      ctx.fillStyle = "rgba(60, 20, 80, 0.9)";
      ctx.fillText(r.cat.label, r.x + 10, r.y + r.h + 26);
    }

    ctx.restore();

    drawHint(ctx, "Click a cat to select.");
  }
}