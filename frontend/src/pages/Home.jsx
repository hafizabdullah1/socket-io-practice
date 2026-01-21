/* eslint-disable no-unused-vars */

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";

const Home = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState("");

    const currentUserId = localStorage.getItem("userId");

    const [conversations, setConversations] = useState([]); // Recent chats
    const [viewMode, setViewMode] = useState("inbox"); // "inbox" or "users"

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

        // ---> ADD THIS: Fetch Recent Conversations
        const fetchConversations = async () => {
            try {
                const { data } = await axios.get("http://localhost:8000/api/messages/conversations", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setConversations(data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchConversations();

        // 2. Connect Socket
        socket.connect();

        // 3. Listen for incoming messages
        const handlePrivateMessage = ({ content, from, fromUsername }) => {
            setMessages(prev => [...prev, {
                content,
                fromSelf: false,
                fromUsername
            }]);


            // B. Inbox List Update (Move to Top)
            setConversations(prev => {
                const updated = [...prev];
                const index = updated.findIndex(c => c._id === from);
                let conv;
                if (index !== -1) {
                    conv = updated[index];
                    updated.splice(index, 1); // Remove from old position
                } else {
                    conv = { _id: from, username: fromUsername }; // Create new
                }
                conv.lastMessage = content;
                conv.lastMessageSender = from;

                return [conv, ...updated]; // Add to top
            });
        };

        socket.on("private_message", handlePrivateMessage);

        // Cleanup on unmount
        return () => {
            socket.off("private_message", handlePrivateMessage);
            socket.disconnect();
        };
    }, [token, navigate, currentUser]);


    // Fetch Messages when a user is selected
    useEffect(() => {
        if (selectedUser) {
            axios.get(`http://localhost:8000/api/messages/${selectedUser._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => {
                    // Convert DB format to UI format
                    const formattedMessages = res.data.map(msg => ({
                        content: msg.content,
                        fromSelf: msg.sender === currentUserId,
                        fromUsername: msg.sender === currentUserId ? "You" : selectedUser.username
                    }));

                    setMessages(formattedMessages);
                })
                .catch(err => console.log(err));
        }
    }, [selectedUser, token, currentUserId]);


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


        // Inbox List Update (Move to Top)
        setConversations(prev => {
            const updated = [...prev];
            const index = updated.findIndex(c => c._id === selectedUser._id);
            let conv;
            if (index !== -1) {
                conv = updated[index];
                updated.splice(index, 1);
            } else {
                conv = { _id: selectedUser._id, username: selectedUser.username };
            }
            conv.lastMessage = messageInput;
            conv.lastMessageSender = currentUserId; // "You"

            return [conv, ...updated];
        });

        setMessageInput("");
    };

    console.log("messages:", messages);


    return (
        <>
            <h1>
                Welcome, {currentUser}!
            </h1>
            <div style={{ padding: "20px", display: "flex", gap: "20px" }}>

                {/* Left Side: Sidebar */}
                <div style={{ width: "300px", borderRight: "1px solid #ccc", paddingRight: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <h2>{viewMode === "inbox" ? "Chats" : "New Chat"}</h2>

                        {/* Toggle Button */}
                        <button onClick={() => setViewMode(viewMode === "inbox" ? "users" : "inbox")}>
                            {viewMode === "inbox" ? "+" : "←"}
                        </button>
                    </div>

                    <ul style={{ listStyle: "none", padding: 0 }}>
                        {/* INBOX VIEW */}
                        {viewMode === "inbox" && conversations.map((conv) => (
                            <li
                                key={conv._id}
                                style={{
                                    padding: "15px",
                                    borderBottom: "1px solid #eee",
                                    cursor: "pointer",
                                    background: selectedUser?._id === conv._id ? "#f0f0f0" : "transparent",
                                    color: selectedUser?._id === conv._id ? "#000000" : "white"
                                }}
                                onClick={() => {
                                    setSelectedUser({ _id: conv._id, username: conv.username });
                                }}
                            >
                                <div style={{ fontWeight: "bold" }}>{conv.username}</div>
                                <div style={{ fontSize: "0.9em", color: "#666" }}>
                                    {/* {conv.lastMessage} */}
                                    {conv.lastMessageSender === currentUserId ? "You: " : ""}{conv.lastMessage}
                                </div>
                            </li>
                        ))}

                        {/* CONTACTS VIEW (All Users) */}
                        {viewMode === "users" && users.map((user) => (
                            <li
                                key={user._id}
                                style={{
                                    padding: "10px",
                                    cursor: "pointer",
                                    display: "flex", alignItems: "center", gap: "10px"
                                }}
                                onClick={() => {
                                    setSelectedUser(user);
                                    setViewMode("inbox"); // Switch back to inbox after selecting
                                }}
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
        </>
    );
};

export default Home;







