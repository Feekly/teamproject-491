// startscreen.js
class StartScreen {
    constructor(game, startBgImage, playBtnImage, onStart) {
        this.game = game;
        this.bg = startBgImage;        // ./cat/start.png
        this.playBtn = playBtnImage;   // ./cat/playbutton.png (102x32)
        this.onStart = onStart;
        this.removeFromWorld = false;

        // where the button sits (ratio)
        this.btnYRatio = 0.58;         // under "CAT CAFÉ"
        this.btnTargetWRatio = 0.12;   // button width ~12% of canvas width
    }

    getCanvas() {
        return this.game.ctx.canvas;
    }

    // choose an INTEGER scale so pixel art stays crisp
    computeScale(canvasW) {
        const baseW = 102;
        const targetW = canvasW * this.btnTargetWRatio;
        let scale = Math.round(targetW / baseW);

        // clamp scale to reasonable range (tweak if you want bigger/smaller)
        if (scale < 2) scale = 2;
        if (scale > 10) scale = 10;

        return scale; // integer
    }

    getButtonRect() {
        const c = this.getCanvas();

        const baseW = 102;
        const baseH = 32;

        const scale = this.computeScale(c.width);
        const w = baseW * scale;
        const h = baseH * scale;

        const x = Math.round((c.width - w) / 3.5);
        const y = Math.round(c.height * this.btnYRatio);

        return { x, y, w, h };
    }

    pointInRect(px, py, r) {
        return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
    }

    update() {
        const click = this.game.click;
        if (click) {
            const r = this.getButtonRect();
            if (this.pointInRect(click.x, click.y, r)) {
                this.game.click = null;
                this.removeFromWorld = true;

                if (typeof this.onStart === "function") this.onStart();
                return;
            }
            this.game.click = null;
        }
    }

    draw(ctx) {
        const c = this.getCanvas();

        // background
        if (this.bg) {
            ctx.drawImage(this.bg, 0, 0, c.width, c.height);
        } else {
            ctx.fillRect(0, 0, c.width, c.height);
        }

        // play button image
        const r = this.getButtonRect();
        if (this.playBtn) {
            ctx.drawImage(this.playBtn, r.x, r.y, r.w, r.h);
        }
    }
}
