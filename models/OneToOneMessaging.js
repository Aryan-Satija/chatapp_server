const mongoose = require("mongoose");

const oneToOneMessagingSchema = new mongoose.Schema({
    participants:[{
        type: mongoose.Schema.ObjectId,
        ref: "User"
    }],
    messages: [
        {
            to:{
                type: mongoose.Schema.ObjectId,
                ref: "User"
            },
            from:{
                type: mongoose.Schema.ObjectId,
                ref: "User"
            },
            type:{
                type: String,
                enum:["text", "media", "document", "link"]
            },
            created_at:{
                type: Date,
                default: Date.now()
            },
            text:{
                type: String
            },
            unread:{
                type: Boolean,
                default: true
            },
            file:{
                type: String
            }
        }
    ]
});

const OneToOneMessage = new mongoose.model("OneToOneMessage", oneToOneMessagingSchema);

module.exports = OneToOneMessage;