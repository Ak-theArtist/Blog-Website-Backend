require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const UserModel = require('./models/Users');
const Posts = require('./models/Posts');
const PostModel = require('./models/Posts');
const PORT = process.env.PORT || 3002;
const jwtSecretKey = process.env.JWT_SECRET;

const app = express();
app.use(express.json());
app.use(cors({
    origin: 'https://blog-website-frontend-paa1.onrender.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
    credentials: true, 
    allowedHeaders: ['Content-Type', 'Authorization'], 
    exposedHeaders: ['Authorization'], 
}));

app.options('*', cors());

app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected successfully"))
    .catch(err => console.error("MongoDB connection error:", err));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'Public/Images');
    },
    filename: (req, file, cb) => {
        cb(null, 'file.fieldname' + "_" + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage
});

const verifyUser = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.json('The token is missing');
    } else {
        jwt.verify(token, jwtSecretKey, (err, decoded) => {
            if (err) {
                return res.json('The token is wrong');
            } else {
                req.email = decoded.email;
                req.name = decoded.name;
                next();
            }
        });
    }
};

app.get('/', verifyUser, (req, res) => {
    return res.json({ email: req.email, name: req.name });
});

app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    bcrypt.hash(password, 10)
        .then(hash => {
            UserModel.create({ name, email, password: hash })
                .then(user => res.json(user))
                .catch(err => res.json(err));
        }).catch(err => console.log(err.message));
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    UserModel.findOne({ email })
        .then(user => {
            if (user) {
                bcrypt.compare(password, user.password, (err, response) => {
                    if (response) {
                        const token = jwt.sign({ email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
                        return res.json({ token });
                    } else {
                        return res.json('Password is incorrect');
                    }
                });
            } else {
                res.json('User not exist');
            }
        });
});

app.post('/create', verifyUser, upload.single('file'), (req, res) => {
    const { title, description } = req.body;
    const userEmail = req.email;
    const userName = req.name;

    Posts.create({
        title,
        description,
        file: req.file.filename,
        email: userEmail,
        name: userName
    })
        .then(result => res.json('Success'))
        .catch(err => res.json(err));
});

app.get('/getposts', (req, res) => {
    Posts.find()
        .sort({ createdAt: -1 })
        .then(posts => res.json(posts))
        .catch(err => res.status(400).json('Error: ' + err));
});

app.get('/getpostbyid/:id', (req, res) => {
    const id = req.params.id;
    Posts.findById({ _id: id })
        .then(post => res.json(post))
        .catch(err => console.log(err));
});

app.put('/editpost/:id', upload.single('file'), (req, res) => {
    const id = req.params.id;
    const updateData = {
        title: req.body.title,
        description: req.body.description
    };

    if (req.file) {
        updateData.file = req.file.filename;
    }

    PostModel.findByIdAndUpdate(id, updateData, { new: true })
        .then(result => res.json('Success'))
        .catch(err => res.json(err));
});

app.get('/myposts', verifyUser, (req, res) => {
    const userEmail = req.email;

    Posts.find({ email: userEmail })
        .then(posts => {
            res.json(posts);
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});

app.delete('/deletepost/:id', (req, res) => {
    Posts.findByIdAndDelete({ _id: req.params.id })
        .then(result => res.json('Success'))
        .catch(err => res.json(err));
});

// API For Admin 
app.get('/getAllposts', (req, res) => {
    Posts.find()
        .then(posts => res.json(posts))
        .catch(err => res.json(err));
});

app.get('/getAllusers', (req, res) => {
    UserModel.find()
        .then(posts => res.json(posts))
        .catch(err => res.json(err));
});

app.delete('/deleteUser/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await UserModel.findByIdAndDelete(userId);
        await PostModel.deleteMany({ email: user.email });

        return res.status(200).json({ message: 'User and associated posts deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.get('/logout', (req, res) => {
    return res.json('Success');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log("MongoDB is Connected");
});
