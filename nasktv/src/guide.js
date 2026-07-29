export class EPGGuide {
  constructor(onSelectCallback) {
    this.el = document.getElementById('guide-modal');
    this.container = document.getElementById('guide-content-matrix');
    this.synopsisTitleEl = document.getElementById('guide-synopsis-title');
    this.synopsisTimeEl = document.getElementById('guide-synopsis-time');
    this.synopsisDescEl = document.getElementById('guide-synopsis-desc');
    this.clockEl = document.getElementById('guide-clock');
    this.dateEl = document.getElementById('guide-date');

    this.onSelect = onSelectCallback;
    this.channels = [];
    this.xmlDoc = null;
    this.isOpen = false;

    this.selectedRow = 0;
    this.selectedCol = 0;
    this.timeSlots = [];
    this.matrixData = {};
    this.clockInterval = null;
  }

  render(channels, xmlDoc) {
    this.channels = channels || [];
    if (xmlDoc) this.xmlDoc = xmlDoc;
    this.generateTimeSlots();
  }

  generateTimeSlots() {
    this.timeSlots = [];
    const now = new Date();
    now.setMinutes(now.getMinutes() < 30 ? 0 : 30, 0, 0);

    // 6 colunas = 3 horas à frente
    for (let i = 0; i < 6; i++) {
      this.timeSlots.push(new Date(now.getTime() + i * 30 * 60000));
    }
  }

  renderMatrix() {
    if (!this.container || !this.channels || this.channels.length === 0) return;
    this.container.innerHTML = '';

    // Cabeçalho de Horários
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
      const programmes = this.xmlDoc ? Array.from(this.xmlDoc.querySelectorAll(`programme[channel="${targetId}"]`)) : [];

      this.timeSlots.forEach((slot, sIdx) => {
        const slotEnd = new Date(slot.getTime() + 30 * 60000);
        let matchedProg = null;

        // Busca programa que cruza com o bloco temporal
        for (let p = 0; p < programmes.length; p++) {
          const prog = programmes[p];
          const pStart = this.parseXMLTVDate(prog.getAttribute('start'));
          const pEnd = this.parseXMLTVDate(prog.getAttribute('stop'));
          if (pStart < slotEnd && pEnd > slot) {
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
          const titleEl = matchedProg.querySelector('title');
          cell.textContent = titleEl ? titleEl.textContent : "Sem Título";
        } else {
          cell.textContent = sIdx === 0 ? (channel.currentProgram || "---") : "---";
        }

        // Suporte perfeito ao Mouse!
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
    if (!this.synopsisTitleEl || !this.synopsisTimeEl || !this.synopsisDescEl) return;

    let prog = null;
    if (this.matrixData[this.selectedRow]) prog = this.matrixData[this.selectedRow][this.selectedCol];
    const channel = this.channels[this.selectedRow] || {};

    if (prog) {
      const title = prog.querySelector('title')?.textContent || "Programa";
      const desc = prog.querySelector('desc')?.textContent || "Sem descrição disponível para este programa.";
      const start = this.parseXMLTVDate(prog.getAttribute('start'));
      const end = this.parseXMLTVDate(prog.getAttribute('stop'));
      
      const fmt = (d) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      this.synopsisTitleEl.textContent = `${channel.number || ''} • ${channel.name || ''}: ${title}`;
      this.synopsisTimeEl.textContent = `${fmt(start)} - ${fmt(end)}`;
      this.synopsisDescEl.textContent = desc;
    } else {
      this.synopsisTitleEl.textContent = `${channel.number || ''} • ${channel.name || ''}: ${channel.currentProgram || 'Sem Programação'}`;
      this.synopsisTimeEl.textContent = `${channel.start || '--:--'} - ${channel.end || '--:--'}`;
      this.synopsisDescEl.textContent = channel.synopsis || "Informações indisponíveis para este horário.";
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

  updateClock() {
    if (!this.clockEl || !this.dateEl) return;
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    this.clockEl.textContent = `${h}:${m}`;
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    this.dateEl.textContent = `${dias[now.getDay()]} ${now.getDate()}/${meses[now.getMonth()]}`;
  }

  show() {
    if (!this.el) return;
    this.isOpen = true;
    this.el.classList.remove('hidden');
    this.generateTimeSlots();
    this.renderMatrix();
    this.updateClock();
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }

  hide() {
    if (!this.el) return;
    this.isOpen = false;
    this.el.classList.add('hidden');
    if (this.clockInterval) { clearInterval(this.clockInterval); this.clockInterval = null; }
  }

  toggle() { if (this.isOpen) this.hide(); else this.show(); }
}