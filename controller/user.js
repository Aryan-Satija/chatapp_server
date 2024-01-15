const User = require("../models/user.js");
const { filterData } = require("../utils/utils.js");
const FriendRequest = require("../models/friendRequest.js");
const { uploadImage } = require("../utils/imageUploader.js");
require("dotenv").config()
exports.updateProfile = async(req, res)=>{
    try{
        const {client} = req.body;
        const filteredBody = filterData(client, "firstName", "lastName", "about");
        const updated_user = await User.findByIdAndUpdate({_id : req.user._id}, filteredBody, {new: true});
        res.status(200).json({
            success: true,
            user: updated_user,
            message: "Records Updated Successfully"
        })
    } catch(err){
        res.status(500).json({
            success: false,
            message: err.message
        })
    }
}
exports.updateDisplayPicture = async(req, res)=>{
    try{
        console.log(req.files);
        const dp = req.files.displayPicture;
        const userId = req.user._id;
        const image = await uploadImage(dp, process.env.FOLDER_NAME, 1000, 1000);
        const updated_user = await User.findByIdAndUpdate({_id: userId}, {avatar: image.secure_url}, {new: true});
        return res.status(200).json({
            success: true,
            user: updated_user,
        })
    } catch(err){
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}
exports.getUsers = async(req, res, next)=>{
    const all_users = await User.find({
        verified: true,
    }).select("firstName lastName _id");

    const this_user = req.user;

    const remaining_users = all_users.filter((user)=>{
        return (!this_user.friends.includes(user._id) && user._id.toString() !== req.user._id.toString())
    })

    res.status(200).json({
        success: true,
        data: remaining_users,
        message: "Operation successfully"
    })
}

exports.getFriendRequests = async(req, res, next)=>{
    try{
        const requests = await FriendRequest.find({recipient: req.user._id}).populate("sender", "firstName lastName _id");
        return res.status(200).json({
            status: "success",
            data: requests,
            message: "Friends requests found successfully"
        })
    } catch(err){
        return res.status(404).json({
            status: "fail",
            message: err.message
        })
    }
}

exports.getFriends = async(req, res, next)=>{
    try{
        const this_user = await User.findById(req.user._id).populate("friends", "_id firstName lastName avatar");
        return res.status(200).json({
            success: true,
            data: this_user.friends,
            message: "friends found successfully"
        })
    } catch(err){
        return res.status(404).json({
            success: false,
            error: err.message
        })
    }
}   
