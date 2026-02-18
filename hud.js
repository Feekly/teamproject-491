class HUD {
  constructor(game) {
    this.game = game;
    this.removeFromWorld = false;

    // text config
    this.x = 18;
    this.y = 740; 
  }

  update() {}

  
  draw(ctx) {
    ctx.fillText("MOVE: WASD / ARROWS", 20, 30);
    ctx.fillText("E: PICKUP / DELIVER", 20, 55);
  }
}
