const WorkerModel = require("../model/worker.model");
const ApiResponse = require("../utils/ApiResponse");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");

const workerAuth = asyncHandler(async function (req, res, next) {
  // Retrieve token from cookies or authorization header
  const token =
    req?.cookies?.accessToken ||
    (req?.headers["authorization"]?.startsWith("Bearer ")
      ? req.headers["authorization"].split(" ")[1]
      : null);

  console.log(token);

  if (!token) {
    return res
      .status(401)
      .json(new ApiResponse(401, "Not Authorized. Please log in again."));
  }

  try {
    // Verify the token
    const decodedToken = await jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );
    console.log("Decoded Token ID:", decodedToken.id);

    // Find the worker using the decoded ID
    const loggedWorker = await WorkerModel.findById(decodedToken.id).select(
      "-password"
    );

    console.log(loggedWorker);

    if (!loggedWorker) {
      return res
        .status(401)
        .json(new ApiResponse(401, "Not Authorized. Please log in again."));
    }

    // Attach the worker to the request object
    req.worker = loggedWorker;
    console.log("Logged Worker:", loggedWorker);

    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);

    // Handle expired token explicitly
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json(new ApiResponse(401, "Token expired. Please log in again."));
    }

    return res
      .status(401)
      .json(new ApiResponse(401, "Invalid token. Please log in again."));
  }
});

module.exports = workerAuth;
