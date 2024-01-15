const router = require('express').Router();
const groupController = require('../controller/groups.js')

router.post('/create', groupController.createGroup);

module.exports = router;