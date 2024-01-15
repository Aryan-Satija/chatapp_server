require("dotenv").config();
const jwt = require("jsonwebtoken");
const util = require('util');
const promisify = util.promisify;
const bcrypt = require("bcryptjs");
const User = require("../models/user.js");
const crypto = require("crypto");
const otpGenerator = require("otp-generator");
const {filterData} = require("../utils/utils.js");
const mailSender = require("../utils/mailSender.js");
const otpTemplate = require("../mail-templates/otpVerification.js");
exports.protect = async(req, res, next)=>{
    try{
        const token = req.cookies?.token 
                        || req.body?.token 
                        || req.header("Authorization")?.replace("Bearer ", "");
        if(!token){
            return res.status(400).json({
                success: false,
                message: "You are not logged in! please log in to get access"
            })
        }  
  
        const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
        
        const user = await User.findById(decode.id);
        if(!user){
            return res.status(400).json({
                success: false,
                message: "invalid token or token has expired"
            })
        }
        req.user = user;
        next();
    } catch(err){
        return res.status(500).json({
            success: false,
            error: err.message
        })
    }
}
exports.register = async(req, res, next)=>{
    try{
        const {email} = req.body;
        const user = await User.findOne({email : email});
        if(user && user.verified){
            return res.status(404).json({
                success: false,
                error: "User already exists"
            })
        }
        else if(user){
            const filteredBody = filterData(req.body, "firstName", "lastName", "password");
            const hashedPassword = await bcrypt.hash(filteredBody.password, 12)
            filteredBody.password = hashedPassword;
            const registeredUser = await User.findOneAndUpdate({email: email}, filteredBody, {new: true, validateModifiedOnly : true});
            req.id = registeredUser._id;
            next();
        }
        else{
            const filteredBody = filterData(req.body, "firstName", "lastName", "email", "password");
            const hashedPassword = await bcrypt.hash(filteredBody.password, 12)
            filteredBody.password = hashedPassword;
            const registeredUser = await User.create(filteredBody);
            req.id = registeredUser._id;
            next();
        }
    } catch(err){
        return res.status(500).json({
            success: false,
            error: err.message
        })
    }
}
exports.sendOtp = async(req, res)=>{
    try{
        const {id} = req;
        const {email} = req.body;
        const otp = otpGenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });
        const expiryDate = Date.now() + 10*60*1000;
        await User.findOneAndUpdate({_id: id}, {otp: otp, otpExpiry: expiryDate});
        await mailSender(
            email, "Verification Email", otpTemplate(otp)
        )
        return res.status(200).json({
            success: true,
            message: "OTP SENT SUCCESSFULLY"
        })
    } catch(err){
        return res.status(500).json({
            success: false,
            error: err.message
        })
    }
}
exports.verifyOtp = async(req, res) => {
    try{
        const {email, supplied_otp} = req.body;
 
        if(!email || !supplied_otp){
            return res.status(404).json({
                success: false,
                message: "all fields are required"
            })
        }
    
        const user = await User.findOne({email: email, otpExpiry: {$gt : Date.now()}});
        if(!user){
            return res.status(400).json({
                success: false,
                message: "otp has expired"
            })
        }

        if(!(await user.isCorrectOtp(supplied_otp))){
            return res.status(400).json({
                success: false,
                message: "OTP incorrect"
            })
        }
        
        await User.findOneAndUpdate({email}, {verified: true});
        return res.status(200).json({
            success: true,
        })
    } catch(err){
        console.log(err);
        return res.status(500).json({
            success: false,
            error: err.message
        })
    }
}
exports.login = async(req, res)=>{
    try{
        const {email, password} = req.body;
        if(!email || !password){
            return res.status(404).json({
                success: false,
                message: "Email and password are required."
            })
        }
        const userData = await User.findOne({email: email});
        if(!userData){
            return res.status(400).json({
                success: false,
                message: "User doesn't exist."
            })
        }
        if(!userData.verified){
            return res.status(400).json({
                success: false,
                message: "User isn't verified."
            })
        }
        if(!(await userData.isCorrectPassword(password, userData.password))){
            return res.status(400).json({
                success: false,
                message: "Password incorrect"
            })
        }

        const token = jwt.sign({id : userData._id}, process.env.JWT_SECRET);
        userData.password = undefined;

        res.status(200).json({
            success: true,
            token,
            user: userData,
            message: `User Login Success`,
        });
    } catch(err){
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
            error: err.message
        })
    }
}

exports.forgotPassword = async(req, res)=>{
    try{
        const {email} = req.body;
        const userDetails = await User.findOne({email});
        if(!userDetails){
            res.status(400).json({
                success: false,
                message: "User doesn't exist"
            })
        }
        const resetToken = userDetails.generatePasswordResetToken();
        const resetUrl = `https://tawk.com/auth/reset-password/?code=${resetToken}`


        // send email

        res.status(200).json({
            success: true,
            message: "Email sent successfully"
        })
    } catch(err){
        User.passwordResetToken = undefined;
        User.passwordResetExpires = undefined;

        await User.save({
            validateBeforeSave : false,
        });

        res.status(500).json({
            success: false,
            message: "Internal server error",
            error:  err
        })
    }
}
exports.resetPassword = async(req, res) => {
    try{
        const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: {$gt: Date.now()}
        })
        if(!user){
            res.status(404).json({
                success: false,
                message: "Token is invalid or expired"
            });
        }

        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        
        const updated_user = await user.save({new: true});

        const token = jwt.sign({id: updated_user._id}, process.env.JWT_SECRET, { expiresIn: "24h"});
        
        res.status(200).json({
            success: true,
            message: "Password reset successfully", 
            updated_user,
            token
        })
    } catch(err){

    }
}