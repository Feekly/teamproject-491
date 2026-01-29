const gameEngine = new GameEngine();
const ASSET_MANAGER = new AssetManager();

// queue cat sprites
ASSET_MANAGER.queueDownload("./cat/background.png");
ASSET_MANAGER.queueDownload("./cat/RunCatttt.png");
ASSET_MANAGER.queueDownload("./cat/JumpCattttt.png");
ASSET_MANAGER.queueDownload("./cat/AttackCattt.png");
ASSET_MANAGER.queueDownload("./cat/Sittingggg.png");
ASSET_MANAGER.queueDownload("./cat/DieCattt.png");


// ASSET_MANAGER.downloadAll(() => {
//   const canvas = document.getElementById("gameWorld");
//   const ctx = canvas.getContext("2d");
//   ctx.imageSmoothingEnabled = false;

//   gameEngine.init(ctx);
//   canvas.focus();

//   const cat = new Cat(gameEngine, 200, 520, {
//     run: ASSET_MANAGER.getAsset("./cat/RunCatttt.png"),
//     jump: ASSET_MANAGER.getAsset("./cat/JumpCattttt.png"),
//     attack: ASSET_MANAGER.getAsset("./cat/AttackCattt.png"),
//     sit: ASSET_MANAGER.getAsset("./cat/Sittingggg.png"),
//     die: ASSET_MANAGER.getAsset("./cat/DieCattt.png"),
//   });

//   gameEngine.addEntity(cat);
//   gameEngine.start();
// });

ASSET_MANAGER.downloadAll(() => {
const canvas = document.getElementById("gameWorld");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

gameEngine.init(ctx);

  
  gameEngine.init(ctx);
  canvas.focus();

  const cat = new Cat(gameEngine, 200, 675, {
    run: ASSET_MANAGER.getAsset("./cat/RunCatttt.png"),
    jump: ASSET_MANAGER.getAsset("./cat/JumpCattttt.png"),
    attack: ASSET_MANAGER.getAsset("./cat/AttackCattt.png"),
    sit: ASSET_MANAGER.getAsset("./cat/Sittingggg.png"),
    die: ASSET_MANAGER.getAsset("./cat/DieCattt.png"),
  });

  gameEngine.addEntity(cat);

  const hud = new HUD(gameEngine);
  gameEngine.addEntity(hud);

  const bg = new Background(gameEngine, ASSET_MANAGER.getAsset("./cat/background.png"));
  gameEngine.addEntity(bg);

  gameEngine.start();
});

