# Use Node.js 20 slim as the base image
FROM node:20-slim

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
# Note: argon2 might require build tools if prebuilds are not available, 
# but node:20-slim usually handles common prebuilds fine.
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3001

# Define environment variables with defaults
ENV PORT=3001
ENV NODE_ENV=production

# Start the application
CMD ["node", "index.js"]
