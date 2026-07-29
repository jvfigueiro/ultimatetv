import Hls from 'hls.js';
import mpegts from 'mpegts.js';

export class TVPlayer {
  constructor(videoElementId, onStreamReadyCallback) {
    this.video = document.getElementById(videoElementId);
    this.noSignalEl = document.getElementById('no-signal');
    this.errorMsgEl = document.getElementById('no-signal-msg');
    this.slowScreenEl = document.getElementById('slow-screen');
    this.uaEl = document.getElementById('dtv-user-agent');
    this.clockEl = document.getElementById('dtv-clock');
    this.dateEl = document.getElementById('dtv-date');
    
    this.hls = null;
    this.tsPlayer = null;
    this.fatalTimer = null;
    this.slowTimer = null;
    this.clockInterval = null;
    this.subtitlesActive = false;
    this.onStreamReady = onStreamReadyCallback;

    this.video.addEventListener('playing', () => {
      console.log("[UltimateTV Player] Imagem gerada na GPU!");
      this.clearAllTimers();
      this.noSignalEl.classList.add('hidden');
      this.slowScreenEl.classList.add('hidden');
      if (this.onStreamReady) {
        setTimeout(() => this.onStreamReady(), 300);
      }
    });

    this.video.addEventListener('loadedmetadata', () => {
      if (this.onStreamReady) this.onStreamReady();
    });
  }

  loadChannel(streamUrl) {
    console.log(`[UltimateTV Player] Sintonizando Proxy: ${streamUrl}`);
    this.stop();
    this.startTimers(4000, 18000); // 4s para tela cheia lenta, 18s para erro fatal

    if (streamUrl.includes('.m3u8') && Hls.isSupported()) {
      this.hls = new Hls({ maxBufferLength: 10, enableWorker: true });
      this.hls.loadSource(streamUrl);
      this.hls.attachMedia(this.video);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.video.play().catch(() => {});
        this.applySubtitleState();
      });
      this.hls.on(Hls.Events.ERROR, (e, data) => {
        if (data.fatal) this.triggerFatalError("Falha fatal no manifesto HLS do servidor.");
      });
    } else if (mpegts.getFeatureList().mseLivePlayback) {
      this.tsPlayer = mpegts.createPlayer({
        type: 'mpegts',
        isLive: true,
        url: streamUrl
      }, {
        enableWorker: true,
        lazyLoadMaxDuration: 3 * 60,
        seekType: 'range'
      });
      
      this.tsPlayer.attachMediaElement(this.video);
      this.tsPlayer.load();
      this.tsPlayer.play().catch(() => {});
      
      this.tsPlayer.on(mpegts.Events.ERROR, () => {
        this.triggerFatalError("A conexão com o servidor foi perdida ou recusada.");
      });
    } else {
      this.video.src = streamUrl;
      this.video.play().catch(() => {});
    }
  }

  getDetectedResolution() {
    const w = this.video.videoWidth;
    const h = this.video.videoHeight;
    if (!w || !h) return "--";
    if (h >= 2160 || w >= 3840) return "4K";
    if (h >= 1080 || w >= 1920) return "1080p";
    if (h >= 720 || w >= 1280) return "720p";
    return "SD";
  }

  getDetectedAudio() {
    try {
      if (this.hls && this.hls.audioTracks && this.hls.audioTracks.length > 1) return "MULTI";
      return "STEREO";
    } catch {
      return "STEREO";
    }
  }

  setAspectMode(modeClass) { this.video.className = modeClass; }

  toggleSubtitles() {
    this.subtitlesActive = !this.subtitlesActive;
    this.applySubtitleState();
    return this.subtitlesActive;
  }

  applySubtitleState() {
    if (this.hls && this.hls.subtitleTracks && this.hls.subtitleTracks.length > 0) {
      this.hls.subtitleTrack = this.subtitlesActive ? 0 : -1;
    }
    const tracks = this.video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = this.subtitlesActive ? 'showing' : 'disabled';
    }
  }

  startTimers(slowMs, fatalMs) {
    this.clearAllTimers();
    this.noSignalEl.classList.add('hidden');
    this.slowScreenEl.classList.add('hidden');

    this.slowTimer = setTimeout(() => {
      console.warn("[UltimateTV Player] Stream lento detectado (>4s)... Exibindo tela cheia de espera.");
      this.slowScreenEl.classList.remove('hidden');
    }, slowMs);

    this.fatalTimer = setTimeout(() => {
      this.triggerFatalError("Tempo limite excedido (18s). O canal não respondeu a tempo.");
    }, fatalMs);
  }

  clearAllTimers() {
    if (this.slowTimer) { clearTimeout(this.slowTimer); this.slowTimer = null; }
    if (this.fatalTimer) { clearTimeout(this.fatalTimer); this.fatalTimer = null; }
    if (this.clockInterval) { clearInterval(this.clockInterval); this.clockInterval = null; }
  }

  triggerFatalError(msg) {
    console.warn(`[UltimateTV Player] Erro Fatal DirecTV 771: ${msg}`);
    this.clearAllTimers();
    this.slowScreenEl.classList.add('hidden');
    this.errorMsgEl.textContent = `${msg} Tente mudar de canal ou verifique seu servidor.`;
    if (this.uaEl) this.uaEl.textContent = navigator.userAgent;
    
    this.updateErrorClock();
    this.clockInterval = setInterval(() => this.updateErrorClock(), 1000);
    this.noSignalEl.classList.remove('hidden');
  }

  updateErrorClock() {
    if (!this.clockEl || !this.dateEl) return;
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    this.clockEl.textContent = `${h}:${m}`;
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    this.dateEl.textContent = `${dias[now.getDay()]} ${now.getDate()}/${meses[now.getMonth()]}`;
  }

  stop() {
    this.clearAllTimers();
    this.slowScreenEl.classList.add('hidden');
    if (this.hls) { this.hls.destroy(); this.hls = null; }
    if (this.tsPlayer) { this.tsPlayer.destroy(); this.tsPlayer = null; }
    this.video.pause();
    this.video.src = "";
  }
}