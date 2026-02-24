// cafemanager.js

class CafeManager {
  // --------------------Constructor / Setup----------------------------
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

    // Fixed quota
    this.target = 100;

    this.dayEarned = 0;
    this.totalMoney = 0;
    this.message = "Start cooking!";

    // ---------------- Day Timer ----------------
    // 7am to 5pm = 10 in-game hours
    this.dayStartHour = 7;
    this.dayEndHour = 17; // 5pm in 24h time
    this.dayLengthHours = this.dayEndHour - this.dayStartHour; // 10

    // Real-time seconds that represent the whole day (tweak this)
    this.dayLengthSeconds = 180; // 3 minutes per day (change to 120, 300, etc.)

    this.dayElapsed = 0;     // seconds elapsed in the day
    this.gameOver = false;   // stops gameplay when true

    // ---------------- Player State ----------------
    this.carryingItem = null;
    this.prevKeys = {};

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
    this.spawnTimer = 0;
    this.orderId = 1;

    // ---------------- World Positions ----------------
    this.stationPositions = {
      coffee: { x: 760, y: 120 },
      tea: { x: 870, y: 160 },
      juice: { x: 980, y: 200 },
      pancake: { x: 1090, y: 240 }
    };

    this.counterPosition = {
      xOffset: 1141,
      yOffset: 436
    };

    this.trashPosition = {
      xOffset: 464,
      yOffset: 411
    };

    // ---------------- Customers / Tables ----------------
    this.maxCustomers = 7;
    this.customers = [];
    this.custId = 1;

    this.customerSpawnMin = 2.5;   // fastest spawn
    this.customerSpawnMax = 6.0;   // slowest spawn

    this.custSpawnTimer = 0;
    this.nextSpawnDelay = this.randomSpawnDelay();

    // Tables
    this.tablePositions = [
      { id: 1, x: 520, y: 260, w: 90, h: 60 },
      { id: 2, x: 380, y: 320, w: 90, h: 60 },
      { id: 3, x: 620, y: 360, w: 90, h: 60 },
      { id: 4, x: 460, y: 430, w: 90, h: 60 },
      { id: 5, x: 680, y: 470, w: 90, h: 60 }
    ];

    // Entrance / waiting spot
    this.entrancePosition = { x: 1040, y: 520, w: 120, h: 90 };

