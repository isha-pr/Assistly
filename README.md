# Assistly - Video-Assisted Customer Support Portal

Assistly is an enterprise-grade, browser-based remote support platform. It enables support agents and system administrators to launch real-time video/audio support sessions, chat, share files, and record sessions, with zero client installs required.

---

## Technical Stack
* **Frontend**: React, Vite, Socket.IO Client, Mediasoup Client, Tailwind CSS
* **Backend**: Node.js, Express, Socket.IO Server, Mediasoup SFU (Selective Forwarding Unit)
* **Database**: MongoDB Atlas

---

## Project Architecture

The application is split into two main components:
1. **/client**: The static React/Vite web application.
2. **/server**: The Express API server + Socket.IO signaling hub + Mediasoup WebRTC media server.

### Traffic Flow (Production / Secure Tunnel Mode)
* **REST APIs & Signaling**: Sent from the client browser to the backend via a secure HTTPS/WSS proxy (e.g. Nginx or Cloudflare Tunnel).
* **WebRTC Media Streams (Audio/Video)**: Routed directly from the browser to the Mediasoup worker processes on the EC2 instance using UDP/TCP ports `20000 - 20100` (bypassing the proxy/tunnel for ultra-low latency).

---

## Quick Start (Local Development)

### 1. Database Setup
Ensure you have a MongoDB instance running, or configure a MongoDB Atlas connection string in your server environment configuration.

### 2. Backend Server Setup
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your environment. Create a `.env` file in `/server` (if not already present):
   ```env
   PORT=3001
   JWT_SECRET=assistly_super_secret_jwt_key
   MONGODB_URI=your_mongodb_connection_string
   CLIENT_URL=http://localhost:5173
   MEDIASOUP_LISTEN_IP=127.0.0.1
   ```
4. Start the server:
   ```bash
   npm start
   ```
   *The server will listen on port `3001`.*

### 3. Frontend Client Setup
1. Navigate to the client folder:
   ```bash
   cd ../client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *The client will start locally on `http://localhost:5173`.*

---

## Production & Secure Demo Deployment (Cloudflare Tunnel)

To run the application securely over HTTPS (bypassing Mixed Content warnings when the frontend is deployed on HTTPS environments like Vercel):

### 1. Run the Cloudflare Tunnel on EC2
Create a secure tunnel from your AWS EC2 instance:
```bash
# Install cloudflared (Ubuntu)
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Run the tunnel on your Node backend port
cloudflared tunnel --url http://localhost:3001
```
Copy the secure HTTPS URL provided in the output (e.g., `https://your-subdomain.trycloudflare.com`).

### 2. Update Environment Configurations
* **Frontend**: Open `client/src/config.js` and set the `API_BASE_URL` to your Cloudflare Tunnel URL:
  ```javascript
  export const API_BASE_URL = 'https://your-subdomain.trycloudflare.com';
  ```
* **Backend**: Update `server/.env` to configure your deployed Vercel URL and Mediasoup settings:
  ```env
  CLIENT_URL=https://your-frontend.vercel.app
  MEDIASOUP_LISTEN_IP=0.0.0.0
  MEDIASOUP_ANNOUNCED_IP=your_ec2_public_ip
  ```

### 3. AWS Security Group Settings
Ensure the following inbound ports are open on AWS:
* **TCP & UDP Ports 20000 - 20100** (Mediasoup WebRTC media streams)

### 4. Deploy Frontend
Push the updated frontend codebase to your repository, and trigger a build/deployment on Vercel.

---

## Demo Authentication Credentials

Use the following mock accounts to log in and inspect the dashboard interfaces:

* **Support Agent Account**:
  * **Email**: `agent@assistly.com`
  * **Password**: `password123`

* **System Admin Account**:
  * **Email**: `admin@assistly.com`
  * **Password**: `password123`
