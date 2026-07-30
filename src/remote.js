export class RemoteController {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.init();
  }

  init() {
    window.addEventListener('keydown', (e) => {
      const code = e.code || '';
      const keyCode = e.keyCode || 0;
      const key = e.key || '';

      const isEnter = code === 'Enter' || code === 'NumpadEnter' || key === 'Enter' || keyCode === 13 || keyCode === 23 || keyCode === 66 || keyCode === 29443;
      const isUp = code === 'ArrowUp' || code === 'Equal' || code === 'PageUp' || key === 'ArrowUp' || keyCode === 38 || keyCode === 19 || keyCode === 29460;
      const isDown = code === 'ArrowDown' || code === 'Minus' || code === 'PageDown' || key === 'ArrowDown' || keyCode === 40 || keyCode === 20 || keyCode === 29461;
      const isLeft = code === 'ArrowLeft' || key === 'ArrowLeft' || keyCode === 37 || keyCode === 21 || keyCode === 29462;
      const isRight = code === 'ArrowRight' || key === 'ArrowRight' || keyCode === 39 || keyCode === 22 || keyCode === 29463;
      const isBack = code === 'Escape' || code === 'Backspace' || key === 'Escape' || keyCode === 27 || keyCode === 8 || keyCode === 4 || keyCode === 461 || keyCode === 147;
      const isInfo = code === 'KeyI' || keyCode === 73;
      const isList = code === 'KeyL' || code === 'KeyC' || keyCode === 76 || keyCode === 67;
      const isGuide = code === 'KeyG' || code === 'KeyE' || keyCode === 71 || keyCode === 69;
      const isMenu = code === 'KeyM' || code === 'KeyO' || code === 'ContextMenu' || code === 'F10' || keyCode === 77 || keyCode === 79 || keyCode === 82;

      if (isUp || isDown || isLeft || isRight || isEnter || code === 'Space' || keyCode === 32) {
        e.preventDefault();
      }

      if (isUp) this.callbacks.onUp && this.callbacks.onUp();
      else if (isDown) this.callbacks.onDown && this.callbacks.onDown();
      else if (isLeft) this.callbacks.onLeft && this.callbacks.onLeft();
      else if (isRight) this.callbacks.onRight && this.callbacks.onRight();
      else if (isEnter || code === 'Space' || keyCode === 32) this.callbacks.onEnter && this.callbacks.onEnter();
      else if (isBack) this.callbacks.onBack && this.callbacks.onBack();
      else if (isInfo) this.callbacks.onInfo && this.callbacks.onInfo();
      else if (isList) this.callbacks.onList && this.callbacks.onList();
      else if (isGuide) this.callbacks.onGuide && this.callbacks.onGuide();
      else if (isMenu) this.callbacks.onMenu && this.callbacks.onMenu();
    }, { capture: true });
  }
}