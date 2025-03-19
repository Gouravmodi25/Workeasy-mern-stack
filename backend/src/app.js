// for require env file
require("dotenv").config({ path: "./.env" });
const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const userRouter = require("./routes/user.routes");
const workerRouter = require("./routes/worker.routes");
const bodyParser = require("body-parser");

const originOptions = ["http://localhost:5173", "http://localhost:5174"];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || originOptions.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credential: true,
};

// Allow only for originOptions
app.use(cors(corsOptions));

// Allow for all origins
app.options("*", cors(corsOptions));

// cookie parser middleware
app.use(cookieParser());

// for parsing application/json
app.use(express.json({ limit: "100mb", extended: true }));
app.use(express.urlencoded({ extended: true }));

// for body parser
app.use(bodyParser.json({ limit: "100mb", extended: true }));

// for user api route
app.use("/api/user", userRouter);

// for worker route
app.use("/api/worker", workerRouter);

module.exports = app;
