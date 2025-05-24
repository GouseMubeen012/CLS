FROM node:18-alpine

WORKDIR /app

# Create uploads directory
RUN mkdir -p uploads && chown -R node:node uploads

COPY package*.json ./

RUN npm install

COPY . .

# Ensure uploads directory has correct permissions
RUN chown -R node:node /app

EXPOSE 5000

CMD ["npm", "start"]
