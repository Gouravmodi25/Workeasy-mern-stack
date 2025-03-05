const asyncHandler = (handlerFunction) => {
  return async (req, res, next) => {
    return Promise.resolve(handlerFunction(req, res, next)).catch((error) => {
      return next(error);
    });
  };
};

module.exports = asyncHandler;
