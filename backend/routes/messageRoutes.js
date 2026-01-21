import express from "express";
import Message from "../models/Message.js";
import protect from "../middleware/checkToken.js"
import mongoose from "mongoose";

const router = express.Router();


// @desc    Get all conversations (last message from each user)
// @route   GET /api/messages/conversations
// @access  Private
router.get("/conversations", protect, async (req, res) => {
    try {
        const myId = req.user.id;

        // Complex aggregation to find unique conversations
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender: new mongoose.Types.ObjectId(myId) },
                        { receiver: new mongoose.Types.ObjectId(myId) }
                    ]
                }
            },
            {
                $sort: { createdAt: -1 } // Sort by newest first
            },
            {
                $group: {
                    _id: {
                        $cond: {
                            if: { $eq: ["$sender", new mongoose.Types.ObjectId(myId)] },
                            then: "$receiver",
                            else: "$sender"
                        }
                    },
                    lastMessage: { $first: "$content" },
                    lastMessageSender: { $first: "$sender" }, // <--- Add this
                    timestamp: { $first: "$createdAt" }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            {
                $unwind: "$userDetails"
            },
            {
                $project: {
                    _id: 1,
                    username: "$userDetails.username",
                    lastMessage: 1,
                    lastMessageSender: 1, // <--- Add this
                    timestamp: 1
                }
            }
        ]);

        res.json(conversations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// @desc    Get chat history with a specific user
// @route   GET /api/messages/:userId
// @access  Private

router.get("/:userId", protect, async (req, res) => {
    try {
        const myId = req.user.id;
        const otherUserId = req.params.userId;

        // Find messages where (sender is Me AND receiver is Other) OR (sender is Other AND receiver is Me)
        const messages = await Message.find({
            $or: [
                { sender: myId, receiver: otherUserId },
                { sender: otherUserId, receiver: myId },
            ],
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
})


export default router;
