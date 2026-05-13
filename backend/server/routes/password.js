const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const pool = require('../config/database');
const emailTransporter = require('../config/email');
const { createRateLimiter } = require('../middleware/rateLimit');
const { authCheck } = require('./auth');
const { hashToken } = require('../utils/security');

const forgotPasswordRateLimiter = createRateLimiter({
    windowMs: process.env.FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
    max: process.env.FORGOT_PASSWORD_RATE_LIMIT_MAX || 5,
    keyGenerator: (req) => {
        const identifier = String(req.body?.email || '').trim().toLowerCase();
        return `${req.ip}:${identifier || 'unknown'}`;
    },
    message: 'Too many password reset requests. Please try again later.',
});

const resetPasswordRateLimiter = createRateLimiter({
    windowMs: process.env.RESET_PASSWORD_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
    max: process.env.RESET_PASSWORD_RATE_LIMIT_MAX || 10,
    keyGenerator: (req) => {
        const identifier = String(req.body?.token || '').trim().slice(0, 16);
        return `${req.ip}:${identifier || 'unknown'}`;
    },
    message: 'Too many password reset attempts. Please try again later.',
});

function getPasswordResetUrl() {
    const passwordResetUrl = String(process.env.PASSWORD_RESET_URL || '').trim();
    if (passwordResetUrl) {
        return passwordResetUrl.replace(/\/+$/, '');
    }

    const frontendUrl = String(process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
    if (frontendUrl) {
        return `${frontendUrl}/reset-password`;
    }

    throw new Error('PASSWORD_RESET_URL or FRONTEND_URL must be configured');
}

router.post('/forgot-password', forgotPasswordRateLimiter, async (req, res) => {
    const { email } = req.body;

    try {
        if (!emailTransporter) {
            return res.status(500).json({
                success: false,
                error: 'Email service is not configured'
            });
        }

        const result = await pool.query(
            `SELECT * FROM public."user" WHERE "email" = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                message: 'If email exists, reset link will be sent'
            });
        }

        const user = result.rows[0];
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = hashToken(resetToken);

        await pool.query(
            `UPDATE public."user"
             SET reset_token = $1, reset_token_expiry = $2
             WHERE "ID" = $3`,
            [resetTokenHash, new Date(Date.now() + 15 * 60 * 1000), user.ID]
        );

        const resetLink = `${getPasswordResetUrl()}?token=${encodeURIComponent(resetToken)}`;
        const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
        const fromName = process.env.SMTP_FROM_NAME || 'TradeAnalytics';

        const mailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to: email,
            subject: 'Reset Your Password - TradeAnalytics',
            html: `
                <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #000000 0%, #333333 100%);
                                padding: 30px; border-radius: 15px 15px 0 0; color: white; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">TradeAnalytics</h1>
                        <p style="opacity: 0.9; margin-top: 10px; font-size: 14px;">Smart Trading Analytics Platform</p>
                    </div>

                    <div style="background: white; padding: 30px; border-radius: 0 0 15px 15px;
                                box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                        <h2 style="color: #333; margin-bottom: 20px; font-size: 22px; font-weight: 600;">Password Reset Request</h2>

                        <p style="color: #555; line-height: 1.6; margin-bottom: 25px; font-size: 15px;">
                            Hello <strong>${user.firstName}</strong>,<br>
                            You requested to reset your password. Click the button below:
                        </p>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}"
                               style="background: #000000;
                                      color: white; padding: 14px 32px; text-decoration: none;
                                      border-radius: 8px; font-weight: bold; font-size: 16px;
                                      display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                                      border: 2px solid #000000; transition: all 0.3s ease;">
                                Reset Password
                            </a>
                        </div>

                        <p style="color: #777; font-size: 14px; margin-bottom: 10px; line-height: 1.5;">
                            <strong>Important:</strong> This link expires in <strong>15 minutes</strong>.
                        </p>

                        <p style="color: #777; font-size: 14px; line-height: 1.5;">
                            If you didn't request this, please ignore this email.
                        </p>
                    </div>
                </div>
            `
        };

        await emailTransporter.sendMail(mailOptions);

        res.json({
            success: true,
            message: 'Password reset link sent to your email'
        });
    } catch (error) {
        res.json({
            success: false,
            error: 'Failed to send email'
        });
    }
});

router.post('/reset-password', resetPasswordRateLimiter, async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Reset token and new password are required'
            });
        }

        if (String(newPassword).trim().length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters long'
            });
        }

        const tokenHash = hashToken(token);
        const result = await pool.query(
            `SELECT * FROM public."user"
             WHERE (reset_token = $1 OR reset_token = $2)
             AND reset_token_expiry > NOW()`,
            [tokenHash, token]
        );

        if (result.rows.length === 0) {
            return res.json({
                success: false,
                error: 'Invalid or expired reset link'
            });
        }

        const user = result.rows[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            `UPDATE public."user"
             SET password = $1,
                 reset_token = NULL,
                 reset_token_expiry = NULL
             WHERE "ID" = $2`,
            [hashedPassword, user.ID]
        );

        res.json({
            success: true,
            message: 'Password reset successful!'
        });
    } catch (error) {
        res.json({
            success: false,
            error: 'Server error'
        });
    }
});

router.post('/update-password', authCheck, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    }

    if (String(newPassword).trim().length < 6) {
        return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long' });
    }

    try {
        const userResult = await pool.query(
            `SELECT * FROM public."user" WHERE "ID" = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.json({ success: false, error: 'User not found' });
        }

        const user = userResult.rows[0];
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);

        if (!passwordMatch) {
            return res.json({ success: false, error: 'Current password is incorrect' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            `UPDATE public."user" SET "password" = $1 WHERE "ID" = $2`,
            [hashedNewPassword, userId]
        );

        res.json({
            success: true,
            message: 'Password updated successfully!'
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

router.post('/update-account-type', authCheck, async (req, res) => {
    const { accountType } = req.body;
    const userId = req.userId;
    const normalizedAccountType = String(accountType || '').toLowerCase();

    if (!accountType) {
        return res.status(400).json({ success: false, error: 'Account type required' });
    }

    if (!['manual', 'api'].includes(normalizedAccountType)) {
        return res.status(400).json({ success: false, error: 'Invalid account type' });
    }

    try {
        const result = await pool.query(
            `UPDATE public."user" SET "accountType" = $1 WHERE "ID" = $2 RETURNING *`,
            [normalizedAccountType, userId]
        );

        if (result.rows.length === 0) {
            return res.json({ success: false, error: 'User not found' });
        }

        const updatedUser = result.rows[0];

        res.json({
            success: true,
            message: 'Account type updated!',
            user: {
                ID: updatedUser.ID,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                accountType: updatedUser.accountType
            }
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

module.exports = router;
