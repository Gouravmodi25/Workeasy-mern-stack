const express = require("express");
const { signupWorker } = require("../controller/worker.controller.js");
const upload = require("../middleware/multer.middleware.js");
const workerRouter = express.Router();


// for signup worker

workerRouter.route("/signup").post(signupWorker);

module.exports = workerRouter;
