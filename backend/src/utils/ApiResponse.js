class ApiResponse {
  constructor(statusCode, message = "success", data = null) {
    this.statusCode = statusCode;
    this.message = message;
    this.success = statusCode >= 200 && statusCode < 400;
    this.data = data;
  }
}

module.exports = ApiResponse;
