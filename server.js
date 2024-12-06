const express = require("express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const socket = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const { registerUser, loginUser } = require("./userController");
const { createRoom, listRooms } = require("./roomController");

const app = express();

// Enable CORS (Cross-Origin Resource Sharing)
app.use(cors());

// SSL Configuration (Optional)
const sslOptions = process.env.SSL_ENABLED === "true"
  ? {
      key: fs.readFileSync("privatekey.pem"),
      cert: fs.readFileSync("certificate.pem"),
    }
  : {};

// Create HTTP or HTTPS server based on SSL
const server = sslOptions.key && sslOptions.cert
  ? https.createServer(sslOptions, app)
  : http.createServer(app);

// Initialize Socket.IO
const io = socket(server, {
  cors: {
    origin: "*", // Update with specific client origin in production
    methods: ["GET", "POST"],
  },
});

// Middleware to parse JSON requests
app.use(express.json());

// API Routes (Optional)
app.post(["/register", "/api/register"], registerUser);
app.post(["/login", "/api/login"], loginUser);
app.post("/create-room", createRoom);
app.get("/rooms", listRooms);

// In-Memory Room Management (Rooms are stored temporarily)
const rooms = {};

// Socket.IO Events
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Join Room Event
  socket.on("join room", (roomID) => {
    console.log(`${socket.id} joining room: ${roomID}`);
    
    if (!rooms[roomID]) {
        rooms[roomID] = [];
    }
    rooms[roomID].push(socket.id); // Add socket to room
    
    // Notify other users in the room (if any)
    const otherUser = rooms[roomID].find((id) => id !== socket.id);
    if (otherUser) {
        socket.emit("other user", otherUser);
        socket.to(otherUser).emit("user joined", socket.id);
    }else {
      console.log("No other user in the room.");
  }
});

  // Handle WebRTC Offer
  socket.on('offer', (payload) => {
    if (!payload.roomID) {
        console.error(`No room ID provided in offer from ${socket.id}`);
        return;
    }
    console.log(`Offer for room ${payload.roomID}`);
    // Process offer
});

socket.on('answer', (payload) => {
    if (!payload.roomID) {
        console.error(`No room ID provided in answer from ${socket.id}`);
        return;
    }
    console.log(`Answer for room ${payload.roomID}`);
    // Process answer
});

socket.on('ice-candidate', (payload) => {
    if (!payload.roomID) {
        console.error(`No room ID provided for ICE candidate from ${socket.id}`);
        return;
    }
    console.log(`ICE candidate for room ${payload.roomID}`);
    // Process ICE candidate
});

  // Handle Disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

  });
});

// Start the server
const port = process.env.PORT || 9000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
