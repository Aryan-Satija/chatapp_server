const router = require("express").Router();

const authRoute = require("./auth");
const userRoute = require("./user");
const groupRoute = require('./group.js')

router.use("/auth", authRoute);
router.use("/user", userRoute);
router.use("/group", groupRoute);

module.exports = router;