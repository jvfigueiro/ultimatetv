import Hls from 'hls.js';
import mpegts from 'mpegts.js';

export class TVPlayer {
  constructor(videoElementId, onStreamReadyCallback) {
    this.video = document.getElementById(videoElementId);
    this.noSignalEl = document.getElementById('no-signal');
    this.errorMsgEl = document.getElementById('no-signal-msg');
    this.slowScreenEl = document.getElementById('slow-screen');
    this.uaEl = document.getElementById('dtv-user-agent');
    this.reasonEl = document.getElementById('dtv-error-reason');
    
    this.hls = null;
    this.tsPlayer = null;
    this.fatalTimer = null;
    this.slowTimer = null;
    this.subtitlesActive = false;
    this.onStreamReady = onStreamReadyCallback;

    this.video.addEventListener('playing', () => {
      console.log("[Player] Imagem gerada na GPU!");
      this.clearAllTimers();
      this.noSignalEl.classList.add('hidden');
      this.slowScreenEl.classList.add('hidden');
      if (this.onStreamReady) this.onStreamReady();
    });

    this.video.addEventListener('loadedmetadata', () => {
      if (this.onStreamReady) this.onStreamReady();
    });

    this.video.addEventListener('resize', () => {
      if (this.onStreamReady) this.onStreamReady();
    });
  }

  loadChannel(streamUrl) {
    console.log(`[UltimateTV Player] Sintonizando Proxy: ${streamUrl}`);
    this.stop();
    this.startTimers(7000, 20000);

    this.detectedVideoCodec = '';
    this.detectedAudioCodec = '';

    if (streamUrl.includes('.m3u8') && Hls.isSupported()) {
      this.hls = new Hls({
        capLevelToPlayerSize: true, // Força carregar resolução compativel com a TV
        enableWorker: true
      });
      this.hls.loadSource(streamUrl);
      
      this.hls.on(Hls.Events.FRAG_PARSING_INIT_SEGMENT, (event, data) => {
        if (data && data.tracks) {
          if (data.tracks.video && data.tracks.video.codec) this.detectedVideoCodec = data.tracks.video.codec;
          if (data.tracks.audio && data.tracks.audio.codec) this.detectedAudioCodec = data.tracks.audio.codec;
        }
      });
      this.hls.attachMedia(this.video);
      this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        if (data && data.levels && data.levels.length > 0) {
          let max720Index = -1;
          data.levels.forEach((lvl, idx) => {
            if (lvl.height && lvl.height <= 720) {
              max720Index = Math.max(max720Index, idx);
            }
          });
          if (max720Index !== -1) {
            this.hls.autoLevelCapping = max720Index;
            console.log(`[Player] HLS 720p cap applied: level ${max720Index} (${data.levels[max720Index].height}p)`);
          }
        }
        if (this.onStreamReady) this.onStreamReady();
        this.video.play().catch(() => {});
        this.applySubtitleState();
      });

