const express = require("express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const socket = require("socket.io");
const cors = require("cors");
require("dotenv").config();

// User and Room Management (Controllers)
const { registerUser, loginUser } = require("./userController"); // User management (optional)
const { createRoom, listRooms } = require("./roomController"); // Room management (optional)

const app = express();


// Enable CORS (Cross-Origin Resource Sharing)
app.use(cors());

// SSL Configuration (Optional)
const sslOptions =
  process.env.SSL_ENABLED === "true"
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
    origin: "*", // Change this to your client origin in production
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
    rooms[roomID].push(socket.id);
    
    const otherUser = rooms[roomID].find((id) => id !== socket.id);
    if (otherUser) {
      socket.emit("other user", otherUser); // Notify the current user about the other user
      socket.to(otherUser).emit("user joined", socket.id); // Notify the other user about the new user
    }
});
  });

  // Handle WebRTC Offer
  socket.on("offer", (payload) => {
    console.log(`Offer from ${socket.id} to ${payload.target}`);
    if (rooms[payload.roomID] && rooms[payload.roomID].includes(payload.target)) {
      io.to(payload.target).emit("offer", {
        sender: socket.id,
        sdp: payload.sdp,
      });
    } else {
      console.error(`Target ${payload.target} not found in room ${payload.roomID}`);
    }
  });

  // Handle WebRTC Answer
  socket.on("answer", (payload) => {
    console.log(`Answer from ${socket.id} to ${payload.target}`);
    if (rooms[payload.roomID] && rooms[payload.roomID].includes(payload.target)) {
      io.to(payload.target).emit("answer", {
        sender: socket.id,
        sdp: payload.sdp,
      });
    } else {
      console.error(`Target ${payload.target} not found in room ${payload.roomID}`);
    }
  });

  // Handle ICE Candidate
  socket.on("ice-candidate", (payload) => {
    console.log(`ICE candidate from ${socket.id} to ${payload.target}`);
    if (rooms[payload.roomID] && rooms[payload.roomID].includes(payload.target)) {
      io.to(payload.target).emit("ice-candidate", {
        sender: socket.id,
        candidate: payload.candidate,
      });
    } else {
      console.error(`Target ${payload.target} not found in room ${payload.roomID}`);
    }
  });

  // Handle Disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  
    for (const roomID in rooms) {
      rooms[roomID] = rooms[roomID].filter((id) => id !== socket.id);
      if (rooms[roomID].length === 0) {
        delete rooms[roomID];
      }
    }
  });

// Start the server
const port = process.env.PORT || 9000;

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
