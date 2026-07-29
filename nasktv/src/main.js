import { TVPlayer } from './player.js';
import { OSD } from './osd.js';
import { RemoteController } from './remote.js';
import { DispatcharrAPI } from './api.js';
import { ChannelList } from './list.js';
import { EPGGuide } from './guide.js';
import { OptionsMenu } from './menu.js';

class UltimateTV {
  constructor() {
    this.player = new TVPlayer('tv-screen', () => {
      if (!document.getElementById('osd').classList.contains('hidden')) {
        this.osd.updateBadges(this.player);
      }
    });
    this.osd = new OSD();
    this.api = new DispatcharrAPI();
    this.channels = [];
    
    this.list = new ChannelList((idx) => this.tuneChannel(idx));
    this.guide = new EPGGuide((idx) => {
      this.tuneChannel(idx);
      this.guide.hide();
    });
    
    this.menu = new OptionsMenu({
      onOpenHome: () => this.showHomeScreen(),
      onCycleAspect: () => this.cycleAspectMode(),
      onToggleSubtitles: () => this.player.toggleSubtitles(),
      onOpenGuide: () => this.guide.show(),
      onOpenList: () => this.list.show(this.currentIndex),
      onReload: () => window.location.reload()
    });
    
    this.splashEl = document.getElementById('splash-screen');
    this.splashStatusEl = document.getElementById('splash-status');
    this.homeEl = document.getElementById('home-screen');
    this.sysModalEl = document.getElementById('sys-info-modal');
    this.aspectToastEl = document.getElementById('aspect-toast');
    this.aspectLabelEl = document.getElementById('aspect-mode-label');
    this.toastTimer = null;

    this.inHomeScreen = true;
    this.homeSelectedIndex = 0;
    this.homeItems = [];

    this.aspectModes = [
      { class: 'aspect-fill', label: 'Esticar (16:9)' },
      { class: 'aspect-contain', label: 'Original (Ajustar)' },
      { class: 'aspect-cover', label: 'Zoom (Cortar Bordas)' },
      { class: 'aspect-stretch-h', label: 'Super Zoom 4:3' }
    ];
    this.currentAspectIdx = 0;
    
    const savedIndex = localStorage.getItem('ultimatetv_last_channel');
    this.currentIndex = savedIndex !== null ? parseInt(savedIndex, 10) : 0;
    this.previousIndex = null;

    this.init();
  }

