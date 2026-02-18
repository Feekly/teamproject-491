// cafemanager.js

class CafeManager {
  constructor(game, difficulty = "Easy") {
    this.game = game;
    this.removeFromWorld = false;

    // ---------------- Difficulty ----------------
    this.difficulty = difficulty;

    this.baseTarget =
      difficulty === "Hard" ? 45 :
      difficulty === "Medium" ? 30 : 20;

    this.maxOrders =
      difficulty === "Hard" ? 5 :
      difficulty === "Medium" ? 4 : 3;

    this.orderSpawnEvery =
      difficulty === "Hard" ? 3.25 :
      difficulty === "Medium" ? 4.0 : 5.0;

    // ---------------- Day State ----------------
    this.day = 1;
    this.target = this.computeTarget(this.day);
    this.dayEarned = 0;
    this.totalMoney = 0;
    this.message = "Start cooking!";

    // ---------------- Processing Times ----------------
    this.processingTimes = {
      juice: 4,
      coffee: 5,
      tea: 3,
      pancake: 6
    };

    this.stations = {
      coffee: { remaining: 0, outputReady: false },
      tea: { remaining: 0, outputReady: false },
      juice: { remaining: 0, outputReady: false },
      pancake: { remaining: 0, outputReady: false }
    };

    // ---------------- Orders ----------------
    this.orders = [];
    this._spawnTimer = 0;
    this._orderId = 1;

    // ---------------- Carrying ----------------
    this.carryingItem = null;

    this._prevKeys = {};

    this.stationPositions = {
        coffee:  { x: 40,  yOffset: -260 },
        tea:     { x: 180, yOffset: -260 },
        juice:   { x: 320, yOffset: -260 },
        pancake: { x: 460, yOffset: -260 }
    };

    this.counterPosition = {
        xOffset: -220,
        yOffset: -320
    };
    this.trashPosition = {
        xOffset: -220, 
        yOffset: -110  
    };
  }

  computeTarget(day) {
    return Math.round(this.baseTarget * (1 + 0.15 * (day - 1)));
  }

  // ---------------- Day Logic ----------------
  finishDayAndApplyRules() {
    const earned = this.dayEarned;
    const target = this.target;

    if (earned < target) {
      this.message = `Day failed (${earned}/${target}). Restarting...`;
      this.startDay();
      return;
    }

    let bonus = 0;
    const pct = (earned - target) / target;

    if (pct > 0.10) bonus = 10;
    else if (pct > 0.07) bonus = 7;
    else if (pct > 0.05) bonus = 5;

    this.totalMoney += earned + bonus;
    this.day++;
    this.startDay();

    this.message = `Day cleared! Bonus $${bonus}`;
  }

  startDay() {
    this.target = this.computeTarget(this.day);
    this.dayEarned = 0;
    this.orders = [];
    this._spawnTimer = 0;
    this.carryingItem = null;

    for (const k in this.stations) {
      this.stations[k].remaining = 0;
      this.stations[k].outputReady = false;
    }
  }

  // ---------------- Orders ----------------
  maybeSpawnOrder(dt) {
    this._spawnTimer += dt;
    if (this._spawnTimer < this.orderSpawnEvery) return;
    this._spawnTimer = 0;

    if (this.orders.length >= this.maxOrders) return;

    const menu = [
      { item: "coffee", price: 6 },
      { item: "tea", price: 5 },
      { item: "juice", price: 7 },
      { item: "pancake", price: 9 }
    ];

    const pick = menu[Math.floor(Math.random() * menu.length)];
    this.orders.push({
      id: this._orderId++,
      item: pick.item,
      price: pick.price
    });
  }

  // ---------------- Stations ----------------
  startProcessing(key, cat) {
    if (!this.isNear(cat, key)) {
      this.message = "Move closer to station.";
      return;
    }

    const s = this.stations[key];
    if (s.remaining > 0) {
      this.message = "Station busy.";
      return;
    }

    s.remaining = this.processingTimes[key];
    this.message = `Cooking ${key}...`;
  }

