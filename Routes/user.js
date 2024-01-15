const router = require("express").Router();

const authController = require("../controller/auth.js");
const userController = require("../controller/user.js");


router.post("/update-profile", authController.protect, userController.updateProfile);
router.post("/update-pfp", authController.protect, userController.updateDisplayPicture);
router.post("/get-users", authController.protect, userController.getUsers);
router.post("/get-friend-requests", authController.protect, userController.getFriendRequests);
router.post("/get-friends", authController.protect, userController.getFriends);
module.exports = router;