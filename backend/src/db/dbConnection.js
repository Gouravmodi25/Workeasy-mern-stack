const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });
const DBName = require("../constant/dbName.js");

const connectDB = async () => {
  try {
    const connectionString = await mongoose.connect(
      `${process.env.MONGO_DB_URI}/${DBName}`
    );

    console.log(
      `"MONGO DB!! Database is connected to server at "${connectionString.connection.host}`
    );
  } catch (error) {
    console.log(`MONGO DB connection error ${error}`);
    process.exit(1);
  }
};

module.exports = connectDB;
