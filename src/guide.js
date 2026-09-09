export class EPGGuide {
  constructor(onSelectCallback, api = null) {
    this.el = document.getElementById('guide-modal');
    this.container = document.getElementById('guide-content-matrix');
    
    // Top showcase card elements
    this.logoEl = document.getElementById('guide-ch-logo');
    this.numEl = document.getElementById('guide-ch-number');
    this.nameEl = document.getElementById('guide-ch-name');
    this.tagEl = document.getElementById('guide-ch-tag');
    this.titleEl = document.getElementById('guide-prog-title');
    this.timeEl = document.getElementById('guide-prog-time');
    this.descEl = document.getElementById('guide-prog-synopsis');

    // Fallback gracioso para erro de carregamento da logo
    if (this.logoEl) {
      this.logoEl.onerror = () => {
        this.logoEl.style.display = 'none';
      };
    }

    this.onSelect = onSelectCallback;
    this.api = api;
    this.epgData = api ? api.epgData : null;
    this.channels = [];
    this.xmlDoc = null;
    this.isOpen = false;

    this.selectedRow = 0;
    this.selectedCol = 0;
    this.timeSlots = [];
    this.matrixData = {};
  }

  render(channels, epgSource) {
    this.channels = channels || [];
    if (epgSource) {
      if (epgSource.epgData) {
        this.epgData = epgSource.epgData;
      } else if (epgSource.querySelectorAll) {
        this.xmlDoc = epgSource;
      } else {
        this.epgData = epgSource;
      }
    } else if (this.api && this.api.epgData) {
      this.epgData = this.api.epgData;
    }
    this.generateTimeSlots();
  }

  generateTimeSlots() {
    this.timeSlots = [];
    const now = new Date();
    now.setMinutes(now.getMinutes() < 30 ? 0 : 30, 0, 0);

    for (let i = 0; i < 6; i++) {
      this.timeSlots.push(new Date(now.getTime() + i * 30 * 60000));
    }
  }

  renderMatrix() {
    if (!this.container || !this.channels || this.channels.length === 0) return;
    this.container.innerHTML = '';

    const headerRow = document.createElement('div');
    headerRow.className = 'guide-header-row';
    headerRow.innerHTML = `<div class="guide-col-channel-header">Canais</div>`;
    
    this.timeSlots.forEach(slot => {
      const hh = slot.getHours().toString().padStart(2, '0');
      const mm = slot.getMinutes().toString().padStart(2, '0');
      const th = document.createElement('div');
      th.className = 'guide-col-time-header';
      th.textContent = `${hh}:${mm}`;
      headerRow.appendChild(th);
    });
    this.container.appendChild(headerRow);

    this.matrixData = {};

    this.channels.forEach((channel, cIdx) => {
      this.matrixData[cIdx] = {};
      const row = document.createElement('div');
      row.className = 'guide-matrix-row';

      const chCol = document.createElement('div');
      chCol.className = 'guide-cell-channel';
      const chLogo = channel.logo ? `<img src="${channel.logo}" class="g-logo" />` : '';
      chCol.innerHTML = `<span class="g-num">${channel.number || '--'}</span>${chLogo}<span class="g-name">${channel.name || 'Canal'}</span>`;
      row.appendChild(chCol);

      const targetId = channel.epgId || channel.id || '';
      const epgStore = this.epgData || (this.api && this.api.epgData) || null;
      let programmes = [];
      if (epgStore) {
        programmes = epgStore[targetId] || (channel.epgId && epgStore[channel.epgId]) || (channel.id && epgStore[channel.id]) || [];
      } else if (this.xmlDoc) {
        programmes = Array.from(this.xmlDoc.querySelectorAll(`programme[channel="${targetId}"]`));
      }

      this.timeSlots.forEach((slot, sIdx) => {
        const slotEnd = new Date(slot.getTime() + 30 * 60000);
        let matchedProg = null;

        for (let p = 0; p < programmes.length; p++) {
          const prog = programmes[p];
          const pStart = prog.start instanceof Date ? prog.start : (prog.getAttribute ? this.parseXMLTVDate(prog.getAttribute('start')) : null);
          const pEnd = (prog.stop instanceof Date ? prog.stop : (prog.end instanceof Date ? prog.end : (prog.getAttribute ? this.parseXMLTVDate(prog.getAttribute('stop')) : null)));
          if (pStart && pEnd && pStart < slotEnd && pEnd > slot) {
            matchedProg = prog;
            break;
          }
        }

        this.matrixData[cIdx][sIdx] = matchedProg;

        const cell = document.createElement('div');
        const isFocused = (cIdx === this.selectedRow && sIdx === this.selectedCol);
        cell.className = `guide-cell-prog ${isFocused ? 'focused' : ''}`;
        cell.setAttribute('data-row', cIdx);
        cell.setAttribute('data-col', sIdx);

        if (matchedProg) {
          const title = matchedProg.title || (matchedProg.querySelector ? matchedProg.querySelector('title')?.textContent : null);
          cell.textContent = title || "Sem Título";
        } else {
          cell.textContent = sIdx === 0 ? (channel.currentProgram || "---") : "---";
        }

        cell.addEventListener('click', () => {
          this.selectedRow = cIdx;
          this.selectedCol = sIdx;
          this.updateFocus();
          this.onSelect(cIdx);
          this.hide();
        });

        row.appendChild(cell);
      });

      this.container.appendChild(row);
    });

    this.updateSynopsis();
  }

  parseXMLTVDate(dateStr) {
    if (!dateStr) return new Date();
    const clean = dateStr.trim();
    const y = clean.substring(0, 4), m = clean.substring(4, 6), d = clean.substring(6, 8);
    const h = clean.substring(8, 10), min = clean.substring(10, 12), s = clean.substring(12, 14) || '00';
    let iso = `${y}-${m}-${d}T${h}:${min}:${s}`;
    const tzMatch = clean.match(/([+-]\d{2})(\d{2})$/);
    iso += tzMatch ? `${tzMatch[1]}:${tzMatch[2]}` : '-03:00';
    return new Date(iso);
  }

  updateSynopsis() {
    const channel = this.channels[this.selectedRow] || {};
    let prog = null;
    if (this.matrixData[this.selectedRow]) {
      prog = this.matrixData[this.selectedRow][this.selectedCol];
    }

    // 1. Canal: Logo, Número, Nome e Categoria
    if (this.logoEl) {
      if (channel.logo) {
        this.logoEl.src = channel.logo;
        this.logoEl.style.display = 'block';
      } else {
        this.logoEl.style.display = 'none';
      }
    }
    if (this.numEl) this.numEl.textContent = channel.number || '--';
    if (this.nameEl) this.nameEl.textContent = channel.name || 'Canal';
    if (this.tagEl) this.tagEl.textContent = channel.group || channel.category || 'TV';

    // 2, 3, 4. Programa: Título, Horário e Sinopse
    const fmt = (d) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

    if (prog) {
      const title = prog.title || (prog.querySelector ? prog.querySelector('title')?.textContent : null) || "Programa Sem Título";
      const desc = prog.desc || (prog.querySelector ? prog.querySelector('desc')?.textContent : null) || "Sem descrição disponível para este programa.";
      const start = prog.start instanceof Date ? prog.start : (prog.getAttribute ? this.parseXMLTVDate(prog.getAttribute('start')) : new Date());
      const end = (prog.stop instanceof Date ? prog.stop : (prog.end instanceof Date ? prog.end : (prog.getAttribute ? this.parseXMLTVDate(prog.getAttribute('stop')) : new Date())));

      if (this.titleEl) this.titleEl.textContent = title;
      if (this.timeEl) this.timeEl.textContent = `${fmt(start)} - ${fmt(end)}`;
      if (this.descEl) this.descEl.textContent = desc;
    } else {
      if (this.selectedCol === 0 && channel.currentProgram && channel.currentProgram !== "Sem informações do programa") {
        if (this.titleEl) this.titleEl.textContent = channel.currentProgram;
        if (this.timeEl) this.timeEl.textContent = (channel.start && channel.end) ? `${channel.start} - ${channel.end}` : '--:--';
        if (this.descEl) this.descEl.textContent = channel.synopsis || "Informações indisponíveis para este horário.";
      } else if (this.timeSlots[this.selectedCol]) {
        const slotStart = this.timeSlots[this.selectedCol];
        const slotEnd = new Date(slotStart.getTime() + 30 * 60000);
        if (this.titleEl) this.titleEl.textContent = "Sem Programação";
        if (this.timeEl) this.timeEl.textContent = `${fmt(slotStart)} - ${fmt(slotEnd)}`;
        if (this.descEl) this.descEl.textContent = "Não há informações de programação disponíveis para este horário.";
      } else {
        if (this.titleEl) this.titleEl.textContent = "Sem Programação";
        if (this.timeEl) this.timeEl.textContent = "--:-- - --:--";
        if (this.descEl) this.descEl.textContent = "Informações indisponíveis para este horário.";
      }
    }
  }

  updateFocus() {
    if (!this.container) return;
    const cells = this.container.querySelectorAll('.guide-cell-prog');
    cells.forEach(c => {
      const r = parseInt(c.getAttribute('data-row'), 10);
      const col = parseInt(c.getAttribute('data-col'), 10);
      const isMatch = (r === this.selectedRow && col === this.selectedCol);
      c.classList.toggle('focused', isMatch);
      if (isMatch) c.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    this.updateSynopsis();
  }

  navigate(dir) {
    if (!this.isOpen || !this.channels || this.channels.length === 0) return false;
    if (dir === 'up') this.selectedRow = (this.selectedRow - 1 + this.channels.length) % this.channels.length;
    else if (dir === 'down') this.selectedRow = (this.selectedRow + 1) % this.channels.length;
    else if (dir === 'left') this.selectedCol = Math.max(0, this.selectedCol - 1);
    else if (dir === 'right') this.selectedCol = Math.min(this.timeSlots.length - 1, this.selectedCol + 1);
    
    this.updateFocus();
    return true;
  }

  selectCurrent() {
    if (!this.isOpen) return false;
    this.onSelect(this.selectedRow);
    this.hide();
    return true;
  }

  show(currentIndex) {
    if (!this.el) return;
    this.isOpen = true;
    this.el.classList.remove('hidden');
    
    if (currentIndex !== undefined && currentIndex >= 0 && currentIndex < this.channels.length) {
      this.selectedRow = currentIndex;
    }
    this.selectedCol = 0;
    
    this.generateTimeSlots();
    this.renderMatrix();
    
    // Rola para a linha atual
    setTimeout(() => {
      this.updateFocus();
    }, 50);
  }

  hide() {
    if (!this.el) return;
    this.isOpen = false;
    this.el.classList.add('hidden');
  }

  toggle(currentIndex) { if (this.isOpen) this.hide(); else this.show(currentIndex); }
}