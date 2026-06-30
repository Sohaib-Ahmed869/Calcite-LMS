const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/user.controller');

// Admin user & role management (all MongoDB users). Mounted after the global `authenticate`
// in server.js, so every route only needs the admin guard.
const router = express.Router();

router.get('/users', requireAdmin, c.listUsers);
router.get('/users/check-email', requireAdmin, c.checkEmail); // before /:id so it isn't shadowed
router.post('/users', requireAdmin, c.createUser);
router.get('/users/:id', requireAdmin, c.getUser);
router.put('/users/:id', requireAdmin, c.updateUser);
router.patch('/users/:id/status', requireAdmin, c.setUserStatus);
router.post('/users/:id/password', requireAdmin, c.resetUserPassword);
router.delete('/users/:id', requireAdmin, c.deleteUser);

module.exports = router;
