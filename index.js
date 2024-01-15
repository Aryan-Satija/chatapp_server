const express = require("express"); 
const morgan = require("morgan");
const routes = require("./Routes/index.js");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const sanitize = require("express-mongo-sanitize");
const xss = require('xss');
const cookieParser = require("cookie-parser");
const cors = require("cors");
const database = require("./config/database.js");
const socketIo = require("socket.io");
const fileUpload = require("express-fileupload");
require("dotenv").config();
const app = express();
const User = require("./models/user.js");
const FriendRequest = require("./models/friendRequest.js");
const OneToOneMessage = require("./models/OneToOneMessaging.js")
const Groups = require('./models/groups.js')
const http = require("http");
const server = http.createServer(app);
const {cloudConnect} = require("./config/cloudinary.js");
const io = socketIo(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "PUT", "POST", "DELETE", "PATCH"]
    }
})

const limiter = rateLimit({
    max: 3000,
    windowMs: 60*60*1000,
    message: 'Too many requests from this IP'
})

database.DBconnect();
cloudConnect()
app.use(
    cors({
        origin :"*",
        method:["PUT", "GET", "POST", "PATCH", "DELETE"],
        credentials: true
    })
)

app.use(
	fileUpload({
		useTempFiles:true,
		tempFileDir:"/tmp",
	})
);

app.use("tawk", limiter);

if(process.env.NODE_ENV === "development"){
    app.use(morgan("dev"));
}

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended:true}));

app.use(helmet());
app.use(sanitize());
// app.use(xss());

app.use("/v1", routes);

const PORT = process.env.PORT || 8000; 

server.listen(PORT, ()=>{
    console.log(`APP IS RUNNING AT ${PORT}`)
})

io.on("connection", async(socket)=>{
    const user_id = socket.handshake.query["user_id"];
    const socket_id = socket.id;
    console.log(`user connected ${socket_id}`);
    if(Boolean(user_id)){
        await User.findByIdAndUpdate(user_id, {socket_id, status:"online"});
    }

    if(socket_id){
        socket.on("friend_request", async(data)=>{
            const request = await FriendRequest.find({sender: data.from, recipient: data.to});
            if(request.length === 0){
                const to_user = await User.findById(data.to);
                const from_user = await User.findById(data.from);
        
                await FriendRequest.create({
                    sender: data.from,
                    recipient: data.to
                })
        
                io.to(to_user.socket_id).emit("new_friend_request", {   
                    message: "New Friend Request Received"
                });
        
                io.to(from_user.socket_id).emit("request_sent", {
                    message: "new friend request sent"
                })
            }
        })
    
        socket.on("accept_request", async(data)=>{
            const request_doc = await FriendRequest.findById(data.request_id);
            if(request_doc){
                const sender = await User.findById(request_doc.sender);
                const receiver = await User.findById(request_doc.recipient);
        
                
                sender.friends.push(request_doc.recipient);
                receiver.friends.push(request_doc.sender);
        
                await receiver.save({new: true, validateModifiedOnly: true});
                await sender.save({new: true, validateModifiedOnly: true});
        
                await FriendRequest.findByIdAndDelete(request_doc._id);
        
                io.to(sender.socket_id).emit("request_accepted", {
                    message: "Friend Request Accepted"
                })
        
                io.to(receiver.socket_id).emit("request_accepted", {
                    message: "Friend Request Accepted"
                })
            }
        })
    
        socket.on("user_messages", async({user_id}, callback)=>{
            const chats = await OneToOneMessage.find({
                    participants: { $in: [user_id] }
            }).populate("participants", "firstName lastName _id email status");
            callback(chats);
        })
        
        socket.on("start_conversation", async(data)=>{
            const {to, from} = data;
            const existing_chat = await OneToOneMessage.find({participants:{
                $size:2,
                $all: [to, from]
            }}).populate("participants", "firstName lastName _id email status");
    
            if(existing_chat.length === 0){
                let new_chat = await OneToOneMessage.create({
                    participants: [to, from]
                });
                
                new_chat = await OneToOneMessage.findById(new_chat._id).populate("participants", "firstName lastName _id email status");
    
                socket.emit("start_chat", new_chat);
            }
            else{
                console.log(existing_chat[0]);
                socket.emit("start_chat", existing_chat[0]);
            }
    
        })
        
        socket.on("get_messages", async (data, callback) => {
            try{
                const messages  = await OneToOneMessage.findById(
                    data.room_id
                ).select("messages");
                callback(messages.messages);
            }catch (error) {
              console.log(error);
            }
        });
        
        socket.on("text_message", async (data) => {
            const { message, conversation_id, from, to, type } = data;
            const to_user = await User.findById(to);
            const from_user = await User.findById(from);
    
            // message => {to, from, type, created_at, text, file}
    
            const new_message = {
              to: to,
              from: from,
              type: type,
              created_at: Date.now(),
              text: message,
            };
        
            // fetch OneToOneMessage Doc & push a new message to existing conversation
            const chat = await OneToOneMessage.findById(conversation_id);
            chat.messages.push(new_message);
            // save to db`
            const updated_chat = await chat.save({ new: true, validateModifiedOnly: true });
            // emit incoming_message -> to user
        
            io.to(to_user?.socket_id).emit("new_message", {
              conversation_id,
              message: new_message,
              chat: updated_chat
            });
        
            // emit outgoing_message -> from user
            io.to(from_user?.socket_id).emit("new_message", {
              conversation_id,
              message: new_message,
              chat: updated_chat
            });
        });
        socket.on("group_text_message", async(data)=>{
            const {message, conversation_id, from, to, type} = data;
            const chatDoc = {
                from,
                type,
                message
            }
            const group = await Groups.findById(conversation_id);            
            group.chats.push(chatDoc);
            const fromUser = await User.findById(from);
            const updated_group = await group.save({new: true, validateModifiedOnly: true});
            to.forEach(async(user) => {
                console.log(user);
                const userDoc = await User.findById(user._id);
                if(userDoc.socket_id){
                    io.to(userDoc.socket_id).emit("new_group_message", {
                        from: fromUser,
                        groupChatDoc: updated_group,
                    }) 
                }
            });

        })
        socket.on('get_groups', async(data, callback)=>{
            const {user_id} = data;
            const groups = await Groups.find({
                participants:{
                    $in: [user_id]
                }
            }).populate("participants", "firstName lastName avatar")
            callback(groups);
        })
        socket.on('get_group_messages', async(data, callback)=>{
            const {group_id} = data;
            if(group_id){
                const group = await Groups.find({_id: group_id}).populate({
                    path: "chats.from",
                    select: "firstName lastName avatar"
                });
                callback(group[0]?.chats);
            }
        })
        socket.on("end", async(data)=>{
            if(data && data.user_id){
                await User.findByIdAndUpdate(data.user_id, {status: "offline"});
            }
            console.log("CLOSING CONNECTION");
            socket.disconnect(0);
        })
    }
});