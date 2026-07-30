# UltimateTV

O **UltimateTV** é uma interface Web e aplicativo Android construído como um Front-end dedicado e exclusivo para o **Dispatcharr**, rodando em rede local.

O objetivo principal deste projeto é consumir as APIs e Playlists geradas pelo Dispatcharr (M3U e XMLTV) e oferecer uma experiência fluída, responsiva e semelhante a uma Smart TV ou Set-Top Box de ponta.

## 🚀 Arquitetura (Thin Client)

O aplicativo Android utiliza o **Capacitor** para empacotar a aplicação Web. 
No entanto, ele opera de maneira semelhante a um *Thin Client* (Conector Remoto). Em vez de embutir todos os arquivos HTML, JS e CSS estaticamente dentro do arquivo APK gerado, o aplicativo Android está configurado para consumir uma URL de um servidor Web local (onde a pasta `dist` construída é servida, por exemplo, por um Nginx ou servidor Node).

Essa abordagem permite que **qualquer alteração na interface ou nas lógicas do aplicativo reflita instantaneamente em todas as TVs** da sua rede ao recarregá-las, dispensando totalmente a necessidade de recompilar, assinar e instalar um novo APK via pendrive a cada atualização visual ou correção de bug.

## 🛠️ Tecnologias Utilizadas

- **HTML5, Vanilla JS, CSS3**: Tecnologias base super leves focadas em alta performance.
- **Vite**: Bundler rápido para construção dos assets para a web.
- **Capacitor**: Empacotador nativo que cria a casca (wrapper) do Android WebView.
- **Integração EPG Dinâmica**: Merge e cruzamento avançado em tempo real de arquivos XMLTV com M3U (Dispatcharr).

## ⚙️ Como Construir e Sincronizar

Caso precise alterar o endereço do servidor web ou precise gerar o APK pela primeira vez:

1. Edite o `capacitor.config.json` para apontar o `server.url` para o IP e porta onde esta interface web está hospedada (ex: `http://10.0.7.25:5173`).
2. Execute o build da aplicação web:
   ```bash
   npm run build
   ```
3. Sincronize com a plataforma Android:
   ```bash
   npx cap sync android
   ```
4. Abra o Android Studio e compile o projeto:
   ```bash
   npx cap open android
   ```

## 📝 Observações
* Desenvolvido para rodar exclusivamente em redes locais. 
* Não exige banco de dados próprio, já que todo o mapeamento e roteamento dos canais provém do Dispatcharr.
* Otimizado via CSS para dispensar efeitos gráficos pesados na GPU (blur, etc.) garantindo fluidez máxima em Box TVs e Smart TVs antigas.
