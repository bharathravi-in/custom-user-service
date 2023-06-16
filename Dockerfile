FROM node:14 AS builder

# Create app directory
WORKDIR /app

# copy dependency files
COPY package.json ./
COPY yarn.lock ./
COPY prisma ./prisma/
COPY keys ./keys/

# Install app dependencies
RUN yarn install
# Required if not done in postinstall
# RUN npx prisma generate

COPY . .

RUN yarn run build

FROM node:14

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/keys ./keys

EXPOSE 3003
CMD [ "npm", "run", "start:prod" ]
