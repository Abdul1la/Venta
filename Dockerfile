# Stage 1: Build the React Application
FROM node:20-alpine as build

# Set working directory to /app
WORKDIR /app

# Copy package files from the my-react-app subdirectory
COPY my-react-app/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY my-react-app/ .

# Build the application
RUN npm run build

# Stage 2: Serve the Application with Nginx
FROM nginx:alpine

# Copy the built files from the build stage to Nginx's html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
