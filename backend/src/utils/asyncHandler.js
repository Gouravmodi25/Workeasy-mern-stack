const asyncHandler = (handlerFunction) => {
  return async (req, res, next) => {
    try {
      await handlerFunction(req, res, next);
    } catch (error) {
      next(error); // Ensure error is passed to Express error handler
    }
  };
};

module.exports = asyncHandler;
