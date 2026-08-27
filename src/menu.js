export class OptionsMenu {
  constructor(callbacks) {
    this.el = document.getElementById('bottom-menu');
    this.aspectValEl = document.getElementById('bm-val-aspect');
    this.subValEl = document.getElementById('bm-val-sub');
    
    this.callbacks = callbacks;
    this.onToggleSynopsis = callbacks.onToggleSynopsis || null;
    this.items = [];
    this.selectedIndex = 0;
  }

  init() {
    if (!this.el) return;
    this.items = Array.from(this.el.querySelectorAll('.bm-item'));
    this.items.forEach((item, idx) => {
      item.addEventListener('click', () => {
        this.selectedIndex = idx;
        this.triggerCurrent();
      });
    });
  }

  updateSubtitleLabel(enabled) {
    if (this.subValEl) {
      this.subValEl.textContent = enabled ? "Legendas Ativadas" : "Legendas Desativadas";
    }
  }

  show(currentAspectLabel, subtitlesActive) {
    if (this.items.length === 0) this.init();
    if (!this.el) return;
    
    if (this.aspectValEl && currentAspectLabel) {
      this.aspectValEl.textContent = currentAspectLabel.split(' ')[0];
    }
    this.updateSubtitleLabel(subtitlesActive);
    
    this.el.classList.remove('hidden');
    this.selectedIndex = 0;
    this.focusCurrent();
  }

  hide() { if (this.el) this.el.classList.add('hidden'); }

  toggle(currentAspectLabel, subtitlesActive) {
    if (!this.el) return false;
    if (this.el.classList.contains('hidden')) {
      this.show(currentAspectLabel, subtitlesActive);
      return true;
    } else {
      this.hide();
      return false;
    }
  }

  focusCurrent() {
    if (this.items[this.selectedIndex]) {
      this.items.forEach(it => it.classList.remove('active'));
      this.items[this.selectedIndex].classList.add('active');
      this.items[this.selectedIndex].focus({ preventScroll: true });
    }
  }

  navigate(direction) {
    if (!this.el || this.el.classList.contains('hidden')) return false;

    if (direction === 'left') {
      this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
      this.focusCurrent();
    } else if (direction === 'right') {
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
      this.focusCurrent();
    } else if (direction === 'enter') {
      this.triggerCurrent();
    }
    return true;
  }

  triggerCurrent() {
    if (!this.items[this.selectedIndex]) return false;
    const action = this.items[this.selectedIndex].getAttribute('data-action');
    
    if (action === 'home') {
      this.hide();
      if (this.callbacks.onOpenHome) this.callbacks.onOpenHome();
    } else if (action === 'list') {
      this.hide();
      this.callbacks.onOpenList();
    } else if (action === 'guide') {
      this.hide();
      this.callbacks.onOpenGuide();
    } else if (action === 'aspect') {
      const newLabel = this.callbacks.onCycleAspect();
      if (this.aspectValEl) this.aspectValEl.textContent = newLabel.split(' ')[0];
    } else if (action === 'subtitle') {
      const state = this.callbacks.onToggleSubtitles();
      this.updateSubtitleLabel(state);
    } else if (action === 'audio') {
      const newLabel = this.callbacks.onCycleAudio();
      if (document.getElementById('bm-val-audio')) {
        document.getElementById('bm-val-audio').textContent = newLabel;
      }
    } else if (action === 'synopsis') {
      this.hide();
      if (this.onToggleSynopsis) this.onToggleSynopsis();
    } else if (action === 'reload') {
      this.hide();
      this.callbacks.onReload();
    }
    return true;
  }
}