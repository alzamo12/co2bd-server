const express = require('express');
const router = express.Router();
const {getEvents} = require("../controllers/event.controllerts");

router.get("/events", getEvents);

module.exports = router