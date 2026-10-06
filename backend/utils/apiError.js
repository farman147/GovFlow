export class ApiError extends Error {
  constructor(message, statusCode = 400) { super(message); this.statusCode = statusCode; }
}
export const assert = (condition, message, statusCode = 400) => { if (!condition) throw new ApiError(message, statusCode); };

