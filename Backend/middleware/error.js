/** 404 for unmatched routes. */
function notFound(req, res) {
  res.status(404).json({ success: false, error: `Not found: ${req.method} ${req.originalUrl}`, message: `Not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  // multer raises this when an upload exceeds the configured size limit.
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: 'File too large', message: 'File too large' });
  }
  // eslint-disable-next-line no-console
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ success: false, error: err.message || 'Internal server error', message: err.message || 'Internal server error' });
}

module.exports = { notFound, errorHandler };
