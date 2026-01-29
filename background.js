class Background {
  constructor(game, image) {
    this.game = game;
    this.image = image;
    this.removeFromWorld = false;
  }
  update() {}
  draw(ctx) {
    ctx.drawImage(this.image, 0, 0, ctx.canvas.width, ctx.canvas.height);
  }
}
