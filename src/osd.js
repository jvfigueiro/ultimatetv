export class OSD {
  constructor(onProgramEndedCallback) {
    this.el = document.getElementById('osd');
    this.logoEl = document.getElementById('osd-logo');
    this.numEl = document.getElementById('osd-number');
    this.nameEl = document.getElementById('osd-name');
    this.progEl = document.getElementById('osd-program');
    this.onProgramEnded = onProgramEndedCallback;
    
    this.startEndEl = document.getElementById('osd-start-end');
    this.barEl = document.getElementById('osd-progress');
    this.remainingEl = document.getElementById('osd-remaining');
    this.resEl = document.getElementById('osd-res');
    this.audioEl = document.getElementById('osd-audio');
    
    this.synopsisEl = document.getElementById('osd-synopsis');
    this.nextTimeEl = document.getElementById('osd-next-time');
    this.nextEl = document.getElementById('osd-next');
    
    this.hideTimeout = null;
    this.progressInterval = null;
    this.expandTimeout = null;
    this.displayDuration = parseInt(localStorage.getItem('ultimatetv_osd_timeout'), 10) || 7000;
  }

  show(channelData, playerInstance) {
    this.el.classList.remove('expanded');
    if (this.expandTimeout) {
      clearTimeout(this.expandTimeout);
      this.expandTimeout = null;
    }
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
    
    // Configura o intervalo de atualização em tempo real
    if (this.progressInterval) clearInterval(this.progressInterval);
    
    const updateProgress = () => {
      if (channelData.startObj && channelData.endObj) {
        const now = new Date();
        const start = channelData.startObj;
        const end = channelData.endObj;

        // Se o programa acabou, solicita novos dados pro main.js
        if (now >= end && this.onProgramEnded) {
          this.onProgramEnded();
          return;
        }

        const totalDuration = Math.max(1, (end - start) / 1000 / 60);
        const elapsed = (now - start) / 1000 / 60;
        const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        const remaining = Math.max(0, Math.round(totalDuration - elapsed));
        
        this.barEl.style.width = `${progress}%`;
        this.remainingEl.textContent = `${remaining} min`;
      } else {
        this.barEl.style.width = `${channelData.progress || 0}%`;
        this.remainingEl.textContent = `${channelData.remaining || 0} min`;
      }
    };
    
    updateProgress();
    this.progressInterval = setInterval(updateProgress, 60000); // Atualiza a cada 1 minuto
    
    this.updateBadges(playerInstance);

    // Se a resolução/audio demorou a subir na GPU, força uma releitura progressiva
    setTimeout(() => this.updateBadges(playerInstance), 1500);
    setTimeout(() => this.updateBadges(playerInstance), 3500);

    this.synopsisEl.textContent = channelData.synopsis || "Sem descrição disponível para este programa.";
    this.nextTimeEl.textContent = `${channelData.nextStart || "--:--"} - ${channelData.nextEnd || "--:--"}`;
    this.nextEl.textContent = channelData.nextProgram || "Sem informação";

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
      this.resEl.textContent = "--";
      this.audioEl.textContent = "--";
    }
  }

  hide() {
    this.el.classList.add('hidden');
    this.el.classList.remove('expanded'); // Reverte estado expandido ao esconder
    if (this.expandTimeout) {
      clearTimeout(this.expandTimeout);
      this.expandTimeout = null;
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  expandSynopsis() {
    this.el.classList.add('expanded');
    this.el.classList.remove('hidden');
    
    // Cancela o auto-hide normal do OSD
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    
    // Configura o auto-close de 20s
    if (this.expandTimeout) clearTimeout(this.expandTimeout);
    this.expandTimeout = setTimeout(() => {
      this.el.classList.remove('expanded');
      this.hide();
    }, 20000);
  }

  isExpanded() {
    return this.el.classList.contains('expanded');
  }

  collapseSynopsis() {
    this.el.classList.remove('expanded');
    if (this.expandTimeout) clearTimeout(this.expandTimeout);
    // Reinicia o auto-hide normal
    this.hideTimeout = setTimeout(() => this.hide(), this.displayDuration);
  }

  toggle(channelData, playerInstance) {
    if (this.el.classList.contains('hidden')) {
      this.show(channelData, playerInstance);
    } else {
      this.hide();
    }
  }
}