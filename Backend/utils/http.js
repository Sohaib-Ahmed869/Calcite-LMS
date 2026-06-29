const mongoose = require('mongoose');

// Consistent JSON envelope across the Course API: { success, data } / { success, message }.
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const isValidId = (id) => mongoose.isValidObjectId(id);

// Wrap an async controller so thrown errors (incl. our HttpError with .status) become JSON responses.
const wrap = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ success: false, message: err.message || 'Server error' });
  }
};

module.exports = { ok, fail, isValidId, wrap };
