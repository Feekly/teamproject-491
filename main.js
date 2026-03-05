const gameEngine = new GameEngine();
const ASSET_MANAGER = new AssetManager();


const CAT_SPRITES = {
  // original “default” cat set in ./cat/vanessa
  default: {
    run: "./cat/vanessa/run.png",
    sit: "./cat/vanessa/sit.png",
  },

  grey: {
    run: "./cat/grey_cat/run.png",
    sit: "./cat/grey_cat/sit.png",
  },

  lightbrown: {
    run: "./cat/light_brown_cat/run.png",
    sit: "./cat/light_brown_cat/sit.png",
  },

  tiger: {
    run: "./cat/tiger_cat/run.png",
    sit: "./cat/tiger_cat/sit.png",
  },

  tricolor: {
    run: "./cat/tricolor_cat/run.png",
    sit: "./cat/tricolor_cat/sit.png",
  },

  vanessa: {
    run: "./cat/vanessa/run.png",
    sit: "./cat/vanessa/sit.png",
  },

  demun: {
    run: "./cat/demon_cat/run.png",
    sit: "./cat/demon_cat/sit.png",
  },
}

// queue images
for (const k in CAT_SPRITES) {
  const s = CAT_SPRITES[k];
  ASSET_MANAGER.queueDownload(s.run);
  ASSET_MANAGER.queueDownload(s.sit);
}

ASSET_MANAGER.queueDownload("./cat/start.png");
ASSET_MANAGER.queueDownload("./cat/playbutton.png");
ASSET_MANAGER.queueDownload("./cat/background.png");
ASSET_MANAGER.queueDownload("./cafe/workspace_cf.png");

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

    const key = gameEngine.selectedCatKey || "vanessa"; // fallback
    const spriteDef = CAT_SPRITES[key] || CAT_SPRITES.default;

    const cat = new Cat(gameEngine, 200, groundY, {
      run: ASSET_MANAGER.getAsset(spriteDef.run),
      sit: ASSET_MANAGER.getAsset(spriteDef.sit),
    });
    gameEngine.addEntity(cat);
    gameEngine.cat = cat;

    const difficulty = gameEngine.selectedDifficulty || "Easy";
    const cafe = new CafeManager(gameEngine, difficulty);
    gameEngine.cafe = cafe;
    gameEngine.addEntity(cafe);

    const hud = new HUD(gameEngine);
    gameEngine.addEntity(hud);

    const levelMap = new Background(
      gameEngine,
      ASSET_MANAGER.getAsset("./cafe/workspace_cf.png")
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
      { runSheet: ASSET_MANAGER.getAsset("./cat/vanessa/run.png") },
      () => {
        const catSpriteImages = {};
        for (const k in CAT_SPRITES) {
          const def = CAT_SPRITES[k];
          catSpriteImages[k] = {
            run: ASSET_MANAGER.getAsset(def.run),
            sit: ASSET_MANAGER.getAsset(def.sit),
          };
        }

        gameEngine.addEntity(
          new CharacterSelectScene(gameEngine, introBg, catSpriteImages, (selectedKey) => {
            gameEngine.selectedCatKey = selectedKey;

            const labels = {
              grey: "Bibo",
              lightbrown: "Siam",
              tiger: "Tygi",
              tricolor: "Claire",
              vanessa: "Mini",
              demun: "Demun",
            };
            gameEngine.playerName = labels[selectedKey] || "Host";

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