  async init() {
    console.log("[UltimateTV] Iniciando Sistema...");
    this.splashStatusEl.textContent = "Baixando listas do Servidor...";

    this.channels = await this.api.loadAllData();
    this.guide.render(this.channels, this.api.rawXmlDoc);

    if (this.channels.length === 0) {
      this.splashStatusEl.textContent = "Erro: Servidor indisponível.";
      this.splashStatusEl.style.color = "#ef4444";
      return;
    }

    this.splashStatusEl.textContent = `Carregando portal...`;
    this.list.render(this.channels, this.currentIndex);

    // Conecta os botões do Modal de Opções do Sistema
    document.getElementById('btn-sys-reload')?.addEventListener('click', () => window.location.reload());
    document.getElementById('btn-sys-home')?.addEventListener('click', () => {
      this.sysModalEl.classList.add('hidden');
      this.showHomeScreen();
    });

    new RemoteController({
      onUp: () => {
        if (this.inHomeScreen) { this.navigateHome('up'); return; }
        if (this.guide.isOpen) { this.guide.navigate('up'); return; }
        if (!document.getElementById('bottom-menu').classList.contains('hidden')) { this.menu.hide(); }
        if (!this.list.navigate('up')) this.channelUp();
      },
      onDown: () => {
        if (this.inHomeScreen) { this.navigateHome('down'); return; }
        if (this.guide.isOpen) { this.guide.navigate('down'); return; }
        if (!document.getElementById('bottom-menu').classList.contains('hidden')) { this.menu.hide(); }
        if (!this.list.navigate('down')) this.channelDown();
      },
      onLeft: () => {
        if (this.inHomeScreen) { this.navigateHome('left'); return; }
        if (this.guide.isOpen) { this.guide.navigate('left'); return; }
        if (this.menu.navigate('left')) return;
        this.list.toggle(this.currentIndex);
      },
      onRight: () => {
        if (this.inHomeScreen) { this.navigateHome('right'); return; }
        if (this.guide.isOpen) { this.guide.navigate('right'); return; }
        if (this.menu.navigate('right')) return;
        this.tuneLastChannel();
      },
      onEnter: () => {
        if (this.inHomeScreen) { this.selectHomeItem(); return; }
        if (this.guide.isOpen) { this.guide.selectCurrent(); return; }
        if (!document.getElementById('bottom-menu').classList.contains('hidden')) { this.menu.triggerCurrent(); return; }
        if (this.list.selectCurrent()) return;

        this.openFullOSDWithMenu();
      },
      onInfo: () => {
        if (this.inHomeScreen) return;
        this.osd.show(this.getCurrentChannel(), this.player);
      },
      onList: () => {
        if (this.inHomeScreen) { this.exitHomeScreen(this.currentIndex); return; }
        this.list.toggle(this.currentIndex);
      },
      onGuide: () => {
        if (this.inHomeScreen) { 
          this.inHomeScreen = false;
          this.homeEl.classList.add('hidden');
          this.guide.show(); 
          return; 
        }
        this.guide.toggle();
      },
      onMenu: () => {
        if (this.inHomeScreen) return;
        this.openFullOSDWithMenu();
      },
      onBack: () => {
        const sysOpen = !this.sysModalEl.classList.contains('hidden');
        if (sysOpen) { this.sysModalEl.classList.add('hidden'); return; }

        const listOpen = !document.getElementById('channel-list-modal').classList.contains('hidden');
        const guideOpen = this.guide.isOpen;
        const menuOpen = !document.getElementById('bottom-menu').classList.contains('hidden');
        const osdOpen = !document.getElementById('osd').classList.contains('hidden');

        if (listOpen || guideOpen || menuOpen || osdOpen) {
          this.menu.hide();
          this.list.hide();
          this.guide.hide();
          this.osd.hide();
        } else if (!this.inHomeScreen) {
          this.showHomeScreen();
        }
      }
    });

    setTimeout(() => {
      this.splashEl.classList.add('hidden');
      this.showHomeScreen();
    }, 1200);
  }

  // --- LÓGICA DO PORTAL DIRECTV GO ---
  showHomeScreen() {
    console.log("🏠 [UltimateTV] Abrindo Portal DirecTV Go...");
    this.inHomeScreen = true;
    this.player.stop();
    this.osd.hide();
    this.menu.hide();
    this.sysModalEl.classList.add('hidden');
    
    // Sorteia 5 canais aleatórios em destaque na grade horizontal
    const grid = document.getElementById('featured-channels-grid');
    if (grid) {
      grid.innerHTML = '';
      const shuffled = [...this.channels].sort(() => 0.5 - Math.random()).slice(0, 5);
      shuffled.forEach((ch) => {
        const idx = this.channels.indexOf(ch);
        const card = document.createElement('div');
        card.className = 'feat-card';
        card.tabIndex = 0;
        card.setAttribute('data-action', 'tune');
        card.setAttribute('data-ch-idx', idx);
        const logoHtml = ch.logo ? `<img src="${ch.logo}" class="feat-logo"/>` : `<div style="font-size:1.8rem;margin-bottom:8px;">📺</div>`;
        card.innerHTML = `${logoHtml}<span class="feat-name">${ch.number} • ${ch.name}</span>`;
        card.addEventListener('click', () => this.tuneChannel(idx));
        grid.appendChild(card);
      });
    }

    this.homeEl.classList.remove('hidden');
    this.initHomeNavigation();
  }

  exitHomeScreen(targetIndex) {
    this.inHomeScreen = false;
    this.homeEl.classList.add('hidden');
    this.tuneChannel(targetIndex !== undefined ? targetIndex : this.currentIndex);
  }

  initHomeNavigation() {
    const navItems = Array.from(this.homeEl.querySelectorAll('.dtv-nav-item'));
    const featItems = Array.from(this.homeEl.querySelectorAll('.feat-card'));
    this.homeItems = [...navItems, ...featItems];
    this.homeSelectedIndex = 0;
    this.updateHomeFocus();

    this.homeItems.forEach((item, idx) => {
      item.addEventListener('click', () => {
        this.homeSelectedIndex = idx;
        this.selectHomeItem();
      });
    });
  }

