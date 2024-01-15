const mongoose = require("mongoose");
require("dotenv").config();
exports.DBconnect = async()=>{
    await mongoose.connect(process.env.MONGODB_URL)
    .then(()=>{
        console.log("DB CONNECTED SUCCESSFULLY")
    })
    .catch((err)=>{
        console.log("ERROR OCCURED WHILE CONNECTING TO THE DATABASE");
        console.log(err.message);
        process.exit(1);
    })
}