      this.hls.on(Hls.Events.LEVEL_SWITCHED, () => {
        if (this.onStreamReady) this.onStreamReady();
      });
      this.hls.on(Hls.Events.ERROR, (e, data) => {
        if (data.fatal) {
          let reason = "Falha na reprodução do stream.";
          if (data.response && (data.response.code === 401 || data.response.code === 403)) {
            reason = "Não autorizado pela programadora.";
          }
          this.triggerFatalError(reason);
        }
      });
    } else if (mpegts.getFeatureList().mseLivePlayback) {
      this.tsPlayer = mpegts.createPlayer({
        type: 'mpegts',
        isLive: true,
        url: streamUrl
      }, {
        enableWorker: true,
        lazyLoadMaxDuration: 3 * 60
      });
      
      this.tsPlayer.attachMediaElement(this.video);
      this.tsPlayer.load();
      this.tsPlayer.play().catch(() => {});
      
      this.tsPlayer.on(mpegts.Events.ERROR, () => {
        this.triggerFatalError("Falha na reprodução do stream.");
      });
    } else {
      this.video.src = streamUrl;
      this.video.play().catch(() => {});
    }
  }

  getDetectedVideoCodec() {
    try {
      let codec = this.detectedVideoCodec;
      if (!codec && this.hls && this.hls.levels && this.hls.levels.length > 0) {
        const currentLevel = this.hls.levels[this.hls.currentLevel >= 0 ? this.hls.currentLevel : 0];
        if (currentLevel && currentLevel.videoCodec) codec = currentLevel.videoCodec;
      }
      if (codec) {
        const c = codec.toLowerCase();
        if (c.includes('hevc') || c.includes('h265')) return "HEVC";
        if (c.includes('avc') || c.includes('h264')) return "H264";
      }
      return "--";
    } catch (e) {
      return "--";
    }
  }

  getDetectedResolution() {
    const w = this.video.videoWidth;
    const h = this.video.videoHeight;
    let height = h;
    let width = w;

    if (!height && this.hls && this.hls.levels && this.hls.levels.length > 0) {
      const cur = this.hls.currentLevel >= 0 
        ? this.hls.currentLevel 
        : (this.hls.autoLevelCapping >= 0 ? this.hls.autoLevelCapping : 0);
      const lvl = this.hls.levels[cur];
      if (lvl && lvl.height) {
        height = lvl.height;
        width = lvl.width;
      }
    }

    if (!height) return "--";
    if (height >= 2160 || width >= 3840) return "4K";
    if (height >= 1080 || width >= 1920) return "1080p";
    if (height >= 720 || width >= 1280) return "720p";
    if (height >= 480 || width >= 854) return "480p";
    if (height >= 360 || width >= 640) return "360p";
    return `${height}p`;
  }

  getDetectedAudio() {
    try {
      if (this.hls) {
        let codec = this.detectedAudioCodec || '';
        if (!codec && this.hls.audioTracks && this.hls.audioTracks.length > 0) {
          const currentTrack = this.hls.audioTracks[this.hls.audioTrack] || this.hls.audioTracks[0];
          if (currentTrack && currentTrack.audioCodec) codec = currentTrack.audioCodec;
        }
        if (!codec && this.hls.levels && this.hls.levels.length > 0) {
          const currentLevel = this.hls.levels[this.hls.currentLevel >= 0 ? this.hls.currentLevel : 0];
          if (currentLevel && currentLevel.audioCodec) codec = currentLevel.audioCodec;
        }
        if (codec) {
          const c = codec.toLowerCase();
          if (c.includes('ac-3') || c.includes('ec-3') || c.includes('ac3')) return "DOLBY";
          if (c.includes('aac') || c.includes('mp4a')) return "AAC";
        }
        if (this.hls.audioTracks && this.hls.audioTracks.length > 1) return "MULTI";
      }
      return "--";
    } catch (e) {
      console.warn('Erro audio:', e);
      return "--";
    }
  }

  cycleAudioTrack() {
    if (this.hls && this.hls.audioTracks && this.hls.audioTracks.length > 1) {
      const tracks = this.hls.audioTracks;
      let nextId = this.hls.audioTrack + 1;
      if (nextId >= tracks.length) nextId = 0;
      this.hls.audioTrack = nextId;
      return `Áudio (${nextId + 1}/${tracks.length})`;
    }
    return "Áudio (1/1)";
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
      console.warn("[Player] Stream lento detectado (>4s)... Exibindo tela cheia de espera.");
      this.slowScreenEl.classList.remove('hidden');
    }, slowMs);

    this.fatalTimer = setTimeout(() => {
      this.triggerFatalError("Tempo limite de conexão excedido.");
    }, fatalMs);
  }

  clearAllTimers() {
    if (this.slowTimer) { clearTimeout(this.slowTimer); this.slowTimer = null; }
    if (this.fatalTimer) { clearTimeout(this.fatalTimer); this.fatalTimer = null; }
  }

  triggerFatalError(msg) {
    console.warn(`[Player] Erro Fatal: ${msg}`);
    this.clearAllTimers();
    this.slowScreenEl.classList.add('hidden');
    if (this.reasonEl) this.reasonEl.textContent = msg;
    if (this.uaEl) this.uaEl.textContent = navigator.userAgent;
    this.noSignalEl.classList.remove('hidden');
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