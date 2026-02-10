# Email Marketer - MailChimp Alternative
# Docker Container

FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Create uploads directory
RUN mkdir -p public/uploads data

# Expose port
EXPOSE 3080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3080/api/stats', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start the app
CMD ["npm", "start"]
