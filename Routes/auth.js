const router = require("express").Router();

const authController = require("../controller/auth");

router.post("/signup", authController.register, authController.sendOtp);
router.post("/verifyOtp", authController.verifyOtp);

router.post("/login", authController.login);

router.post("/forgotPassword", authController.forgotPassword);
router.post("/resetPassword", authController.resetPassword);

module.exports = router;