  updateStations(dt) {
    for (const [key, s] of Object.entries(this.stations)) {
      if (s.remaining > 0) {
        s.remaining -= dt;
        if (s.remaining <= 0) {
          s.remaining = 0;
          s.outputReady = true;
          this.message = `${key} ready!`;
        }
      }
    }
  }

  pickupFromStation(cat) {
    if (this.carryingItem) {
      this.message = "Already carrying!";
      return;
    }

    for (const [key, s] of Object.entries(this.stations)) {
      if (s.outputReady && this.isNear(cat, key)) {
        s.outputReady = false;
        this.carryingItem = key;
        this.message = `Picked up ${key}`;
        return;
      }
    }

    this.message = "Nothing ready here.";
  }

  // E at a station will start cooking if idle, or pick up if ready.
interactWithNearestStation(cat) {
  const stationKeys = ["coffee", "tea", "juice", "pancake"];

  for (const key of stationKeys) {
    if (!this.isNear(cat, key)) continue;

    const s = this.stations[key];

    //If carrying something, you can't start or pick up anything else
    if (this.carryingItem) {
      this.message = `Hands full! Deliver ${this.carryingItem.toUpperCase()} first.`;
      return true;
    }

    // READY -> pick up
    if (s.outputReady) {
      s.outputReady = false;
      this.carryingItem = key;
      this.message = `Picked up ${key.toUpperCase()}. Go to counter!`;
      return true;
    }

    // BUSY -> show remaining
    if (s.remaining > 0) {
      this.message = `${key.toUpperCase()} cooking... ${s.remaining.toFixed(1)}s`;
      return true;
    }

    // IDLE -> start cooking
    s.remaining = this.processingTimes[key];
    this.message = `Started ${key.toUpperCase()}...`;
    return true;
  }

  return false; // not near any station
}


  serveAtCounter(cat) {
  if (!this.carryingItem) {
    this.message = "You aren't carrying anything.";
    return;
  }

  if (this.orders.length === 0) {
    this.message = "No orders waiting.";
    return;
  }

  const order = this.orders[0];

  if (order.item !== this.carryingItem) {
    this.message = `Wrong! Need ${order.item.toUpperCase()}.`;
    return; //keep item in hand
  }

  //correct delivery
  this.orders.shift();
  this.dayEarned += order.price;
  this.totalMoney += order.price;

  this.message = `Delivered ${order.item.toUpperCase()}! +$${order.price}`;
  this.carryingItem = null;
}

discardAtTrash() {
  if (!this.carryingItem) {
    this.message = "Nothing to throw away.";
    return;
  }
  const thrown = this.carryingItem.toUpperCase();
  this.carryingItem = null;
  this.message = `Threw away ${thrown}.`;
}

refreshZones() {
  const c = this.game.ctx.canvas;
  const stationY = Math.round(c.height - 260);

  // Use your stationPositions + counterPosition so you can move them later
  this.zones = {
    coffee:  { x: this.stationPositions.coffee.x,  y: Math.round(c.height + this.stationPositions.coffee.yOffset),  w: 120, h: 80 },
    tea:     { x: this.stationPositions.tea.x,     y: Math.round(c.height + this.stationPositions.tea.yOffset),     w: 120, h: 80 },
    juice:   { x: this.stationPositions.juice.x,   y: Math.round(c.height + this.stationPositions.juice.yOffset),   w: 120, h: 80 },
    pancake: { x: this.stationPositions.pancake.x, y: Math.round(c.height + this.stationPositions.pancake.yOffset), w: 120, h: 80 },

    counter: {
      x: Math.round(c.width + this.counterPosition.xOffset),
      y: Math.round(c.height + this.counterPosition.yOffset),
      w: 180,
      h: 180
    },
    trash: {
    x: Math.round(c.width + this.trashPosition.xOffset),
    y: Math.round(c.height + this.trashPosition.yOffset),
    w: 100,
    h: 100
}
  };
}
  // ---------------- Zones ----------------
 isNear(cat, key) {
  if (!this.zones || !this.zones[key]) return false;

  const z = this.zones[key];


  const drawW = (cat.FRAME_W && cat.SCALE) ? cat.FRAME_W * cat.SCALE : 64;
  const drawH = (cat.FRAME_H && cat.SCALE) ? cat.FRAME_H * cat.SCALE : 64;

  const cx = cat.x + drawW / 2;
  const cy = cat.y + drawH / 2;

  // optional: make interaction a little forgiving
  const pad = 10;

  return (
    cx > z.x - pad &&
    cx < z.x + z.w + pad &&
    cy > z.y - pad &&
    cy < z.y + z.h + pad
  );
}

_isPressedOnce(key) {
  const down = !!this.game.keys[key];
  const wasDown = !!this._prevKeys[key];
  this._prevKeys[key] = down;
  return down && !wasDown;
}
  // ---------------- Entity Loop ----------------
  update() {
    this.refreshZones();
    const dt = this.game.clockTick;
    const cat = this.game.cat;

    this.maybeSpawnOrder(dt);
    this.updateStations(dt);

    if (this._isPressedOnce("e") || this._isPressedOnce("E")) {
        console.log("E pressed", { x: this.game.cat.x, y: this.game.cat.y, nearTea: this.isNear(this.game.cat, "tea") });


    // Counter has priority
    if (this.isNear(cat, "counter")) {
        this.serveAtCounter(cat);
    } else if (this.isNear(cat, "trash")) {      
        this.discardAtTrash();                       
    } else {
        const used = this.interactWithNearestStation(cat);
        if (!used) this.message = "Go near a station, counter, or trash.";
    }
   }    
  }

