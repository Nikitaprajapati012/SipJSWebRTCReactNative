# Mock SIP Signaling Server

This is a lightweight Node.js and Socket.IO signaling server that simulates a SIP proxy and registrar. It is designed to act as a bridge for SIP.js clients to perform complete audio call setup without needing a real SIP server or Asterisk/Freepbx deployments.

## Tech Stack
- **Node.js**: Backend execution environment
- **Express**: HTTP framework for REST APIs
- **Socket.IO**: WebSocket signaling transport
- **CORS**: Handles cross-origin requests from the React Native application

## Directory Structure
```
Server/
├── package.json       # Backend configuration & scripts
├── server.js          # Main server code (Express + Socket.io)
├── .env.example       # Example environment variables
└── README.md          # Documentation (This file)
```

## How It Works
1. **Authentication**: Users submit mock login credentials via HTTP POST to `/api/auth/login`. A mock token is generated and returned to the client.
2. **WebSockets connection**: The client connects to Socket.IO passing their auth token in the handshake.
3. **SIP Registration**: The client sends a simulated SIP `REGISTER` request. The server parses the message, updates the user state to `ONLINE`, broadcasts the new user list, and responds with a SIP `200 OK`.
4. **Call Setup (SDP Exchange)**:
   - When Alice calls Bob, her client sends an `INVITE` with an SDP offer.
   - The server acknowledges it with `100 Trying` and `180 Ringing` sent back to Alice.
   - The server routes the `INVITE` to Bob.
   - Bob accepts the call, generating a `200 OK` response with his SDP answer, which the server routes back to Alice.
5. **Call Release**: Standard `BYE` or `CANCEL` signals are routed between users, resetting their presence status to `ONLINE` on teardown.

## REST API Endpoints

### 1. User Login
- **Endpoint**: `/api/auth/login`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "username": "alice",
    "password": "123"
  }
  ```
- **Response (Success)**:
  ```json
  {
    "success": true,
    "token": "mock-jwt-token-alice-1719912345",
    "username": "alice"
  }
  ```

### 2. Get Users List
- **Endpoint**: `/api/users`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "users": [
      { "username": "alice", "status": "ONLINE" },
      { "username": "bob", "status": "IN CALL" }
    ]
  }
  ```

## Installation & Running

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Start Dev Server** (requires nodemon global/local installation):
   ```bash
   npm run dev
   ```
3. **Start Production Server**:
   ```bash
   npm start
   ```
   The server runs on port `3000` by default.
