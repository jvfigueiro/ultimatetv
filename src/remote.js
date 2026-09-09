export class RemoteController {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.init();
  }

  init() {
    window.addEventListener('keydown', (e) => {
      const code = e.code || '';
      const key = e.key || '';

      const isEnter = code === 'Enter' || code === 'NumpadEnter' || key === 'Enter' || code === 'Space' || key === ' ';
      const isUp = code === 'ArrowUp' || key === 'ArrowUp' || code === 'Equal' || code === 'PageUp' || key === 'PageUp';
      const isDown = code === 'ArrowDown' || key === 'ArrowDown' || code === 'Minus' || code === 'PageDown' || key === 'PageDown';
      const isLeft = code === 'ArrowLeft' || key === 'ArrowLeft';
      const isRight = code === 'ArrowRight' || key === 'ArrowRight';
      const isBack = code === 'Escape' || key === 'Escape' || code === 'Backspace' || key === 'Backspace' || key === 'GoBack';
      const isInfo = code === 'KeyI' || key === 'i' || key === 'I' || key === 'Info';
      const isList = code === 'KeyL' || key === 'l' || key === 'L' || code === 'KeyC' || key === 'c' || key === 'C' || key === 'ChannelList';
      const isGuide = code === 'KeyG' || key === 'g' || key === 'G' || code === 'KeyE' || key === 'e' || key === 'E' || key === 'Guide';
      const isMenu = code === 'KeyM' || key === 'm' || key === 'M' || code === 'KeyO' || key === 'o' || key === 'O' || code === 'ContextMenu' || key === 'ContextMenu' || code === 'F10' || key === 'F10';

      if (isUp || isDown || isLeft || isRight || isEnter) {
        e.preventDefault();
      }

      if (isUp) this.callbacks.onUp && this.callbacks.onUp();
      else if (isDown) this.callbacks.onDown && this.callbacks.onDown();
      else if (isLeft) this.callbacks.onLeft && this.callbacks.onLeft();
      else if (isRight) this.callbacks.onRight && this.callbacks.onRight();
      else if (isEnter) this.callbacks.onEnter && this.callbacks.onEnter();
      else if (isBack) this.callbacks.onBack && this.callbacks.onBack();
      else if (isInfo) this.callbacks.onInfo && this.callbacks.onInfo();
      else if (isList) this.callbacks.onList && this.callbacks.onList();
      else if (isGuide) this.callbacks.onGuide && this.callbacks.onGuide();
      else if (isMenu) this.callbacks.onMenu && this.callbacks.onMenu();
    }, { capture: true });
  }
}