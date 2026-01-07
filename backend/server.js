import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";

const app = express();
const httpServer = createServer(app);

app.use(cors());

const io = new Server(httpServer, {
  cors: {
    // origin: "http://localhost:3000",
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  socket.on("connect", () => {
    console.log("Connected succesfully.");
  });

  socket.on("create-something", (value) => {
    console.log("Something:", value);
    io.emit("foo", value);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected succesfully.");
  });
});

app.get("/", (req, res) => {
  res.send("Api is running...");
});

httpServer.listen(8000, () => {
  console.log("Server connected successfuly.");
});
