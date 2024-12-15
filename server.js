const express = require("express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const socketIo = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const { registerUser, loginUser } = require("./userController");
const { createRoom, listRooms } = require("./roomController");

const app = express();

// Enable CORS (Cross-Origin Resource Sharing)
app.use(cors({
  origin: "*",  // Allow all origins or specify the front-end origin like "http://localhost:8081"
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

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

// Initialize Socket.IO with the created server
const io = socketIo(server, {
  cors: {
    origin: "*",  // Allow all origins for now
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware to parse JSON requests
app.use(express.json());

// API Routes
app.post(["/register", "/api/register"], registerUser);
app.post(["/login", "/api/login"], loginUser);
app.post("/create-room", createRoom);
app.get("/rooms", listRooms);

// In-Memory Room Management (Rooms are stored temporarily)
const rooms = {};

// Socket.IO Events
io.on('connection', (socket) => {
  console.log("New client connected:", socket.id);

  // Emit the user ID to the client
  socket.emit('user id', socket.id);

  // Join room event
  socket.on('join room', (roomID) => {
    socket.join(roomID);
    console.log(`Client ${socket.id} joined room ${roomID}`);

    // If the room doesn't exist in memory, create it
    if (!rooms[roomID]) {
      rooms[roomID] = [];
    }

    // Add the client to the room
    rooms[roomID].push(socket.id);

    // Notify existing clients in the room about the new user
    if (rooms[roomID].length > 1) {
      rooms[roomID].forEach(clientID => {
        if (clientID !== socket.id) {
          io.to(clientID).emit('other user', socket.id);  // Existing user notified
          socket.emit('other user', clientID);  // New user notified
        }
      });
    }
  });
  

  // Handle 'message' event from a client
  socket.on('message', (messageData) => {
    console.log(`[DEBUG] Message from ${messageData.sender}: ${messageData.text}`);
    // Broadcast message to all clients in the same room
    socket.to(messageData.roomID).emit('message', {
      sender: messageData.sender || 'Anonymous', // Fallback for undefined sender
      text: messageData.text,
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log("Client disconnected:", socket.id);

    // Remove the client from the room
    for (const roomID in rooms) {
      const room = rooms[roomID];
      const index = room.indexOf(socket.id);

      if (index !== -1) {
        room.splice(index, 1);  // Remove client from the room

        // Notify other clients in the room about the disconnection
        if (room.length > 0) {
          room.forEach(clientID => {
            io.to(clientID).emit('user left', socket.id);  // Notify other clients
          });
        }

        // If the room is empty, remove it from memory
        if (room.length === 0) {
          delete rooms[roomID];
        }
      }
    }
  });
});

// Start the server
const port = process.env.PORT || 9000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
