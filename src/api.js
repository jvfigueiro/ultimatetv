export class DispatcharrAPI {
  constructor() {
    this.serverUrl = localStorage.getItem('ultimatetv_server') || 'http://10.0.7.25:9191';
    this.m3uUrl = localStorage.getItem('ultimatetv_m3u') || `${this.serverUrl}/output/m3u`;
    this.epgUrl = localStorage.getItem('ultimatetv_epg') || `${this.serverUrl}/output/epg`;
  }

  async loadAllData() {
    console.log(`[UltimateTV API] Conectando ao servidor em: ${this.m3uUrl}...`);
    try {
      const [m3uResponse, epgResponse] = await Promise.all([
        fetch(this.m3uUrl),
        fetch(this.epgUrl).catch(() => null)
      ]);

      if (!m3uResponse.ok) throw new Error(`Erro HTTP no M3U: ${m3uResponse.status}`);

      const m3uText = await m3uResponse.text();
      const epgText = epgResponse && epgResponse.ok ? await epgResponse.text() : null;

      const channels = this.parseM3U(m3uText);
      
      if (epgText) {
        console.log("[UltimateTV API] XMLTV recebido! Iniciando cruzamento agressivo de EPG...");
        this.mergeEPG(channels, epgText);
      } else {
        console.warn("[UltimateTV API] Aviso: EPG não respondeu ou está vazio.");
      }

      return channels;
    } catch (error) {
      console.error("[UltimateTV API] Erro crítico:", error);
      return [];
    }
  }

  parseM3U(text) {
    const lines = text.split('\n');
    const channels = [];
    let currentChannel = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#EXTINF:')) {
        currentChannel = {};
        const idMatch = line.match(/tvg-id="([^"]*)"/i);
        const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
        const numMatch = line.match(/tvg-chno="([^"]*)"/i);
        const groupMatch = line.match(/group-title="([^"]*)"/i);
        
        currentChannel.id = idMatch ? idMatch[1].trim() : `ch_${channels.length + 1}`;
        currentChannel.logo = logoMatch ? logoMatch[1] : '';
        currentChannel.number = numMatch ? numMatch[1] : (channels.length + 1).toString().padStart(3, '0');
        currentChannel.group = groupMatch ? groupMatch[1].trim() : 'Outros';
        
        const nameParts = line.split(',');
        currentChannel.name = nameParts[nameParts.length - 1].trim();
        
        currentChannel.currentProgram = "Programação da UltimateTV";
        currentChannel.start = "--:--"; currentChannel.end = "--:--";
        currentChannel.progress = 0; currentChannel.remaining = 0;
        currentChannel.category = currentChannel.group;
        currentChannel.resolution = "FHD"; currentChannel.audio = "STEREO";
        currentChannel.synopsis = "Assista à programação ao vivo.";
        currentChannel.nextProgram = "Aguardando Guia...";
        currentChannel.nextStart = "--:--"; currentChannel.nextEnd = "--:--";
      } else if (line.startsWith('http') && currentChannel) {
        currentChannel.url = line;
        channels.push(currentChannel);
        currentChannel = null;
      }
    }
    return channels;
  }

  mergeEPG(channels, epgText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(epgText, "text/xml");
    this.rawXmlDoc = xmlDoc;
    const now = new Date();

    const xmlChannels = Array.from(xmlDoc.querySelectorAll('channel')).map(ch => {
      const id = ch.getAttribute('id') || '';
      const names = Array.from(ch.querySelectorAll('display-name')).map(dn => dn.textContent || '');
      return {
        realId: id,
        cleanId: id.toLowerCase().replace(/[^a-z0-9]/g, ''),
        cleanNames: names.map(n => n.toLowerCase().replace(/[^a-z0-9]/g, ''))
      };
    });

    let matchCount = 0;

    channels.forEach(channel => {
      const cleanM3uId = (channel.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanM3uName = (channel.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      
      let matchedEpgId = null;

      for (const xCh of xmlChannels) {
        if (xCh.cleanId === cleanM3uId || xCh.cleanNames.includes(cleanM3uName) || xCh.cleanNames.includes(cleanM3uId)) {
          matchedEpgId = xCh.realId; break;
        }
      }

      if (!matchedEpgId && cleanM3uName.length > 2) {
        for (const xCh of xmlChannels) {
          if (xCh.cleanId.includes(cleanM3uName) || cleanM3uName.includes(xCh.cleanId)) {
            matchedEpgId = xCh.realId; break;
          }
          for (const cName of xCh.cleanNames) {
            if (cName.length > 2 && (cName.includes(cleanM3uName) || cleanM3uName.includes(cName))) {
              matchedEpgId = xCh.realId; break;
            }
          }
          if (matchedEpgId) break;
        }
      }

      if (!matchedEpgId) return;
      matchCount++;

      // A MÁGICA ACONTECE AQUI: Salva o ID correto do XMLTV no canal para o EPG usar depois!
      channel.epgId = matchedEpgId;

      this.updateChannelEPG(channel);
    });

    console.log(`🎯 [UltimateTV EPG] Sincronização e Fuso Horário processados para ${matchCount} canais!`);
  }

  updateChannelEPG(channel) {
    if (!this.rawXmlDoc || !channel.epgId) return channel;
    
    const now = new Date();
    const programmes = Array.from(this.rawXmlDoc.querySelectorAll(`programme[channel="${channel.epgId}"]`));
    if (programmes.length === 0) return channel;

    let currentProg = null;
    let nextProg = null;

    for (let i = 0; i < programmes.length; i++) {
      const start = this.parseXMLTVDate(programmes[i].getAttribute('start'));
      const end = this.parseXMLTVDate(programmes[i].getAttribute('stop'));

      if (now >= start && now < end) {
        currentProg = programmes[i];
        nextProg = programmes[i + 1] || null;
        break;
      }
    }

    if (!currentProg) {
      for (let i = programmes.length - 1; i >= 0; i--) {
        const start = this.parseXMLTVDate(programmes[i].getAttribute('start'));
        if (start <= now) {
          currentProg = programmes[i];
          nextProg = programmes[i + 1] || null;
          break;
        }
      }
    }

    if (currentProg) {
      const start = this.parseXMLTVDate(currentProg.getAttribute('start'));
      const end = this.parseXMLTVDate(currentProg.getAttribute('stop'));
      const title = currentProg.querySelector('title');
      const desc = currentProg.querySelector('desc');
      
      channel.currentProgram = title ? title.textContent : "Programa Sem Título";
      channel.synopsis = desc ? desc.textContent : "Sem descrição disponível para este programa.";
      channel.start = this.formatTime(start);
      channel.end = this.formatTime(end);
      
      channel.startObj = start;
      channel.endObj = end;
      
      const totalDuration = Math.max(1, (end - start) / 1000 / 60);
      const elapsed = (now - start) / 1000 / 60;
      channel.progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      channel.remaining = Math.max(0, Math.round(totalDuration - elapsed));

      if (nextProg) {
        const nextTitle = nextProg.querySelector('title');
        const nextStart = this.parseXMLTVDate(nextProg.getAttribute('start'));
        const nextEnd = this.parseXMLTVDate(nextProg.getAttribute('stop'));
        channel.nextProgram = nextTitle ? nextTitle.textContent : "Sem informação";
        channel.nextStart = this.formatTime(nextStart);
        channel.nextEnd = this.formatTime(nextEnd);
      }
    }
    return channel;

    console.log(`🎯 [UltimateTV EPG] Sincronização e Fuso Horário processados para ${matchCount} canais!`);
  }

  parseXMLTVDate(dateStr) {
    if (!dateStr) return new Date();
    const clean = dateStr.trim();
    const y = clean.substring(0, 4);
    const m = clean.substring(4, 6);
    const d = clean.substring(6, 8);
    const h = clean.substring(8, 10);
    const min = clean.substring(10, 12);
    const s = clean.substring(12, 14) || '00';
    
    let iso = `${y}-${m}-${d}T${h}:${min}:${s}`;
    
    const tzMatch = clean.match(/([+-]\d{2})(\d{2})$/);
    if (tzMatch) {
      iso += `${tzMatch[1]}:${tzMatch[2]}`;
    } else {
      iso += '-03:00';
    }
    
    return new Date(iso);
  }

  formatTime(dateObj) {
    return `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
  }
}