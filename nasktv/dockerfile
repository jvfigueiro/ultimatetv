# ==========================================
# Estágio 1: Build da Aplicação (Vite/Node)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copia apenas os manifestos de dependência primeiro (otimiza cache do Docker)
COPY package*.json ./
RUN npm ci

# Copia o restante do código e compila para produção
COPY . .
RUN npm run build

# ==========================================
# Estágio 2: Servidor Web Ultraleve (Nginx)
# ==========================================
FROM nginx:1-alpine-slim

WORKDIR /usr/share/nginx/html

# Remove os arquivos padrão do Nginx
RUN rm -rf ./*

# Copia apenas os assets otimizados gerados no Estágio 1
COPY --from=builder /app/dist .

# Copia a configuração customizada do Nginx para SPA e performance em TV
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]