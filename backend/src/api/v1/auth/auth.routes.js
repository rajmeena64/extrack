const express = require('express');
const authController = require('./auth.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const {
  signupSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema
} = require('../../../domains/auth/auth.schema');

const router = express.Router();

router.post('/signup', validate({ body: signupSchema }), authController.signup);
router.post('/login', validate({ body: loginSchema }), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);

router.get('/me', authMiddleware, authController.me);
router.get('/ws-token', authMiddleware, authController.getWsToken);
router.post('/change-password', authMiddleware, validate({ body: changePasswordSchema }), authController.changePassword);
router.post('/update-profile', authMiddleware, validate({ body: updateProfileSchema }), authController.updateProfile);
router.delete('/delete-account', authMiddleware, authController.deleteAccount);

module.exports = router;