    // Optional: patience (seconds) before leaving
    this.patienceMin = 35;
    this.patienceMax = 125;
  }

  // ---------------Day / Progress Logic--------------------
  computeTarget(day) {
    return Math.round(this.baseTarget * (1 + 0.15 * (day - 1)));
  }

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
    this.dayElapsed = 0;
    this.dayEarned = 0;

    this.orders = [];
    this.spawnTimer = 0;
    this.carryingItem = null;

    for (const k in this.stations) {
      this.stations[k].remaining = 0;
      this.stations[k].outputReady = false;
    }
  }

  // ---------------- Day Timer Helpers ----------------
  getCurrentClockString() {
    // progress 0..1 through the day
    const t = Math.min(1, this.dayElapsed / this.dayLengthSeconds);

    // 7 -> 17 (10 hours)
    const hourFloat = this.dayStartHour + t * this.dayLengthHours;

    let hour = Math.floor(hourFloat);
    let minute = Math.floor((hourFloat - hour) * 60);

    const ampm = hour >= 12 ? "PM" : "AM";
    let displayHour = hour % 12;
    if (displayHour === 0) displayHour = 12;

    const mm = minute.toString().padStart(2, "0");
    return `${displayHour}:${mm} ${ampm}`;
  }

  endDay() {
    if (this.dayEarned < this.target) {
      this.message = `GAME OVER: You earned $${this.dayEarned} / $${this.target}`;
      this.gameOver = true;
      return;
    }

    // Day passed -> go next day 
    this.day++;

    // reset day timer + day money
    this.dayElapsed = 0;
    this.dayEarned = 0;

    // Optional: clear orders/customers between days
    this.orders = [];
    this.customers = [];
    this.carryingItem = null;

    // Optional: reset stations
    for (const k in this.stations) {
      this.stations[k].remaining = 0;
      this.stations[k].outputReady = false;
    }

    this.message = "Day cleared! New day started.";
  }


  // ---------------------Orders--------------------------

  maybeSpawnOrder(dt) {
    this.spawnTimer += dt;
    if (this.spawnTimer < this.orderSpawnEvery) return;
    this.spawnTimer = 0;

    if (this.orders.length >= this.maxOrders) return;

    const menu = [
      { item: "coffee", price: 6 },
      { item: "tea", price: 5 },
      { item: "juice", price: 7 },
      { item: "pancake", price: 9 }
    ];

    const pick = menu[Math.floor(Math.random() * menu.length)];
    this.orders.push({
      id: this.orderId++,
      item: pick.item,
      price: pick.price
    });
  }


  // ------------------Stations (Cooking)----------------------------

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

      // If carrying something, you can't start or pick up anything else
      if (this.carryingItem) {
        this.message = `Hands full! Deliver ${this.carryingItem.toUpperCase()} first.`;
        return true;
      }

      // READY -> pick up
      if (s.outputReady) {
        s.outputReady = false;
        this.carryingItem = key;
        this.message = `Picked up ${key.toUpperCase()}. Deliver to the right table!`;
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


  // --------------------Serving / Trash----------------
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
      return; // keep item in hand
    }

    // correct delivery
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


  // -----------------Zones / Collision Helpers------------------------

  refreshZones() {
    const c = this.game.ctx.canvas;
    const stationY = Math.round(c.height - 260);

    this.zones = {
      coffee: { x: this.stationPositions.coffee.x, y: this.stationPositions.coffee.y, w: 120, h: 80 },
      tea: { x: this.stationPositions.tea.x, y: this.stationPositions.tea.y, w: 120, h: 80 },
      juice: { x: this.stationPositions.juice.x, y: this.stationPositions.juice.y, w: 120, h: 80 },
      pancake: { x: this.stationPositions.pancake.x, y: this.stationPositions.pancake.y, w: 120, h: 80 },

      trash: {
        x: this.trashPosition.xOffset,
        y: this.trashPosition.yOffset,
        w: 100,
        h: 100
      },

      entrance: {
        x: this.entrancePosition.x,
        y: this.entrancePosition.y,
        w: this.entrancePosition.w,
        h: this.entrancePosition.h
      },

      tables: this.tablePositions.map(t => ({
        id: t.id,
        x: t.x,
        y: t.y,
        w: t.w,
        h: t.h
      }))
    };
  }

  isNear(cat, key) {
    if (!this.zones || !this.zones[key]) return false;

    const z = this.zones[key];

    const drawW = (cat.FRAME_W && cat.SCALE) ? cat.FRAME_W * cat.SCALE : 64;
    const drawH = (cat.FRAME_H && cat.SCALE) ? cat.FRAME_H * cat.SCALE : 64;

    const cx = cat.x + drawW / 2;
    const cy = cat.y + drawH / 2;

    const pad = 10;

    return (
      cx > z.x - pad &&
      cx < z.x + z.w + pad &&
      cy > z.y - pad &&
      cy < z.y + z.h + pad
    );
  }

  isPressedOnce(key) {
    const down = !!this.game.keys[key];
    const wasDown = !!this.prevKeys[key];
    this.prevKeys[key] = down;
    return down && !wasDown;
  }


  // --------------------Customer / Tables Logic--------------------------
  getFreeTableId() {
    const occupied = new Set(this.customers.filter(c => c.state === "seated").map(c => c.tableId));
    const free = this.tablePositions.find(t => !occupied.has(t.id));
    return free ? free.id : null;
  }

  getTableZone(tableId) {
    const t = this.tablePositions.find(tt => tt.id === tableId);
    return t || null;
  }

  randomSpawnDelay() {
    return Math.random() * (this.customerSpawnMax - this.customerSpawnMin)
      + this.customerSpawnMin;
  }

  randomPatience() {
    return Math.random() * (this.patienceMax - this.patienceMin)
      + this.patienceMin;
  }

  spawnCustomer() {
    if (this.customers.length >= this.maxCustomers) return;

    const menu = ["coffee", "tea", "juice", "pancake"];
    const item = menu[Math.floor(Math.random() * menu.length)];

    this.customers.push({
      id: this.custId++,
      state: "waiting",
      orderItem: item,
      tableId: null,
      patience: this.randomPatience()
    });
  }

  updateCustomers(dt) {
    for (const c of this.customers) {
      if (c.state === "seated") {
        c.patience -= dt;
        if (c.patience <= 0) {
          c.state = "leaving";
          this.message = `Customer #${c.id} left (too slow).`;
        }
      }
    }

    this.customers = this.customers.filter(c => c.state !== "leaving");
  }

  seatCustomerIfPossible(cat) {
    if (!this.isNear(cat, "entrance")) return false;

    const waiting = this.customers.find(c => c.state === "waiting");
    if (!waiting) {
      this.message = "No one waiting at the entrance.";
      return true;
    }

    const freeTableId = this.getFreeTableId();
    if (!freeTableId) {
      this.message = "No free tables right now.";
      return true;
    }

    waiting.state = "seated";
    waiting.tableId = freeTableId;
    waiting.patience = this.randomPatience();

    this.message = `Seated customer #${waiting.id} (wants ${waiting.orderItem.toUpperCase()}).`;
    return true;
  }

  deliverToNearestTable(cat) {
    // Find which table you're near FIRST
    const tables = (this.zones && this.zones.tables) ? this.zones.tables : [];

    const drawW = (cat.FRAME_W && cat.SCALE) ? cat.FRAME_W * cat.SCALE : 64;
    const drawH = (cat.FRAME_H && cat.SCALE) ? cat.FRAME_H * cat.SCALE : 64;
    const cx = cat.x + drawW / 2;
    const cy = cat.y + drawH / 2;
    const pad = 10;

    const near = tables.find(tz =>
      cx > tz.x - pad &&
      cx < tz.x + tz.w + pad &&
      cy > tz.y - pad &&
      cy < tz.y + tz.h + pad
    );

    // Not near any table? Don't consume E let entrance/stations handle it
    if (!near) return false;

    // Now we ARE near a table, so handle delivery messaging
    if (!this.carryingItem) {
      this.message = "You're not carrying anything.";
      return true;
    }

    const seated = this.customers.find(c => c.state === "seated" && c.tableId === near.id);
    if (!seated) {
      this.message = "No customer at this table.";
      return true;
    }

    if (seated.orderItem !== this.carryingItem) {
      this.message = `Wrong item! Customer wants ${seated.orderItem.toUpperCase()}.`;
      return true;
    }

    const prices = { coffee: 6, tea: 5, juice: 7, pancake: 9 };
    const pay = prices[seated.orderItem] ?? 5;

    this.dayEarned += pay;
    this.totalMoney += pay;

    this.message = `Delivered ${seated.orderItem.toUpperCase()} to table ${near.id}! +$${pay}`;
    this.carryingItem = null;

    seated.state = "leaving";
    return true;
  }

  // -------------------Game Loop---------------------------

  update() {
    this.refreshZones();
    const dt = this.game.clockTick;
    const cat = this.game.cat;

    if (this.gameOver) return;


    this.dayElapsed += dt;

    if (this.dayElapsed >= this.dayLengthSeconds) {
      this.dayElapsed = this.dayLengthSeconds;
      this.endDay();
      return;
    }

    this.updateStations(dt);

    this.custSpawnTimer += dt;
    if (this.custSpawnTimer >= this.nextSpawnDelay) {
      this.custSpawnTimer = 0;
      this.spawnCustomer();

      // pick a new random delay for the NEXT spawn
      this.nextSpawnDelay = this.randomSpawnDelay();
    }

    this.updateCustomers(dt);

    if (this.isPressedOnce("e") || this.isPressedOnce("E")) {

      // 1) Trash has top priority
      if (this.isNear(cat, "trash")) {
        this.discardAtTrash();
        return;
      }

      // 2) Deliver to table
      const deliveredOrHandled = this.deliverToNearestTable(cat);
      if (deliveredOrHandled) return;

      // 3) Seat customer
      const seated = this.seatCustomerIfPossible(cat);
      if (seated) return;

      // 4) Stations
      const used = this.interactWithNearestStation(cat);
      if (!used) this.message = "Go near a station, a table, the entrance, or trash.";
    }
  }

  // -------------------Draw----------------------------
  draw(ctx) {
    // make sure zones exist even before first update tick
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

    for (const t of this.tablePositions) {
      ctx.fillStyle = "rgba(255,200,80,0.18)";
      ctx.fillRect(t.x, t.y, t.w, t.h);
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.strokeRect(t.x, t.y, t.w, t.h);
      ctx.fillStyle = "white";
      ctx.fillText(`TABLE ${t.id}`, t.x + 8, t.y + 18);

      const seated = this.customers.find(c => c.state === "seated" && c.tableId === t.id);
      if (seated) {
        ctx.fillText(`#${seated.id}: ${seated.orderItem.toUpperCase()}`, t.x + 8, t.y + 40);
        ctx.fillText(`pat: ${Math.max(0, seated.patience).toFixed(0)}s`, t.x + 8, t.y + 58);
      }
    }

    // Entrance
    const ez = this.zones.entrance;
    ctx.fillStyle = "rgba(120,200,255,0.18)";
    ctx.fillRect(ez.x, ez.y, ez.w, ez.h);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.strokeRect(ez.x, ez.y, ez.w, ez.h);
    ctx.fillStyle = "white";
    ctx.fillText("ENTRANCE", ez.x + 10, ez.y + 22);

    // Waiting customers count
    const waitingCount = this.customers.filter(c => c.state === "waiting").length;
    ctx.fillText(`WAITING: ${waitingCount}`, ez.x + 10, ez.y + 45);

    // Show next waiting customer's order (if any)
    const nextWaiting = this.customers.find(c => c.state === "waiting");
    if (nextWaiting) {
      ctx.fillText(`NEXT: ${nextWaiting.orderItem.toUpperCase()}`, ez.x + 10, ez.y + 68);
    }

    // Trash
    const tz = this.zones.trash;
    ctx.fillStyle = "rgba(80,80,80,0.35)";
    ctx.fillRect(tz.x, tz.y, tz.w, tz.h);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.strokeRect(tz.x, tz.y, tz.w, tz.h);
    ctx.fillStyle = "white";
    ctx.fillText("TRASH", tz.x + 18, tz.y + 28);

    // Debug UI
    ctx.fillText(`TIME: ${this.getCurrentClockString()} (7AM - 5PM)`, 20, 65);
    ctx.fillText(`QUOTA: $${this.dayEarned} / $${this.target}`, 20, 80);
    ctx.fillText("CARRY: " + (this.carryingItem || "(none)"), 20, 90);
    ctx.fillText("SCORE: $" + this.totalMoney, 20, 115);
    ctx.fillText("DAY " + this.day + "  $" + this.dayEarned + " / $" + this.target, 20, 140);

    const nextOrder = nextWaiting ? nextWaiting.orderItem.toUpperCase() : "(NONE)";
    ctx.fillText("NEXT ORDER: " + nextOrder, 20, 165);
    ctx.fillText("MSG: " + this.message, 20, 190);

    // DEBUG COORDS
    if (this.game.mouse) {
      ctx.fillStyle = "yellow";
      ctx.fillText(
        `X: ${Math.round(this.game.mouse.x)}  Y: ${Math.round(this.game.mouse.y)}`,
        this.game.mouse.x + 10,
        this.game.mouse.y - 10
      );
    }

    // DEBUG DELAY
    ctx.fillText(`SPAWN IN: ${Math.max(0, this.nextSpawnDelay - this.custSpawnTimer).toFixed(1)}s`, 20, 215);

    // GAME OVER overlay
    if (this.gameOver) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      ctx.fillStyle = "white";
      ctx.font = "48px monospace";
      ctx.fillText("GAME OVER", 60, 120);

      ctx.font = "24px monospace";
      ctx.fillText(`You earned $${this.dayEarned} / $${this.target}`, 60, 170);
      ctx.fillText("Refresh to restart.", 60, 210);
      ctx.restore();
    }

    ctx.restore();
  }
}