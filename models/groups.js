const mongoose = require('mongoose');
const groupSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    profile:{
        type: String,
    },
    admin:{
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    participants:[{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }],
    description:{
        type: String,
    },
    chats:[
        {
            from: {
                type: mongoose.Schema.ObjectId,
                ref: 'User'  
            },
            type:{
                type: String,
                enum: ["text", "link", "document", "media"]
            },
            message: String,
        }
    ]
});

const Groups = new mongoose.model('Group', groupSchema);
module.exports = Groups;