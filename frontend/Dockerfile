FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx ng build
EXPOSE 4200
# Serve using Angular CLI for development/demo mode as per port 4200 requirement
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "4200", "--disable-host-check"]
