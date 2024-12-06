const express = require("express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const socketIo = require("socket.io");
const cors = require("cors"); // Only define cors once
require("dotenv").config();

const { registerUser, loginUser } = require("./userController");
const { createRoom, listRooms } = require("./roomController");

const app = express();

// Enable CORS (Cross-Origin Resource Sharing)
app.use(cors({
  origin: "*", // Allow all origins or specify the front-end origin like "http://localhost:8081"
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
    origin: "http://localhost:8081", // Replace with your front-end URL
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

  socket.on('join room', (roomID) => {
    socket.join(roomID);
    console.log(`Client ${socket.id} joined room ${roomID}`);
  });

  socket.on('offer', (data) => {
    const { target, roomID, signalData } = data;
    socket.to(target).emit('offer', { signalData, roomID, sender: socket.id });
  });

  socket.on('answer', (data) => {
    const { target, signalData } = data;
    socket.to(target).emit('answer', { signalData, roomID: data.roomID });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.target).emit('ice-candidate', data);
  });

  // Handle Disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    // Remove the user from rooms
    for (const roomID in rooms) {
      rooms[roomID] = rooms[roomID].filter((id) => id !== socket.id);

      // Optionally log if a room is now empty
      if (rooms[roomID].length === 0) {
        console.log(`Room ${roomID} is now empty.`);
      }
    }
  });
});

// Start the server
const port = process.env.PORT || 9000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
