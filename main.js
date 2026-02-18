const gameEngine = new GameEngine();
const ASSET_MANAGER = new AssetManager();

// queue images
ASSET_MANAGER.queueDownload("./cat/start.png");
ASSET_MANAGER.queueDownload("./cat/playbutton.png");

ASSET_MANAGER.queueDownload("./cat/background.png");

ASSET_MANAGER.queueDownload("./cafe/cafe-interior.png");

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

  canvas.addEventListener("click", () => canvas.focus());
  window.addEventListener("keydown", () => canvas.focus());

  // ---- helper: build gameplay when Start is clicked ----
  function clearAllEntities(game) {
    for (const e of game.entities) e.removeFromWorld = true;
  }

  function buildGameplay() {
    clearAllEntities(gameEngine);

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

    gameEngine.cat = cat;

    const difficulty = gameEngine.selectedDifficulty || "Easy"; // default if no selector yet
    const cafe = new CafeManager(gameEngine, difficulty);
    gameEngine.cafe = cafe;
    gameEngine.addEntity(cafe);

    const hud = new HUD(gameEngine);
    gameEngine.addEntity(hud);

      const levelMap = new Background(
      gameEngine,
      ASSET_MANAGER.getAsset("./cafe/cafe-interior.png")
    );
    gameEngine.addEntity(levelMap);
  }

  function startIntroFlow() {
    clearAllEntities(gameEngine);

    // intro/character-select can keep using the original outside background
    const introBg = ASSET_MANAGER.getAsset("./cat/background.png");

    const intro = new IntroScene(
      gameEngine,
      introBg,
      { runSheet: ASSET_MANAGER.getAsset("./cat/RunCatttt.png") },
      () => {
        gameEngine.addEntity(
          new CharacterSelectScene(gameEngine, introBg, (selected) => {
            gameEngine.selectedCatKey = selected.key;
            gameEngine.playerName = selected.label;

            // ✅ Gameplay (level map) starts here
            buildGameplay();
          })
        );
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
