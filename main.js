const gameEngine = new GameEngine();
const ASSET_MANAGER = new AssetManager();

// queue images
ASSET_MANAGER.queueDownload("./cat/start.png");
ASSET_MANAGER.queueDownload("./cat/playbutton.png");

ASSET_MANAGER.queueDownload("./cat/background.png");
ASSET_MANAGER.queueDownload("./cat/RunCatttt.png");
ASSET_MANAGER.queueDownload("./cat/JumpCattttt.png");
ASSET_MANAGER.queueDownload("./cat/AttackCattt.png");
ASSET_MANAGER.queueDownload("./cat/Sittingggg.png");
ASSET_MANAGER.queueDownload("./cat/DieCattt.png");

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
  canvas.focus();

  // ---- helper: build gameplay when Start is clicked ----
  function clearAllEntities(game) {
    for (const e of game.entities) e.removeFromWorld = true;
  }

  function buildGameplay() {
    clearAllEntities(gameEngine);

    // IMPORTANT: background first (drawn last), then cat, then HUD
    const bg = new Background(gameEngine, ASSET_MANAGER.getAsset("./cat/background.png"));
    gameEngine.addEntity(bg);

    const canvas = gameEngine.ctx.canvas;
    const groundY = Math.round(canvas.height - 32 * 4 - 40);

    const cat = new Cat(gameEngine, 200, groundY, {
      run: ASSET_MANAGER.getAsset("./cat/RunCatttt.png"),
      jump: ASSET_MANAGER.getAsset("./cat/JumpCattttt.png"),
      attack: ASSET_MANAGER.getAsset("./cat/AttackCattt.png"),
      sit: ASSET_MANAGER.getAsset("./cat/Sittingggg.png"),
      die: ASSET_MANAGER.getAsset("./cat/DieCattt.png"),
    });
    gameEngine.addEntity(cat);

    const hud = new HUD(gameEngine);
    gameEngine.addEntity(hud);
  }

  function startIntroFlow() {
    clearAllEntities(gameEngine);

    const bg = ASSET_MANAGER.getAsset("./cat/background.png");

    // Intro scene → prompt name → Character select
    const intro = new IntroScene(
      gameEngine,
      bg,
      { runSheet: ASSET_MANAGER.getAsset("./cat/RunCatttt.png") },
      () => {

        // after IntroScene marks itself removeFromWorld, we add selection
        gameEngine.addEntity(new CharacterSelectScene(
          gameEngine,
          bg,
          (selected) => {
            // store selection + start gameplay
            gameEngine.selectedCatKey = selected.key;
            gameEngine.playerName = selected.label;
            
            buildGameplay();
          }
        ));
      }
    );

    gameEngine.addEntity(intro);
  }


  // ---- Start Screen first ----
  const startImg = ASSET_MANAGER.getAsset("./cat/start.png");
  const playBtn = ASSET_MANAGER.getAsset("./cat/playbutton.png");
  gameEngine.addEntity(new StartScreen(gameEngine, startImg, playBtn, startIntroFlow));


  // start the loop (it will show StartScreen)
  gameEngine.start();
});