  draw(ctx) {
  //make sure zones exist even before first update tick
  if (!this.zones) this.refreshZones();

  ctx.save();
  ctx.font = "14px monospace";

  const blocks = ["coffee", "tea", "juice", "pancake"];

  for (const key of blocks) {
    const z = this.zones[key];

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.strokeRect(z.x, z.y, z.w, z.h);

    ctx.fillStyle = "white";
    ctx.fillText(key.toUpperCase(), z.x + 10, z.y + 20);

    const s = this.stations[key];
    const text =
      s.outputReady ? "READY" :
      s.remaining > 0 ? s.remaining.toFixed(1) + "s" :
      "IDLE";
    ctx.fillText(text, z.x + 10, z.y + 50);
  }

  // Counter
  const cz = this.zones.counter;
  ctx.fillStyle = "rgba(200,100,100,0.3)";
  ctx.fillRect(cz.x, cz.y, cz.w, cz.h);
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.strokeRect(cz.x, cz.y, cz.w, cz.h);
  ctx.fillStyle = "white";
  ctx.fillText("COUNTER", cz.x + 20, cz.y + 30);

  // Trash
  const tz = this.zones.trash;
  ctx.fillStyle = "rgba(80,80,80,0.35)";
  ctx.fillRect(tz.x, tz.y, tz.w, tz.h);
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.strokeRect(tz.x, tz.y, tz.w, tz.h);
  ctx.fillStyle = "white";
  ctx.fillText("TRASH", tz.x + 18, tz.y + 28);

  // Debug UI
  ctx.fillText("CARRY: " + (this.carryingItem || "(none)"), 20, 90);
  ctx.fillText("SCORE: $" + this.totalMoney, 20, 115);
  ctx.fillText("DAY " + this.day + "  $" + this.dayEarned + " / $" + this.target, 20, 140);

  const next = this.orders.length > 0 ? this.orders[0].item.toUpperCase() : "(NONE)";
  ctx.fillText("NEXT ORDER: " + next, 20, 165);
  ctx.fillText("MSG: " + this.message, 20, 190);

  ctx.restore();
}

}
