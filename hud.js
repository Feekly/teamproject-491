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
  ctx.save();
  ctx.font = "16px 'Press Start 2P'";
  ctx.fillStyle = "#b598db";
  ctx.fillText("← → MOVE", 20, 30);
  ctx.fillText("↑ JUMP", 20, 55);
  ctx.fillText("A ATTACK", 20, 80);
  ctx.restore();
  }
}
