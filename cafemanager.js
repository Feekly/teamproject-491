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
    // Station centers (used to position both interaction zones and info boxes)
    this.stationPositions = {
      coffee: { x: 1290, y: 320 },
      pancake: { x: 1220, y: 480 },
      tea: { x: 1490, y: 460 },
      juice: { x: 930, y: 570 }
    };

    this.counterPosition = {
      xOffset: 1141,
      yOffset: 436
    };

    this.trashPosition = {
      // center measured at (1692, 690); zone is 100x100
      xOffset: 1642,
      yOffset: 640
    };

    // ---------------- Customers / Tables ----------------
    this.maxCustomers = 7;
    this.customers = [];
    this.custId = 1;

    this.customerSpawnMin = 2.5;   // fastest spawn
    this.customerSpawnMax = 6.0;   // slowest spawn

    this.custSpawnTimer = 0;
    this.nextSpawnDelay = this.randomSpawnDelay();

    // Tables (aligned to the 5 bottom-left cafe tables)
    // Each table zone is a rectangle centered on the measured table center.
    this.tablePositions = [
      // back row (from left to right) - centers:
      // Table 1: (620, 620)
      // Table 2: (711, 780)
      // Table 3: (1017, 740)
      { id: 1, x: 560, y: 580, w: 120, h: 80 },  // center (620, 620)
      { id: 2, x: 651, y: 740, w: 120, h: 80 },  // center (711, 780)
      { id: 3, x: 957, y: 700, w: 120, h: 80 },  // center (1017, 740)
      // front row (from left to right) - centers:
      // Table 4: (1267, 855)
      // Table 5: (1625, 930)
      { id: 4, x: 1207, y: 815, w: 120, h: 80 }, // center (1267, 855)
      { id: 5, x: 1565, y: 890, w: 120, h: 80 }  // center (1625, 930)
    ];

    // Entrance / waiting spot (center measured at approximately 1927, 935)
    // Use a 140x100 rectangle around that point.
    this.entrancePosition = { x: 1857, y: 885, w: 140, h: 100 };

    // Optional: patience (seconds) before leaving
    this.patienceMin = 35;
    this.patienceMax = 125;

        // ---------------- Tutorial ----------------
    this.tutorialActive = (this.day === 1);
    this.tutorialStep = 0;
    this.tutorialCustomerId = null;
    this.tutorialText = "";

    if (this.tutorialActive) {
      this.startTutorial();
    }
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

    const stationBoxW = 180;
    const stationBoxH = 64;

    this.zones = {
      // Station zones are centered on the white info boxes above each appliance.
      coffee: {
        x: this.stationPositions.coffee.x - stationBoxW / 2,
        y: this.stationPositions.coffee.y - stationBoxH / 2,
        w: stationBoxW,
        h: stationBoxH
      },
      tea: {
        x: this.stationPositions.tea.x - stationBoxW / 2,
        y: this.stationPositions.tea.y - stationBoxH / 2,
        w: stationBoxW,
        h: stationBoxH
      },
      juice: {
        x: this.stationPositions.juice.x - stationBoxW / 2,
        y: this.stationPositions.juice.y - stationBoxH / 2,
        w: stationBoxW,
        h: stationBoxH
      },
      pancake: {
        x: this.stationPositions.pancake.x - stationBoxW / 2,
        y: this.stationPositions.pancake.y - stationBoxH / 2,
        w: stationBoxW,
        h: stationBoxH
      },

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

    // ---------------- Tutorial ----------------
  startTutorial() {
    this.tutorialActive = true;
    this.tutorialStep = 0;
    this.tutorialCustomerId = null;

    // Pause real day progression until tutorial is done
    this.dayElapsed = 0;
    this.dayEarned = 0;
    this.totalMoney = 0;
    this.carryingItem = null;

    // Clear anything dynamic
    this.customers = [];
    this.custSpawnTimer = 0;
    this.nextSpawnDelay = this.randomSpawnDelay();

    for (const k in this.stations) {
      this.stations[k].remaining = 0;
      this.stations[k].outputReady = false;
    }

    // One scripted customer for coffee
    const tutorialCustomer = {
      id: this.custId++,
      state: "waiting",
      orderItem: "coffee",
      tableId: null,
      patience: 9999
    };

    this.customers.push(tutorialCustomer);
    this.tutorialCustomerId = tutorialCustomer.id;

    this.tutorialText = "Welcome! Move to the ENTRANCE to begin the tutorial.";
    this.message = this.tutorialText;
  }

  endTutorial() {
    this.tutorialActive = false;
    this.tutorialStep = -1;
    this.tutorialCustomerId = null;
    this.tutorialText = "";

    // Start actual Day 1 fresh
    this.dayElapsed = 0;
    this.dayEarned = 0;
    this.totalMoney = 0;
    this.carryingItem = null;

    this.customers = [];
    this.custSpawnTimer = 0;
    this.nextSpawnDelay = this.randomSpawnDelay();

    for (const k in this.stations) {
      this.stations[k].remaining = 0;
      this.stations[k].outputReady = false;
    }

    this.message = "Tutorial complete! Day 1 has started.";
  }

  getTutorialCustomer() {
    return this.customers.find(c => c.id === this.tutorialCustomerId) || null;
  }

  updateTutorial(dt, cat) {
    // stations still need to update during tutorial
    this.updateStations(dt);

    const pressedE = this.isPressedOnce("e") || this.isPressedOnce("E");
    const tutorialCustomer = this.getTutorialCustomer();

    switch (this.tutorialStep) {
      case 0: {
        this.tutorialText = "Step 1: Move to the ENTRANCE area.";
        if (this.isNear(cat, "entrance")) {
          this.tutorialStep = 1;
          this.tutorialText = "Step 2: Press E at the ENTRANCE to seat the customer.";
          this.message = this.tutorialText;
        }
        break;
      }

      case 1: {
        this.tutorialText = "Step 2: Press E at the ENTRANCE to seat the customer.";
        if (pressedE && this.isNear(cat, "entrance")) {
          this.seatCustomerIfPossible(cat);

          const seatedCustomer = this.getTutorialCustomer();
          if (seatedCustomer && seatedCustomer.state === "seated") {
            this.tutorialStep = 2;
            this.tutorialText = "Step 3: Go to the COFFEE station.";
            this.message = this.tutorialText;
          }
        }
        break;
      }

      case 2: {
        this.tutorialText = "Step 3: Go to the COFFEE station.";
        if (this.isNear(cat, "coffee")) {
          this.tutorialStep = 3;
          this.tutorialText = "Step 4: Press E at the COFFEE station to start brewing.";
          this.message = this.tutorialText;
        }
        break;
      }

      case 3: {
        this.tutorialText = "Step 4: Press E at the COFFEE station to start brewing.";
        if (pressedE && this.isNear(cat, "coffee")) {
          const before = this.stations.coffee.remaining;
          this.interactWithNearestStation(cat);

          if (before === 0 && this.stations.coffee.remaining > 0) {
            this.tutorialStep = 4;
            this.tutorialText = "Step 5: Wait until the coffee is READY.";
            this.message = this.tutorialText;
          }
        }
        break;
      }

      case 4: {
        this.tutorialText = "Step 5: Wait until the coffee is READY.";
        if (this.stations.coffee.outputReady) {
          this.tutorialStep = 5;
          this.tutorialText = "Step 6: Press E at the COFFEE station to pick it up.";
          this.message = this.tutorialText;
        }
        break;
      }

      case 5: {
        this.tutorialText = "Step 6: Press E at the COFFEE station to pick it up.";
        if (pressedE && this.isNear(cat, "coffee")) {
          const before = this.carryingItem;
          this.interactWithNearestStation(cat);

          if (before !== "coffee" && this.carryingItem === "coffee") {
            this.tutorialStep = 6;
            this.tutorialText = "Step 7: Go to TABLE 1 and press E to deliver the coffee.";
            this.message = this.tutorialText;
          }
        }
        break;
      }

      case 6: {
        this.tutorialText = "Step 7: Go to TABLE 1 and press E to deliver the coffee.";
        if (pressedE) {
          const earnedBefore = this.dayEarned;
          this.deliverToNearestTable(cat);

          if (this.dayEarned > earnedBefore) {
            this.tutorialStep = 7;
            this.tutorialText = "Tutorial complete! Press E to start the real Day 1.";
            this.message = this.tutorialText;
          }
        }
        break;
      }

      case 7: {
        this.tutorialText = "Tutorial complete! Press E to start the real Day 1.";
        if (pressedE || this.game.click) {
          this.game.click = null;
          this.endTutorial();
        }
        break;
      }
    }
  }

  // -------------------Game Loop---------------------------

  update() {
    this.refreshZones();
    const dt = this.game.clockTick;
    const cat = this.game.cat;

    if (this.gameOver) return;

    // Tutorial takes over Day 1 before normal gameplay starts
    if (this.tutorialActive) {
      this.updateTutorial(dt, cat);
      return;
    }

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
      const s = this.stations[key];

      // Rounded white info box; the interaction zone is exactly this box.
      const boxW = z.w;
      const boxH = z.h;
      const boxX = z.x;
      const boxY = z.y;
      const radius = 10;

      ctx.save();

      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(boxX, boxY, boxW, boxH, radius);
      } else {
        // Fallback rounded rect
        ctx.moveTo(boxX + radius, boxY);
        ctx.lineTo(boxX + boxW - radius, boxY);
        ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + radius);
        ctx.lineTo(boxX + boxW, boxY + boxH - radius);
        ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - radius, boxY + boxH);
        ctx.lineTo(boxX + radius, boxY + boxH);
        ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - radius);
        ctx.lineTo(boxX, boxY + radius);
        ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
      }

      ctx.fillStyle = "white";
      ctx.fill();
      ctx.strokeStyle = "black";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Bold, pixelated station name + timer inside the box
      ctx.font = "14px 'Press Start 2P'";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const centerX = boxX + boxW / 2;
      const nameY = boxY + boxH * 0.38;
      const timerY = boxY + boxH * 0.75;

      const statusText =
        s.outputReady ? "READY" :
          s.remaining > 0 ? s.remaining.toFixed(1) + "s" :
            "IDLE";

      // Color logic for station text:
      // - READY: green
      // - cooking (remaining > 0): yellow
      // - IDLE: red
      if (s.outputReady) {
        ctx.fillStyle = "#00ff66"; // green
      } else if (s.remaining > 0) {
        ctx.fillStyle = "yellow";
      } else {
        ctx.fillStyle = "#ff4444"; // red
      }

      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;

      ctx.strokeText(key.toUpperCase(), centerX, nameY);
      ctx.fillText(key.toUpperCase(), centerX, nameY);

      ctx.strokeText(statusText, centerX, timerY);
      ctx.fillText(statusText, centerX, timerY);

      ctx.restore();

      // The actual interaction zone for the station is this white box.
      // Later, station sprites can be drawn anchored just below this box if desired.
    }

    for (const t of this.tablePositions) {
      // Use bold, pixelated labels instead of solid table rectangles
      // Font loaded from index.html: "Press Start 2P"
      ctx.font = "16px 'Press Start 2P'";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      const centerX = t.x + t.w / 2;
      let lineY = t.y;

      const seated = this.customers.find(c => c.state === "seated" && c.tableId === t.id);

      // Color logic:
      // - idle (no seated customer): yellow
      // - seated customer waiting: green
      if (seated) {
        ctx.fillStyle = "#00ff66"; // bright green for active order
      } else {
        ctx.fillStyle = "yellow";  // idle table
      }

      // Use a black stroke around the pixel text for better readability
      ctx.strokeStyle = "black";
      ctx.lineWidth = 3;

      const drawLabeledLine = (text, x, y) => {
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      };

      // Table label
      drawLabeledLine(`TABLE ${t.id}`, centerX, lineY);
      lineY += 22;

      if (seated) {
        // Show order and a simple per-table timer (patience)
        drawLabeledLine(`#${seated.id}: ${seated.orderItem.toUpperCase()}`, centerX, lineY);
        lineY += 22;
        drawLabeledLine(`PAT: ${Math.max(0, seated.patience).toFixed(0)}s`, centerX, lineY);
      }
    }

    // Reset font alignment and styles for the rest of the HUD
    ctx.font = "14px monospace";
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "white";

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

    // Trash (keep a subtle box so it's visible as an area)
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

        // TUTORIAL overlay
    if (this.tutorialActive) {
      ctx.save();

      // instruction box
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(20, ctx.canvas.height - 110, 760, 80);

      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.strokeRect(20, ctx.canvas.height - 110, 760, 80);

      ctx.fillStyle = "white";
      ctx.font = "18px monospace";
      ctx.fillText("DAY 1 TUTORIAL", 35, ctx.canvas.height - 82);

      ctx.font = "16px monospace";
      ctx.fillText(this.tutorialText, 35, ctx.canvas.height - 50);

      ctx.restore();
    }

    // Keep the entrance highlight in tutorial, but remove yellow boxes
    // around kitchen appliances and tables for a cleaner look.
    if (this.tutorialActive) {
      ctx.save();
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 4;

      if (this.tutorialStep <= 1) {
        const z = this.zones.entrance;
        ctx.strokeRect(z.x, z.y, z.w, z.h);
      }

      ctx.restore();
    }

    ctx.restore();
  }
}