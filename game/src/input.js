// Solara Bay v13 — input: keyboard + mouse mapped to semantic actions.
// The simulation consumes actions, never raw keys.
export class InputSystem {
  constructor() {
    this.keys = new Set();
    this.actions = {
      forward: false, back: false, left: false, right: false,
      brake: false, enterExit: false, map: false, save: false,
    };
    this.pressed = new Set(); // edge-triggered, consumed once
    this.onKey = (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      this.sync();
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    };
    this.onKeyUp = (e) => { this.keys.delete(e.code); this.sync(); };
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
  }

  sync() {
    const k = this.keys;
    this.actions.forward = k.has('KeyW') || k.has('ArrowUp');
    this.actions.back = k.has('KeyS') || k.has('ArrowDown');
    this.actions.left = k.has('KeyA') || k.has('ArrowLeft');
    this.actions.right = k.has('KeyD') || k.has('ArrowRight');
    this.actions.brake = k.has('Space');
  }

  // Edge-triggered actions, consumed once per press.
  consume(code) {
    if (this.pressed.has(code)) { this.pressed.delete(code); return true; }
    return false;
  }

  consumeDigit(n) { return this.consume(`Digit${n}`); }

  dispose() {
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
