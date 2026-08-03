# UltimateTV

O **UltimateTV** é um player de IPTV construído com HTML5 e JavaScript para atuar como um front-end de alta performance para o **Dispatcharr**, focado em execução em rede local.

O objetivo deste projeto é proporcionar uma experiência de uso semelhante a equipamentos OEM de TV a cabo e/ou de apps de streaming, garantindo altíssimo nível de fluidez mesmo em hardwares de baixo custo.

Embora projetado e otimizado para consumir listas geradas pelo Dispatcharr, a arquitetura flexível permite que ele seja adaptado para consumir outras listas M3U e XMLTV diretamente (mediante pequenas alterações no código-fonte).

---

## Telas do Aplicativo

- ![Tela Inicial](./docs/screenshots/home.png)
- ![Player e OSD](./docs/screenshots/osd.png)
- ![Guia de Programação](./docs/screenshots/epg.png)

---

## Objetivo e Plataformas

O projeto foi inteiramente desenhado e calibrado para dominar o ecossistema Android:

- **Android TV (Projetores, Box TVs, Sticks e Smart TVs Android):** Suporte de ponta a ponta, operando lisamente mesmo em dispositivos de entrada com 1GB de RAM.
- **Navegadores Modernos (Chrome/Web):** Acessível via web para consumo rápido pelo PC.

*(Nota: O suporte ao legado LG NetCast [baseado em Chrome 22.0] foi formalmente descontinuado em prol de mantermos uma base de código moderna, segura e com acesso às APIs mais recentes de vídeo e HLS).*

## Otimizações de Performance

Construir uma interface digna de aparelhos topo de linha em processadores lentos exigiu medidas drásticas de economia de GPU e RAM:

- **Arquitetura Zero-Opacidade:** Extirpamos transições de opacity, blur e sombras complexas da engine de renderização CSS. Menus (OSD, Lista de Canais, Guia) deslizam via pura matemática vetorial (transform: translate) com will-change: transform, erradicando stutters e lags nos primeiros frames de animação.
- **Lazy Loading & DOM Caching:** A tela inicial (Home) com suporte a carrosséis por categoria aplica estratégias de carregamento preguiçoso (loading="lazy") em logotipos. Ao zappear canais, a TV não demole e reconstrói o DOM inteiro, ela preserva a UI em memória e foca exatamente de onde o usuário parou, zerando tempos de loading.
- **Limites de Buffer Estritos (HLS.js):** Para evitar crasheamentos infames por *Out of Memory (OOM)* em projetores básicos, a instância nativa de HLS limita o *buffer* de retenção no tempo a curtos blocos com um teto severo de RAM (30MB), descartando silenciosamente resoluções maiores que a dimensão do painel via capLevelToPlayerSize.

## Design Premium "Mosaico" Dinâmico

Inspirado no visual de plataformas como Android TV e equipamentos de TV a cabo, a arquitetura UX foi dividida em:

1. **Top Menu Flat:** Menu superior direto ao ponto (Assistir TV, Último Canal, Guia EPG) garantindo 100% de largura horizontal disponível.
2. **Hero Banner Dinâmico:** Uma vitrine cinemática estática mas inteligentemente responsiva. Navegar na prateleira atualiza instantaneamente a arte, título, horário e sinopse do programa atual no painel sem engasgar o vídeo ao fundo.
3. **OSD & EPG Real-Time:** Uma tarja inferior elegante (On-Screen Display) informando a resolução real (1080p, 720p), metadados e barra de progresso perfeitamente calibrados pela sincronização entre os horários do servidor e a máquina local.

## Segurança e Controle de Acesso (NGINX)

O projeto pode ser servido via servidor web (como NGINX), o que possibilita a implementação de **Controle de Acesso por IPs Autorizados** (via nginx.conf). Isso garante que apenas dispositivos explícitos e confiáveis da sua rede local (ou túnel VPN) possam carregar a interface e os streams, entregando uma camada extra e invisível de segurança.

## Como Construir e Sincronizar

O aplicativo Android gerado é apenas um wrapper que aponta para o servidor que hospeda o repositório Web. Isso significa que **qualquer alteração no código reflete instantaneamente nas TVs** da rede assim que elas são reiniciadas. Não é necessário recompilar APKs a cada nova feature visual.

Caso precise gerar um novo APK via Capacitor:

1. Modifique o capacitor.config.json, inserindo o IP do seu servidor no campo server.url.
2. Sincronize a base de código e gere o binário pelo Android Studio:
   `ash
   npx cap sync android
   npx cap open android
   `

## Notas Finais

- O projeto não utiliza banco de dados próprio. Ele depende do pareamento e cruzamento de metadados em tempo real gerados a partir do parse do **Dispatcharr** (XMLTV/M3U).
- Foi criado sob a filosofia de não necessitar pacotes NPM Node pesados como Webpack ou React, vivendo perfeitamente da trindade nativa da web (HTML/JS/CSS).

## Licença

Este projeto é licenciado sob a Licença MIT - veja o arquivo [LICENSE](./LICENSE) para detalhes.
