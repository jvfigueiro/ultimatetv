import { TVPlayer } from './player.js';
import { OSD } from './osd.js';
import { RemoteController } from './remote.js';
import { DispatcharrAPI } from './api.js';
import { ChannelList } from './list.js';
import { EPGGuide } from './guide.js';
import { OptionsMenu } from './menu.js';
import { App } from '@capacitor/app';

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
      onOpenGuide: () => this.guide.show(this.currentIndex),
      onOpenList: () => this.list.show(this.currentIndex),
      onToggleSynopsis: () => {
        this.osd.expandSynopsis();
      },
      onReload: () => window.location.reload()
    });
    
    this.splashEl = document.getElementById('splash-screen');
    this.homeEl = document.getElementById('home-screen');
    this.sysModalEl = document.getElementById('sys-info-modal');
    this.aspectToastEl = document.getElementById('aspect-toast');
    this.aspectLabelEl = document.getElementById('aspect-mode-label');
    this.toastTimer = null;
    this.osdTimer = null;

    this.inHomeScreen = true;
    this.homeSelectedRow = 0; // 0 = sidebar, 1 = recent, 2..N = categorias
    this.homeSelectedCol = 0; 
    this.homeMatrix = []; // array 2D de elementos HTML focaveis
    
    // Historico de até 4 ultimos canais assistidos
    const savedHistory = localStorage.getItem('ultimatetv_history');
    this.historyIndices = savedHistory ? JSON.parse(savedHistory) : [];

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
    
    App.addListener('backButton', () => {
      this.handleBackAction();
    });
  }

  async init() {
    console.log("[UltimateTV] Iniciando Sistema...");

    this.channels = await this.api.loadAllData();
    this.guide.render(this.channels, this.api.rawXmlDoc);

    if (this.channels.length === 0) {
      console.error("[UltimateTV] Erro: Servidor indisponível.");
      return;
    }

    this.list.render(this.channels, this.currentIndex);

    document.getElementById('btn-sys-reload')?.addEventListener('click', () => window.location.reload());
    document.getElementById('btn-sys-home')?.addEventListener('click', () => {
      this.sysModalEl.classList.add('hidden');
      this.showHomeScreen();
    });

    document.getElementById('tv-screen').addEventListener('click', () => {
      if (this.inHomeScreen) return;
      
      const menuEl = document.getElementById('bottom-menu');
      const isMenuOpen = menuEl && !menuEl.classList.contains('hidden');
      
      if (isMenuOpen) {
        this.menu.hide();
        this.osd.hide();
        if (this.osdTimer) clearTimeout(this.osdTimer);
      } else {
        this.openFullOSDWithMenu();
      }
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
        if (this.menu.navigate('left')) { this.resetOSDTimer(); return; }
        this.list.toggle(this.currentIndex);
      },
      onRight: () => {
        if (this.inHomeScreen) { this.navigateHome('right'); return; }
        if (this.guide.isOpen) { this.guide.navigate('right'); return; }
        if (this.menu.navigate('right')) { this.resetOSDTimer(); return; }
        this.tuneLastChannel();
      },
      onEnter: () => {
        if (this.inHomeScreen) { this.selectHomeItem(); return; }
        if (this.guide.isOpen) { this.guide.selectCurrent(); return; }
        if (!document.getElementById('bottom-menu').classList.contains('hidden')) { 
          this.menu.triggerCurrent(); 
          this.resetOSDTimer(); 
          return; 
        }
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
          this.guide.show(this.currentIndex); 
          return; 
        }
        this.guide.toggle(this.currentIndex);
      },
      onMenu: () => {
        if (this.inHomeScreen) return;
        this.openFullOSDWithMenu();
      },
      onBack: () => {
        this.handleBackAction();
      }
    });

    this.startGlobalClock();

    setTimeout(() => {
      this.splashEl.classList.add('hidden');
      this.showHomeScreen();
    }, 1200);
  }

  startGlobalClock() {
    setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('pt-BR', { 
        weekday: 'short', 
        day: '2-digit', 
        month: '2-digit' 
      }).replace('.', '');

      document.querySelectorAll('.sys-time').forEach(el => el.textContent = timeStr);
      document.querySelectorAll('.sys-date').forEach(el => el.textContent = dateStr);
    }, 1000);
  }

  handleBackAction() {
    const sysOpen = this.sysModalEl && !this.sysModalEl.classList.contains('hidden');
    if (sysOpen) { this.sysModalEl.classList.add('hidden'); return; }

    if (this.osd && this.osd.isExpanded()) {
      this.osd.collapseSynopsis();
      return;
    }

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
    } else {
      try {
        App.exitApp();
      } catch (e) {
        console.error("Capacitor App.exitApp error", e);
      }
    }
  }

  showHomeScreen() {
    console.log("🏠 [UltimateTV] Abrindo Portal...");
    this.inHomeScreen = true;
    this.player.stop();
    this.osd.hide();
    this.list.hide();
    this.guide.hide();
    this.menu.hide();
    this.homeEl.classList.remove('hidden');
    if (this.sysModalEl) this.sysModalEl.classList.add('hidden');
    
    const container = document.getElementById('home-categories-container');
    if (!container) return;
    
    container.innerHTML = '';
    this.homeMatrix = []; // Reinicia a matriz
    
    const sidebarItems = Array.from(this.homeEl.querySelectorAll('.dtv-nav-item'));
    this.homeMatrix.push(sidebarItems); // ROW 0 = Sidebar (Vertical)
    
    let currentRowIdx = 1;

    // Função auxiliar para injetar uma estante
    const renderShelf = (title, channelsArray) => {
      if (channelsArray.length === 0) return;
      
      const section = document.createElement('div');
      section.className = 'dtv-row-section';
      section.innerHTML = `<h3>${title}</h3><div class="dtv-grid"></div>`;
      const grid = section.querySelector('.dtv-grid');
      
      const rowElements = [];
      const limited = channelsArray.slice(0, 15); // Limita em 15
      
      limited.forEach((ch) => {
        const globalIdx = this.channels.indexOf(ch);
        const card = document.createElement('div');
        card.className = 'feat-card';
        card.tabIndex = 0;
        card.setAttribute('data-action', 'tune');
        card.setAttribute('data-ch-idx', globalIdx);
        const logoHtml = ch.logo ? `<img src="${ch.logo}" class="feat-logo"/>` : `<div style="font-size:1.8rem;margin-bottom:8px;">📺</div>`;
        card.innerHTML = `${logoHtml}<span class="feat-name">${ch.number} • ${ch.name}</span>`;
        card.addEventListener('click', () => this.tuneChannel(globalIdx));
        grid.appendChild(card);
        rowElements.push(card);
      });
      
      container.appendChild(section);
      this.homeMatrix.push(rowElements);
      currentRowIdx++;
    };

    // 1. Últimos Vistos
    const recentChannels = this.historyIndices.map(idx => this.channels[idx]).filter(Boolean);
    if (recentChannels.length > 0) {
      renderShelf('🕒 Últimos Vistos', recentChannels);
    }

    // 2. Agrupar por Categorias Dinâmicas do M3U
    const groups = {};
    this.channels.forEach(ch => {
      const g = ch.group || 'Outros';
      if (!groups[g]) groups[g] = [];
      groups[g].push(ch);
    });

    // 3. Renderizar cada Categoria
    Object.keys(groups).sort().forEach(groupName => {
      const shuffled = [...groups[groupName]].sort(() => 0.5 - Math.random());
      renderShelf(`📌 ${groupName}`, shuffled);
    });

    // Adiciona evento de clique na Sidebar
    sidebarItems.forEach((item) => {
      item.onclick = () => {
        const action = item.getAttribute('data-action');
        if (action === 'watch') {
          this.exitHomeScreen(this.currentIndex);
        } else if (action === 'last') {
          this.exitHomeScreen(localStorage.getItem('ultimatetv_last_channel') || 0);
        } else if (action === 'guide') {
          this.inHomeScreen = false;
          this.homeEl.classList.add('hidden');
          this.guide.show(this.currentIndex);
        } else if (action === 'reload') {
          window.location.reload();
        }
      };
    });

    this.homeSelectedRow = 0;
    this.homeSelectedCol = 0;
    this.updateHomeFocus();
  }

  updateHomeFocus() {
    // Remove focus de todos
    this.homeMatrix.forEach(row => {
      row.forEach(el => el.classList.remove('active', 'focused'));
    });
    
    // Aplica no alvo
    const targetRow = this.homeMatrix[this.homeSelectedRow];
    if (targetRow && targetRow[this.homeSelectedCol]) {
      const el = targetRow[this.homeSelectedCol];
      el.focus();
      // Se for a sidebar, usamos a classe 'active'
      if (this.homeSelectedRow === 0) {
        el.classList.add('active');
      } else {
        // Garantir que o card fique visível na tela sem rolar a página inteira
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }

  navigateHome(dir) {
    if (this.homeMatrix.length === 0) return;

    const isSidebar = (this.homeSelectedRow === 0);
    const maxRows = this.homeMatrix.length;

    if (dir === 'up') {
      if (isSidebar) {
        if (this.homeSelectedCol > 0) this.homeSelectedCol--;
      } else {
        if (this.homeSelectedRow > 1) {
           this.homeSelectedRow--;
           if (this.homeSelectedCol >= this.homeMatrix[this.homeSelectedRow].length) {
              this.homeSelectedCol = this.homeMatrix[this.homeSelectedRow].length - 1;
           }
        } else {
           this.homeSelectedRow = 0;
           this.homeSelectedCol = 0;
        }
      }
    } else if (dir === 'down') {
      if (isSidebar) {
        if (this.homeSelectedCol < this.homeMatrix[0].length - 1) this.homeSelectedCol++;
      } else {
        if (this.homeSelectedRow < maxRows - 1) {
           this.homeSelectedRow++;
           if (this.homeSelectedCol >= this.homeMatrix[this.homeSelectedRow].length) {
              this.homeSelectedCol = this.homeMatrix[this.homeSelectedRow].length - 1;
           }
        }
      }
    } else if (dir === 'right') {
      if (isSidebar) {
        if (maxRows > 1) {
           this.homeSelectedRow = 1;
           this.homeSelectedCol = 0;
        }
      } else {
        if (this.homeSelectedCol < this.homeMatrix[this.homeSelectedRow].length - 1) {
           this.homeSelectedCol++;
        }
      }
    } else if (dir === 'left') {
      if (!isSidebar) {
        if (this.homeSelectedCol > 0) {
           this.homeSelectedCol--;
        } else {
           this.homeSelectedRow = 0;
           this.homeSelectedCol = 0;
        }
      }
    }
    this.updateHomeFocus();
  }

  exitHomeScreen(targetIndex) {
    this.inHomeScreen = false;
    this.homeEl.classList.add('hidden');
    this.tuneChannel(targetIndex !== undefined ? targetIndex : this.currentIndex);
  }

  selectHomeItem() {
    const targetRow = this.homeMatrix[this.homeSelectedRow];
    const item = targetRow ? targetRow[this.homeSelectedCol] : null;
    if (!item) return;

    const action = item.getAttribute('data-action');

    if (action === 'watch') {
      this.exitHomeScreen(this.currentIndex);
    } else if (action === 'guide') {
      this.inHomeScreen = false;
      this.homeEl.classList.add('hidden');
      this.guide.show(this.currentIndex);
    } else if (action === 'last') {
      this.inHomeScreen = false;
      this.homeEl.classList.add('hidden');
      if (this.previousIndex !== null) this.tuneChannel(this.previousIndex);
      else this.tuneChannel(this.currentIndex);
    } else if (action === 'sysinfo') {
      this.showSysInfoModal();
    } else if (action === 'reload') {
      window.location.reload();
    } else if (action === 'tune') {
      const idx = parseInt(item.getAttribute('data-ch-idx'), 10);
      this.exitHomeScreen(idx);
    }
  }

  showSysInfoModal() {
    if (document.getElementById('sys-res-val')) document.getElementById('sys-res-val').textContent = `${window.innerWidth} x ${window.innerHeight} (${this.player.getDetectedResolution()})`;
    if (document.getElementById('sys-ua-val')) document.getElementById('sys-ua-val').textContent = navigator.userAgent;
    if (this.sysModalEl) this.sysModalEl.classList.remove('hidden');
  }

  openFullOSDWithMenu() {
    this.osd.show(this.getCurrentChannel(), this.player);
    const currentModeLabel = this.aspectModes[this.currentAspectIdx].label;
    this.menu.show(currentModeLabel, this.player.subtitlesActive);
    
    this.resetOSDTimer();
  }

  resetOSDTimer() {
    if (this.osdTimer) clearTimeout(this.osdTimer);
    
    this.osdTimer = setTimeout(() => {
      const menuEl = document.getElementById('bottom-menu');
      if (menuEl && !menuEl.classList.contains('hidden')) {
        this.menu.hide();
        this.osd.hide();
      } else {
        this.osd.hide();
      }
    }, 12000);
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
    
    // Atualizar Array de historico circular de ate 4 canais
    this.historyIndices = this.historyIndices.filter(i => i !== index);
    this.historyIndices.unshift(index);
    if (this.historyIndices.length > 4) this.historyIndices.pop();
    localStorage.setItem('ultimatetv_history', JSON.stringify(this.historyIndices));

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