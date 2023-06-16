FROM node:16 AS builder

# Create app directory
WORKDIR /app

# Install wget and gconf-service
RUN apt-get update && apt-get install -y wget gconf-service

# Install Chrome
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN dpkg -i google-chrome-stable_current_amd64.deb

# copy dependency files
COPY package.json ./
COPY yarn.lock ./
COPY prisma ./prisma/
COPY keys ./keys/
COPY logs ./logs/
COPY pdf ./pdf/
COPY .puppeteerrc.cjs ./
COPY puppeteer-cache ./puppeteer-cache/

# Install app dependencies
RUN yarn install
# Required if not done in postinstall
# RUN npx prisma generate

COPY . .

RUN yarn run build

FROM node:16

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/keys ./keys
COPY --from=builder /app/logs ./logs
COPY --from=builder /app/pdf ./pdf
COPY --from=builder /app/.puppeteerrc.cjs ./.puppeteerrc.cjs
COPY --from=builder /app/puppeteer-cache ./puppeteer-cache

EXPOSE 3003
CMD [ "npm", "run", "start:prod" ]
