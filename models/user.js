const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require('crypto');
const userSchema = new mongoose.Schema({
    firstName:{
        type: String,
        required: [true, "Name is required"]
    }, 
    lastName:{
        type: String
    },
    about:{
        type: String
    },
    avatar:{
        type: String
    },
    email:{
        type: String,
        required: [true, "Email is required"]
    },
    friends:[{
        type: mongoose.Schema.ObjectId,
        ref: "User"
    }],
    password:{
        type: String,
        required: [true, "Password is required"]
    },
    passwordChangedAt:{
        type: Date
    },
    passwordResetToken:{
        type: String
    },
    passwordResetExpires:{
        type: Date
    },
    verified:{
        type: Boolean,
        default: false
    },
    status:{
        type: String,
        enum: ["online", "offline"]
    },
    otp:{
        type: Number 
    },
    socket_id:{
        type: String
    },
    otpExpiry:{
        type: Date
    }
});
userSchema.pre("save", async function(next){
    // if(this.isModified("otp")){
    //     this.otp = await bcrypt.hash(this.otp, 12);
    // }
    // if(this.isModified("password")){
    //     this.password = await bcrypt.hash(this.password, 12);
    // }
})
userSchema.methods.isCorrectPassword = async(candidatePassword, actualPassword) => {
    return await bcrypt.compare(candidatePassword, actualPassword); 
}
userSchema.methods.isCorrectOtp = async function(candidateOtp){
    return this.otp === candidateOtp;
    // return await bcrypt.compare(this.otp, candidateOtp);
}
userSchema.methods.generatePasswordResetToken = async function(){
    const resetToken = crypto.randomBytes(32).toString("hex");
    this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    this.passwordResetExpires = (Date.now() + (10*60*1000));
    return resetToken;
}

const User = new mongoose.model("User", userSchema);
module.exports = User;