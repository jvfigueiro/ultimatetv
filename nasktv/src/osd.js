export class OSD {
  constructor() {
    this.el = document.getElementById('osd');
    this.logoEl = document.getElementById('osd-logo');
    this.numEl = document.getElementById('osd-number');
    this.nameEl = document.getElementById('osd-name');
    this.progEl = document.getElementById('osd-program');
    
    this.startEndEl = document.getElementById('osd-start-end');
    this.barEl = document.getElementById('osd-progress');
    this.remainingEl = document.getElementById('osd-remaining');
    this.resEl = document.getElementById('osd-res');
    this.audioEl = document.getElementById('osd-audio');
    
    this.synopsisEl = document.getElementById('osd-synopsis');
    this.nextTimeEl = document.getElementById('osd-next-time');
    this.nextEl = document.getElementById('osd-next');
    
    this.clockEl = document.getElementById('osd-clock');
    this.dateEl = document.getElementById('osd-date');
    
    this.hideTimeout = null;
    this.clockInterval = null;
    this.displayDuration = 7000;
  }

  updateClock() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    this.clockEl.textContent = `${hours}:${minutes}`;

    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const diaSemana = diasSemana[now.getDay()];
    const dia = now.getDate().toString().padStart(2, '0');
    const mes = (now.getMonth() + 1).toString().padStart(2, '0');
    
    this.dateEl.textContent = `${diaSemana} ${dia}/${mes}`;
  }

  startClockLoop() {
    this.updateClock();
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }

  stopClockLoop() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  show(channelData, playerInstance) {
    if (this.hideTimeout) clearTimeout(this.hideTimeout);

    if (channelData.logo) {
      this.logoEl.src = channelData.logo;
      this.logoEl.style.display = 'block';
    } else {
      this.logoEl.style.display = 'none';
    }

    this.numEl.textContent = channelData.number || "--";
    this.nameEl.textContent = channelData.name || "Canal";
    this.progEl.textContent = channelData.currentProgram || "Programação indisponível";
    
    this.startEndEl.textContent = `${channelData.start || "--:--"} - ${channelData.end || "--:--"}`;
    this.barEl.style.width = `${channelData.progress || 0}%`;
    this.remainingEl.textContent = `${channelData.remaining || 0} min`;
    
    this.updateBadges(playerInstance);

    // Se a resolução demorou a subir na GPU, força uma releitura após 1 segundo
    setTimeout(() => this.updateBadges(playerInstance), 1000);

    this.synopsisEl.textContent = channelData.synopsis || "Sem descrição disponível para este programa.";
    this.nextTimeEl.textContent = `${channelData.nextStart || "--:--"} - ${channelData.nextEnd || "--:--"}`;
    this.nextEl.textContent = channelData.nextProgram || "Sem informação";

    this.startClockLoop();
    this.el.classList.remove('hidden');

    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, this.displayDuration);
  }

  updateBadges(playerInstance) {
    if (playerInstance) {
      this.resEl.textContent = playerInstance.getDetectedResolution();
      this.audioEl.textContent = playerInstance.getDetectedAudio();
    } else {
      this.resEl.textContent = "HD";
      this.audioEl.textContent = "STEREO";
    }
  }

  hide() {
    this.el.classList.add('hidden');
    this.stopClockLoop();
  }

  toggle(channelData, playerInstance) {
    if (this.el.classList.contains('hidden')) {
      this.show(channelData, playerInstance);
    } else {
      this.hide();
    }
  }
}