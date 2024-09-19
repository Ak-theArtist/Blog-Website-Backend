const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    name: String,
    title: String,
    description: String,
    file: String,
    email: String,
    createdAt: { type: Date, default: Date.now }
});

const PostModel = mongoose.model('post', PostSchema);

module.exports = PostModel;
