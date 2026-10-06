export const notFound = (req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
export const errorHandler = (error, req, res, next) => {
  if (error.name === 'CastError') {
    console.error('CastError details:', { model: error.model, path: error.path, value: error.value, stack: error.stack });
    error.statusCode = 400;
    error.message = `Invalid resource ID for ${error.path}: ${error.value}`;
  }
  if (error.code === 11000) error.statusCode = 409, error.message = 'A record with this value already exists';
  if (error.name === 'ValidationError') error.statusCode = 400, error.message = Object.values(error.errors).map(e => e.message).join(', ');
  if (!error.statusCode || error.statusCode === 500) {
    console.error('Server error:', error);
  }
  res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Internal server error' });
};
