# UltimateTV

O **UltimateTV** é uma **Single Page Application (SPA)** construída para atuar primariamente como um *Thin Client* (Front-end remoto) dedicado para o **Dispatcharr**, voltado para execução em rede local.

O objetivo principal deste projeto é proporcionar uma experiência de uso premium, fluída e responsiva, semelhante a apps de streaming e experiências de uso de receptores de TV a cabo, através do consumo inteligente das listas M3U e dados de programação XMLTV entregues pelo Dispatcharr.

## 🎯 Plataformas e Foco

O projeto foi rigorosamente projetado para rodar de forma suave em hardwares com limitação de processamento e recursos. O foco de compatibilidade engloba:

- **Android TV (Box TVs, Sticks e Smart TVs Android):** Através do empacotamento com Capacitor.
- **LG NetCast 4.0:** Compatibilidade otimizada com navegadores de Smart TVs antigas da LG (modelos de 2013 e 2014), que dependem de baixo consumo de memória e CSS simplificado.
- **Navegadores Modernos (Chrome/Web):** Para visualização responsiva e ágil no computador ou celular.

## 🚀 Arquitetura e "Thin Client"

O aplicativo Android utiliza o **Capacitor** para criar um wrapper ao redor da aplicação web. 
No entanto, ele opera como um *Thin Client* (Conector Remoto). Em vez de embutir todos os arquivos HTML, JS e CSS estaticamente dentro do arquivo APK gerado, o aplicativo aponta para o servidor Web local onde a interface compilada está hospedada.

Isso significa que **qualquer alteração na interface ou nas lógicas do aplicativo refletirá instantaneamente em todas as TVs** da sua rede ao recarregá-las. Não há necessidade de recompilar, assinar ou instalar um novo APK via pendrive a cada melhoria visual ou correção de bug.

### Otimizações e Topologia

- **Foco em 720p:** Toda a interface gráfica, fontes e margens (overscan) foram meticulosamente desenhadas tendo em mente displays de **720p**. Embora seja perfeitamente escalável e compatível com TVs 1080p e 4K, o foco em 720p garante que TVs mais antigas não engasguem tentando renderizar elementos pesados em altas resoluções.
- Todo o processamento de interface e reprodução de vídeo (buffers, navegação 2D na home, cruzamento inteligente de EPG) acontece totalmente do lado do *cliente*, utilizando o suporte nativo a decodificação de hardware (GPU) da TV.
- O servidor atua estritamente hospedando os arquivos estáticos (`dist`), operando com consumo virtualmente zero de CPU e memória RAM para a aplicação web.

## 🛠️ Tecnologias Utilizadas

- **HTML5, Vanilla JS, CSS3:** Tecnologias puras focadas em extrema performance e baixo consumo de recursos, substituindo grids pesadas e DOM excessivo por linhas deslizantes de alto desempenho.
- **Vite:** Bundler moderno configurado com plugins `legacy`, garantindo compatibilidade com motores JavaScript antigos de TVs fabricadas antes de 2015.
- **hls.js / mpegts.js:** Motores de proxying para reprodução de streams (HLS/TS) na tag de vídeo nativa da TV, com suporte a extração "on-the-fly" de legendas ocultas embutidas.
- **Capacitor:** Empacotador para transformar a SPA num aplicativo de Android TV.

## ⚙️ Como Construir e Sincronizar

Caso precise alterar o IP da sua VPS ou construir um novo APK:

1. Modifique o arquivo `capacitor.config.json` e aponte o `server.url` para o IP onde a UltimateTV e o Dispatcharr estão hospedados.
2. Construa a aplicação de produção compatível com os navegadores legacy e empurre pro repositório:
   ```bash
   npm run build
   ```
3. Se estiver desenvolvendo o lado Android, atualize a base e abra a IDE para gerar um novo APK:
   ```bash
   npx cap sync android
   npx cap open android
   ```

## 📝 Observações

- Nenhuma dependência de banco de dados. Todo o mapeamento dos canais, histórico e metadados das categorias vêm processados na hora pelo back-end local do **Dispatcharr**.
- Design arquitetado com precisão milimétrica nas margens (overscan-safe) para não cortar elementos nas beiradas dos monitores CRT ou LCD.
