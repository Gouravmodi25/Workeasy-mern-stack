// for require env file
require("dotenv").config({ path: "./.env" });
const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");

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
app.use(express.json({ limit: "50mb", extended: true }));
