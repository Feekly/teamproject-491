class TaskWidget {
  constructor(game) {
    this.game = game;
    this.removeFromWorld = false;

    this.tasks = ["Make Tea", "Make Matcha", "Cook Pancake", "Make Juice"];
    this.padding = 16;
    this.lineHeight = 22;
  }

  update() {}

  draw(ctx) {
    ctx.save();
    ctx.font = "14px 'Press Start 2P', monospace";

    const canvas = ctx.canvas;
    const right = canvas.width - this.padding;
    const top = this.padding;

    const maxTextWidth = Math.max(
      ...this.tasks.map((t) => ctx.measureText(t).width)
    );
    const boxWidth = maxTextWidth + this.padding * 2;
    const boxHeight =
      this.tasks.length * this.lineHeight + this.padding * 2;
    const boxX = right - boxWidth;
    const boxY = top;

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    this.tasks.forEach((task, i) => {
      ctx.fillText(
        task,
        boxX + this.padding,
        boxY + this.padding + i * this.lineHeight
      );
    });

    ctx.restore();
  }
}
