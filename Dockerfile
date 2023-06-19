FROM node:16 AS builder

# Create app directory
#WORKDIR /app

# Install wget and gconf-service
RUN apt-get update && apt-get install -y wget gconf-service

# Install Chrome
# Install necessary dependencies 
#RUN apt-get update &&    apt-get install -y wget gnupg ca-certificates &&     rm -rf /var/lib/apt/lists/*
#RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - &&      echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list &&      apt-get update &&     apt-get install -y google-chrome-stable &&     rm -rf /var/lib/apt/lists/*

#RUN apt-get install -y wget
#RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
#RUN echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list
#RUN apt-get update 
#RUN apt-get -y install google-chrome-stable
#RUN google-chrome --version
#ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
#RUN echo "$PUPPETEER_EXECUTABLE_PATH"
# Set Chrome as the Puppeteer executable path 
#RUN echo 'export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable' >> /etc/profile
#ENV PATH PUPPETEER_EXECUTABLE_PATH:$PATH
#RUN source ~/.bashrc
#RUN cat ~/.bashrc
#RUN  echo $PUPPETEER_EXECUTABLE_PATH
#RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
#RUN apt install -y ./google-chrome-stable_current_amd64.deb || apt-get --fix-broken install -y

# Create app directory
WORKDIR /app

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
#RUN yarn cache clean
RUN yarn install --ignore-scripts
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

RUN apt-get install -y wget
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list
RUN apt-get update
RUN apt-get -y install google-chrome-stable
RUN google-chrome --version
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
RUN echo "$PUPPETEER_EXECUTABLE_PATH"
RUN google-chrome --version

EXPOSE 3003
CMD [ "npm", "run", "start:prod" ]
~                                          