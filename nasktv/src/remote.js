export class RemoteController {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.init();
  }

  init() {
    window.addEventListener('keydown', (e) => {
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","PageUp","PageDown"].indexOf(e.code) > -1) {
        e.preventDefault();
      }

      switch (e.code) {
        case 'ArrowUp':
        case 'Equal':
        case 'PageUp':
          this.callbacks.onUp && this.callbacks.onUp();
          break;
        case 'ArrowDown':
        case 'Minus':
        case 'PageDown':
          this.callbacks.onDown && this.callbacks.onDown();
          break;
        case 'ArrowLeft':
          this.callbacks.onLeft && this.callbacks.onLeft();
          break;
        case 'ArrowRight':
          this.callbacks.onRight && this.callbacks.onRight();
          break;
        case 'Enter':
        case 'NumpadEnter':
        case 'Space':
          this.callbacks.onEnter && this.callbacks.onEnter();
          break;
        case 'KeyI':
          this.callbacks.onInfo && this.callbacks.onInfo();
          break;
        case 'KeyL':
        case 'KeyC':
          this.callbacks.onList && this.callbacks.onList();
          break;
        case 'KeyG':
        case 'KeyE':
          this.callbacks.onGuide && this.callbacks.onGuide();
          break;
        case 'KeyM':
        case 'KeyO':
        case 'ContextMenu':
        case 'F10':
          this.callbacks.onMenu && this.callbacks.onMenu();
          break;
        case 'Escape':
        case 'Backspace':
          this.callbacks.onBack && this.callbacks.onBack();
          break;
      }
    });
  }
}