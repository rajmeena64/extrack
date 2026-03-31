const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../config/database');
const emailTransporter = require('../config/email');
const bcrypt = require('bcrypt'); // ✅ YEH LINE ADD KI

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    console.log("📧 FORGOT PASSWORD REQUEST - Email:", email);

    try {
        const result = await pool.query(
            `SELECT * FROM public."user" WHERE "email" = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.json({ 
                success: true, 
                message: "If email exists, reset link will be sent" 
            });
        }

        const user = result.rows[0];
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        await pool.query(
            `UPDATE public."user" 
             SET reset_token = $1, reset_token_expiry = $2 
             WHERE "ID" = $3`,
            [resetToken, new Date(Date.now() + 15 * 60 * 1000), user.ID]
        );

        const resetLink = `http://localhost:5500/reset-password.html?token=${resetToken}`;
        
        const mailOptions = {
            from: '"TradeAnalytics" <rm6462041@gmail.com>',
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
                            <strong>⚠️ Important:</strong> This link expires in <strong>15 minutes</strong>.
                        </p>
                        
                        <p style="color: #777; font-size: 14px; line-height: 1.5;">
                            If you didn't request this, please ignore this email.
                        </p>
                    </div>
                </div>
            `
        };

        await emailTransporter.sendMail(mailOptions);
        console.log("✅ EMAIL SENT TO:", email);
        
        res.json({
            success: true,
            message: "Password reset link sent to your email"
        });

    } catch (error) {
        console.log("❌ Error:", error.message);
        res.json({ 
            success: false, 
            error: "Failed to send email" 
        });
    }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const result = await pool.query(
            `SELECT * FROM public."user" 
             WHERE reset_token = $1 
             AND reset_token_expiry > NOW()`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.json({ 
                success: false, 
                error: "Invalid or expired reset link" 
            });
        }

        const user = result.rows[0];

        // ✅ YEH LINE ADD KI
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            `UPDATE public."user" 
             SET password = $1, 
                 reset_token = NULL, 
                 reset_token_expiry = NULL 
             WHERE "ID" = $2`,
            [hashedPassword, user.ID] // ✅ hashedPassword use kiya
        );

        console.log("✅ PASSWORD RESET FOR:", user.email);
        res.json({
            success: true,
            message: "Password reset successful!"
        });

    } catch (error) {
        console.log("❌ Reset Password Error:", error.message);
        res.json({ 
            success: false, 
            error: "Server error" 
        });
    }
});

// UPDATE PASSWORD
router.post('/update-password', async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;

    console.log("🔐 UPDATE PASSWORD - User ID:", userId);

    if (!userId || !currentPassword || !newPassword) {
        return res.json({ success: false, error: 'All fields required' });
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

        // ✅ YEH LINE CHANGE KI
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        
        if (!passwordMatch) {
            return res.json({ success: false, error: 'Current password is incorrect' });
        }

        // ✅ YEH LINE ADD KI
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            `UPDATE public."user" SET "password" = $1 WHERE "ID" = $2`,
            [hashedNewPassword, userId] // ✅ hashedNewPassword use kiya
        );

        console.log("✅ PASSWORD UPDATED SUCCESSFULLY");
        res.json({
            success: true,
            message: 'Password updated successfully!'
        });

    } catch (error) {
        console.log("❌ Update Password Error:", error.message);
        res.json({ success: false, error: error.message });
    }
});

// UPDATE ACCOUNT TYPE
router.post('/update-account-type', async (req, res) => {
    const { userId, accountType } = req.body;

    console.log("🔄 UPDATE ACCOUNT TYPE - User ID:", userId, "Type:", accountType);

    if (!userId || !accountType) {
        return res.json({ success: false, error: 'User ID and account type required' });
    }

    try {
        const result = await pool.query(
            `UPDATE public."user" SET "accountType" = $1 WHERE "ID" = $2 RETURNING *`,
            [accountType, userId]
        );

        if (result.rows.length === 0) {
            return res.json({ success: false, error: 'User not found' });
        }

        const updatedUser = result.rows[0];
        
        console.log("✅ ACCOUNT TYPE UPDATED SUCCESSFULLY");
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
        console.log("❌ Update Account Type Error:", error.message);
        res.json({ success: false, error: error.message });
    }
});

module.exports = router;