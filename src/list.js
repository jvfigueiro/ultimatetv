export class ChannelList {
  constructor(onSelectCallback) {
    this.el = document.getElementById('channel-list-modal');
    this.container = document.getElementById('channel-list-items');
    this.onSelect = onSelectCallback;
    this.channels = [];
    this.selectedIndex = 0;
  }

  render(channels, currentActiveIndex) {
    this.channels = channels;
    this.selectedIndex = currentActiveIndex || 0;
    this.container.innerHTML = '';

    this.channels.forEach((channel, idx) => {
      const item = document.createElement('div');
      item.className = `channel-item ${idx === this.selectedIndex ? 'active' : ''}`;
      item.tabIndex = 0; // Torna focável pelo D-Pad do controle remoto
      
      item.innerHTML = `
        <span class="ch-num">${channel.number}</span>
        ${channel.logo ? `<img src="${channel.logo}" class="ch-logo" />` : '<div class="ch-logo-placeholder">TV</div>'}
        <div class="ch-info">
          <div class="ch-name">${channel.name}</div>
          <div class="ch-prog">${channel.currentProgram}</div>
        </div>
      `;

      item.addEventListener('click', () => {
        this.selectChannel(idx);
      });

      this.container.appendChild(item);
    });
  }

  show(currentIndex) {
    this.selectedIndex = currentIndex;
    this.el.classList.remove('hidden');
    this.focusCurrent();
  }

  hide() {
    this.el.classList.add('hidden');
  }

  updatePrograms(channels) {
    this.channels = channels;
    const items = this.container.querySelectorAll('.channel-item');
    this.channels.forEach((channel, idx) => {
      if (items[idx]) {
        const progEl = items[idx].querySelector('.ch-prog');
        if (progEl && progEl.textContent !== channel.currentProgram) {
          progEl.textContent = channel.currentProgram;
        }
      }
    });
  }

  toggle(currentIndex) {
    if (this.el.classList.contains('hidden')) {
      this.show(currentIndex);
    } else {
      this.hide();
    }
  }

  focusCurrent() {
    const items = this.container.querySelectorAll('.channel-item');
    if (items[this.selectedIndex]) {
      items[this.selectedIndex].focus({ preventScroll: true });
      items[this.selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  navigate(direction) {
    if (this.el.classList.contains('hidden')) return false;

    if (direction === 'up') {
      this.selectedIndex = (this.selectedIndex - 1 + this.channels.length) % this.channels.length;
    } else if (direction === 'down') {
      this.selectedIndex = (this.selectedIndex + 1) % this.channels.length;
    }
    
    // Atualiza o visual
    const items = this.container.querySelectorAll('.channel-item');
    items.forEach((it, idx) => {
      it.classList.toggle('active', idx === this.selectedIndex);
    });
    
    this.focusCurrent();
    return true; // Indica que a lista capturou o comando do controle
  }

  selectCurrent() {
    if (this.el.classList.contains('hidden')) return false;
    this.selectChannel(this.selectedIndex);
    return true;
  }

  selectChannel(index) {
    this.selectedIndex = index;
    this.hide();
    this.onSelect(index);
  }
}