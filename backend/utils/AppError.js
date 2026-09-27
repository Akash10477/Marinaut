// `throw new AppError(404, "Not found")` in a controller -> errorHandler sends that status
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = AppError;
