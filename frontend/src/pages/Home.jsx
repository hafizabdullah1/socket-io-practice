/* eslint-disable no-unused-vars */

import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";

const Home = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState("");

    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const currentUser = localStorage.getItem("username");

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }

        // 1. Fetch Users
        const fetchUsers = async () => {
            try {
                const { data } = await axios.get("http://localhost:8000/api/users");
                // Filter out self
                setUsers(data.filter(u => u.username !== currentUser));
            } catch (error) {
                console.error(error);
            }
        };

        fetchUsers();

        // 2. Connect Socket
        socket.connect();

        // 3. Listen for incoming messages
        const handlePrivateMessage = ({ content, fromUsername }) => {
            setMessages(prev => [...prev, {
                content,
                fromSelf: false,
                fromUsername
            }]);
        };

        socket.on("private_message", handlePrivateMessage);

        // Cleanup on unmount
        return () => {
            socket.off("private_message", handlePrivateMessage);
            socket.disconnect();
        };
    }, [token, navigate, currentUser]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        socket.disconnect();
        navigate("/login");
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!selectedUser || !messageInput.trim()) return;

        // Emit message to server
        socket.emit("private_message", {
            content: messageInput,
            to: selectedUser._id
        });

        // Add to local state (Optimistic UI)
        setMessages(prev => [...prev, {
            content: messageInput,
            fromSelf: true,
            username: currentUser
        }]);

        setMessageInput("");
    };

    return (
        <div style={{ padding: "20px", display: "flex", gap: "20px" }}>
            {/* Left Side: User List */}
            <div style={{ width: "300px", borderRight: "1px solid #ccc", paddingRight: "20px" }}>
                <h1>Welcome, {currentUser}</h1>
                <button onClick={handleLogout}>Logout</button>
                <h3>All Users</h3>
                <ul style={{ listStyle: "none", padding: 0 }}>
                    {users.map((user) => (
                        <li
                            key={user._id}
                            style={{
                                padding: "10px",
                                cursor: "pointer",
                                background: selectedUser?._id === user._id ? "#f0f0f0" : "transparent",
                                color: selectedUser?._id === user._id ? "black" : "white"
                            }}
                            onClick={() => setSelectedUser(user)}
                        >
                            {user.username}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Right Side: Chat Window */}
            <div style={{ flex: 1 }}>
                {selectedUser ? (
                    <>
                        <h3>Chat with {selectedUser.username}</h3>
                        <div style={{
                            height: "300px",
                            border: "1px solid #ccc",
                            marginBottom: "10px",
                            padding: "10px",
                            overflowY: "scroll",
                            display: "flex",
                            flexDirection: "column"
                        }}>
                            {messages.map((msg, index) => (
                                <div key={index} style={{
                                    alignSelf: msg.fromSelf ? "flex-end" : "flex-start",
                                    background: msg.fromSelf ? "#007bff" : "#e9ecef",
                                    color: msg.fromSelf ? "white" : "black",
                                    padding: "8px 12px",
                                    borderRadius: "10px",
                                    marginBottom: "5px",
                                    maxWidth: "70%"
                                }}>
                                    <small style={{ fontSize: "0.8em", opacity: 0.8, display: "block" }}>
                                        {msg.fromSelf ? "You" : msg.fromUsername}
                                    </small>
                                    {msg.content}
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "10px" }}>
                            <input
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                placeholder="Type a message..."
                                style={{ flex: 1, padding: "10px" }}
                            />
                            <button type="submit">Send</button>
                        </form>
                    </>
                ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                        <p>Select a user to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;







