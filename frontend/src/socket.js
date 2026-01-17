import { io } from "socket.io-client";

const URL = "http://localhost:8000";
const token = localStorage.getItem("token")

export const socket = io(URL, {
  autoConnect: false,
  auth: (cb) => cb({ token: token })
});