  updateHomeFocus() {
    this.homeItems.forEach((it, idx) => {
      it.classList.toggle('active', idx === this.homeSelectedIndex);
      if (idx === this.homeSelectedIndex) it.focus();
    });
  }

  navigateHome(dir) {
    const isSidebar = this.homeSelectedIndex < 4;
    const total = this.homeItems.length;

    if (dir === 'up') {
      if (isSidebar) this.homeSelectedIndex = (this.homeSelectedIndex - 1 + 4) % 4;
      else this.homeSelectedIndex = 0;
    } else if (dir === 'down') {
      if (isSidebar) {
        if (this.homeSelectedIndex < 3) this.homeSelectedIndex++;
        else if (total > 4) this.homeSelectedIndex = 4;
      }
    } else if (dir === 'right') {
      if (isSidebar && total > 4) this.homeSelectedIndex = 4;
      else if (!isSidebar) this.homeSelectedIndex = Math.min(total - 1, this.homeSelectedIndex + 1);
    } else if (dir === 'left') {
      if (!isSidebar) {
        if (this.homeSelectedIndex === 4) this.homeSelectedIndex = 0;
        else this.homeSelectedIndex--;
      }
    }
    this.updateHomeFocus();
  }

  selectHomeItem() {
    const item = this.homeItems[this.homeSelectedIndex];
    if (!item) return;
    const action = item.getAttribute('data-action');

    if (action === 'watch') {
      this.exitHomeScreen(0);
    } else if (action === 'guide') {
      this.inHomeScreen = false;
      this.homeEl.classList.add('hidden');
      this.guide.show();
    } else if (action === 'last') {
      this.inHomeScreen = false;
      this.homeEl.classList.add('hidden');
      if (this.previousIndex !== null) this.tuneChannel(this.previousIndex);
      else this.tuneChannel(this.currentIndex);
    } else if (action === 'sysinfo') {
      this.showSysInfoModal();
    } else if (action === 'tune') {
      const idx = parseInt(item.getAttribute('data-ch-idx'), 10);
      this.exitHomeScreen(idx);
    }
  }

  showSysInfoModal() {
    document.getElementById('sys-res-val').textContent = `${window.innerWidth} x ${window.innerHeight} (${this.player.getDetectedResolution()})`;
    document.getElementById('sys-ua-val').textContent = navigator.userAgent;
    this.sysModalEl.classList.remove('hidden');
  }

  openFullOSDWithMenu() {
    this.osd.show(this.getCurrentChannel(), this.player);
    const currentModeLabel = this.aspectModes[this.currentAspectIdx].label;
    this.menu.show(currentModeLabel, this.player.subtitlesActive);
  }

  cycleAspectMode() {
    this.currentAspectIdx = (this.currentAspectIdx + 1) % this.aspectModes.length;
    const mode = this.aspectModes[this.currentAspectIdx];
    this.player.setAspectMode(mode.class);
    this.showAspectToast(mode.label);
    return mode.label;
  }

  showAspectToast(label) {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.aspectLabelEl.textContent = label;
    this.aspectToastEl.classList.remove('hidden');
    this.toastTimer = setTimeout(() => this.aspectToastEl.classList.add('hidden'), 3000);
  }

  getCurrentChannel() { return this.channels[this.currentIndex] || {}; }

  tuneChannel(index) {
    if (index >= this.channels.length) index = 0;
    if (index < 0) index = this.channels.length - 1;

    if (this.currentIndex !== index) {
      this.previousIndex = this.currentIndex;
    }

    this.currentIndex = index;
    const channel = this.getCurrentChannel();
    localStorage.setItem('ultimatetv_last_channel', this.currentIndex);
    
    this.menu.hide();
    this.player.loadChannel(channel.url);
    this.osd.show(channel, this.player);
    this.list.render(this.channels, this.currentIndex);
  }

  tuneLastChannel() {
    if (this.previousIndex !== null && this.previousIndex !== this.currentIndex) {
      console.log(`[UltimateTV Zapping] Botão Last: Voltando para o canal ${this.previousIndex}`);
      this.tuneChannel(this.previousIndex);
    }
  }

  channelUp() { this.tuneChannel(this.currentIndex + 1); }
  channelDown() { this.tuneChannel(this.currentIndex - 1); }
}

window.addEventListener('DOMContentLoaded', () => { window.app = new UltimateTV(); });