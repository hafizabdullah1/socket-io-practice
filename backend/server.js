import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  socket.on("connect", () => {
    console.log("Connected succesfully.");
  });

  socket.on("disconnect", () => {
    console.log("Disconnected succesfully.");
  });
});

app.get("/", (req, res) => {
  res.send("Api is running...");
});

app.listen(8000, () => {
  console.log("Server connected successfuly.");
});
