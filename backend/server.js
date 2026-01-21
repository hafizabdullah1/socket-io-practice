import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js"
import connectDb from "./config/db.js"
import jwt from "jsonwebtoken"
import Message from "./models/Message.js";
import messageRoutes from "./routes/messageRoutes.js"

connectDb();

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", authRoutes);
app.use("/api/messages", messageRoutes);


const io = new Server(httpServer, {
  cors: {
    // origin: "http://localhost:3000",
    origin: "*",
  },
});

// SocketIO Middleware
io.use(async (socket, next) => {

  const token = socket.handshake.auth.token;
  console.log("Token:", token);

  if (!token) {
    next(new Error("Token Not Found."))
  }

  try {
    const decoded = await jwt.verify(token, "myjwtsecret")
    socket.user = decoded;
    next();

  } catch (error) {
    next(new Error("Authentication error."))
  }
})

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.user.username);

  onlineUsers.set(socket.user.id, socket.id) // userId: userSocketId

  socket.on("private_message", ({ content, to }) => { // to -> userId

    const recipientSocketId = onlineUsers.get(to);

    try {
      if (recipientSocketId) {
        const newMessage = new Message({
          sender: socket.user.id,
          receiver: to,
          content
        })

        newMessage.save();

        socket.to(recipientSocketId).emit("private_message", { content, from: socket.user.id, fromUsername: socket.user.username });
      }
    } catch (error) {
      console.error("Error saving message in DB:", error);
    }
  })

  socket.on("disconnect", () => {
    onlineUsers.delete(socket.user.id);
    console.log(`${socket.user.username} Disconnected succesfully.`);
  });
});

app.get("/", (req, res) => {
  res.send("Api is running...");
});

httpServer.listen(8000, () => {
  console.log("Server connected successfuly.");
});
