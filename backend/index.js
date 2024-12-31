require('dotenv').config();

const config = require('./config.json');
const mongoose = require('mongoose');

mongoose.connect(config.connectionString);


const User = require('./models/user.model');
const Note = require('./models/note.model');

const express = require('express');
const cors = require('cors');
const app = express();

const jwt = require('jsonwebtoken');
const { authenticateToken } = require('./utilities');

app.use(express.json());


app.use(cors({ origin: '*', }));

app.get('/', (req, res) => {
    res.json({ data: 'Hello World' });
});

app.post("/create-account", async (req, res) => {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const isUser = await User.findOne({ email: email });

    if (isUser) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({
        fullName,
        email,
        password
    });

    await user.save();

    const accessToken = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "30m" });

    return res.json({
        error: false,
        user,
        accessToken,
        message: 'User created successfully'
    });
});

app.post("/login", async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const userInfo = await User.findOne({ email: email });

    if (!userInfo) {
        return res.status(400).json({ message: 'User does not exist' });
    }

    if (userInfo.email == email && userInfo.password == password) {
        const accessToken = jwt.sign({ user: userInfo }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "30m" });

        return res.json({
            error: false,
            user: userInfo,
            accessToken,
            message: 'User logged in successfully'
        });
    } else {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

});

app.get("/get-user", authenticateToken, async (req, res) => {
    const { user } = req.user;

    const isUser = await User.findOne({ _id: user._id });

    if (!isUser) {
        return res.status(400).json({ message: 'User does not exist' });
    }

    return res.json({
        error: false,
        user: isUser,
        message: 'User fetched successfully'
    });
});

app.post("/add-note", authenticateToken, async (req, res) => {
    const { title, content, tags, isPinned } = req.body;
    const { user } = req.user;

    if (!title || !content) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!content) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const note = new Note({
            title,
            content,
            tags,
            isPinned,
            userId: user._id
        });

        await note.save();

        return res.json({
            error: false,
            note,
            message: 'Note created successfully'
        });

    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error' });
    }



});

app.put("/edit-note/:noteId", authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { title, content, tags, isPinned } = req.body;
    const { user } = req.user;

    if (!title || !content) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const note = await Note.findOne({ _id: noteId, userId: user._id });

        if (!note) {
            return res.status(400).json({ message: 'Note does not exist' });
        }

        if (title) {
            note.title = title;
        }

        if (content) {
            note.content = content;
        }

        if (tags) {
            note.tags = tags;
        }

        if (isPinned) {
            note.isPinned = isPinned;
        }

        await note.save();

        return res.json({
            error: false,
            note,
            message: 'Note updated successfully'
        });
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.get("/get-all-notes", authenticateToken, async (req, res) => {
    const { user } = req.user;

    try {
        const notes = await Note.find({ userId: user._id });

        return res.json({
            error: false,
            notes,
            message: 'Notes fetched successfully'
        });
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.delete("/delete-note/:noteId", authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { user } = req.user;

    try {
        const note = await Note.findOne({ _id: noteId, userId: user._id });

        if (!note) {
            return res.status(400).json({ message: 'Note does not exist' });
        }

        await Note.deleteOne({ _id: noteId, userId: user._id });

        return res.json({
            error: false,
            message: 'Note deleted successfully'
        });

    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error' });
    }

});


app.listen(8000);

module.exports = app;