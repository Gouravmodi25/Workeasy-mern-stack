const connectDB = require("./db/dbConnection.js");
const app = require("./app.js");
const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    // if connection is not successful
    app.on("error", (error) => {
      console.log("Error While Connecting Database", error);
    });

    // if connection is successful
    app.listen(PORT, () => {
      console.log(`Server is running on Port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("Mongo DB Connection Failed", error);
  });
