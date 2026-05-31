const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createRateLimiter } = require('../middleware/rateLimit');
const { hashToken, secretsMatch } = require('../utils/security');
const { logAuthTableUse, TABLES, USER_SELECT } = require('../config/tables');
const {
    currencyCode,
    rejectUnexpectedFields,
    trimString,
} = require('../validators/common');

// Separate secrets for access and refresh tokens
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error("JWT secrets missing in environment");
}

// Cookie settings
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: String(process.env.COOKIE_SECURE || (process.env.NODE_ENV === 'production')) === 'true',
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
};

const ACCESS_COOKIE_OPTIONS = {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000 // 15 minutes
};
const CLEAR_COOKIE_OPTIONS = {
    httpOnly: COOKIE_OPTIONS.httpOnly,
    secure: COOKIE_OPTIONS.secure,
    sameSite: COOKIE_OPTIONS.sameSite,
    domain: COOKIE_OPTIONS.domain,
    path: COOKIE_OPTIONS.path,
};

const expireCookie = (res, name, options) => {
    res.clearCookie(name, options);
    res.cookie(name, '', {
        ...options,
        expires: new Date(0),
        maxAge: 0,
    });
};

const clearAuthCookies = (res) => {
    const baseOptions = {
        httpOnly: COOKIE_OPTIONS.httpOnly,
        secure: COOKIE_OPTIONS.secure,
        sameSite: COOKIE_OPTIONS.sameSite,
        path: COOKIE_OPTIONS.path,
    };
    const optionVariants = COOKIE_OPTIONS.domain
        ? [CLEAR_COOKIE_OPTIONS, baseOptions]
        : [baseOptions];

    optionVariants.forEach((options) => {
        expireCookie(res, 'refreshToken', options);
        expireCookie(res, 'accessToken', options);
    });
};

const ADMIN_ACCOUNT_TYPES = new Set(['admin', 'superadmin']);
const loginRateLimiter = createRateLimiter({
    windowMs: process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
    max: process.env.LOGIN_RATE_LIMIT_MAX || 10,
    keyGenerator: (req) => {
        const identifier = String(req.body?.email || req.body?.phone || '').trim().toLowerCase();
        return `${req.ip}:${identifier || 'unknown'}`;
    },
    message: 'Too many login attempts. Please try again later.',
});

const refreshRateLimiter = createRateLimiter({
    windowMs: process.env.REFRESH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
    max: process.env.REFRESH_RATE_LIMIT_MAX || 30,
    keyGenerator: (req) => req.ip,
    message: 'Too many refresh attempts. Please try again later.',
});

// Helper function to generate tokens
const generateTokens = async (userId) => {
    // Access Token (15 minutes)
    const accessToken = jwt.sign(
        { userId: userId },
        JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
    );

    // Refresh Token (30 days)
    const refreshToken = jwt.sign(
        { userId: userId },
        JWT_REFRESH_SECRET,
        { expiresIn: '30d' }
    );
    const refreshTokenHash = hashToken(refreshToken);

    // Calculate expiry (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);


        // 🔥 1. Purana token delete
    await pool.query(
        `DELETE FROM ${TABLES.refreshTokens} WHERE user_id = $1`,
        [userId]
    );


    // Save refresh token to database
    logAuthTableUse('refresh_token_save', TABLES.refreshTokens);

    await pool.query(
        `INSERT INTO ${TABLES.refreshTokens} (user_id, token, expires_at) 
         VALUES ($1, $2, $3)`,
        [userId, refreshTokenHash, expiresAt]
    );

    return { accessToken, refreshToken, expiresAt };
};

// AUTH CHECK MIDDLEWARE
const authCheck = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const bearerToken = authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.split(' ')[1]
            : null;
        const token = req.cookies?.accessToken || bearerToken;

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'Access token required',
                logout: true 
            });
        }
        
        // Verify access token
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
        
        const userResult = await pool.query(
            `SELECT id AS "ID" FROM ${TABLES.users} WHERE id = $1 AND is_deleted = false`,
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                error: 'Account deleted or not found',
                logout: true 
            });
        }

        req.userId = decoded.userId;
        next();

    } catch (error) {
        
        // Special flag for expired access tokens
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                error: 'Access token expired',
                expired: true  // Frontend ko bataye refresh karo
            });
        }
        
        return res.status(401).json({ 
            success: false, 
            error: 'Invalid token',
            logout: true 
        });
    }
};

// REGISTER
router.post('/register', async (req, res) => {
    const unexpectedFieldError = rejectUnexpectedFields(req.body, [
        'firstName',
        'lastName',
        'email',
        'phone',
        'password',
        'preferred_currency',
    ]);
    if (unexpectedFieldError) {
        return res.status(400).json({ success: false, error: unexpectedFieldError });
    }

    const firstName = trimString(req.body.firstName, { max: 80, required: true });
    const lastName = trimString(req.body.lastName, { max: 80 });
    const email = trimString(req.body.email, { max: 254 });
    const phone = trimString(req.body.phone, { max: 32 });
    const password = trimString(req.body.password, { max: 200, required: true });
    const preferred_currency = currencyCode(req.body.preferred_currency) || 'USD';

    if (!firstName || !password || password.length < 6 || (!email && !phone)) {
        return res.status(400).json({ success: false, error: 'Invalid registration details' });
    }


    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const result = await pool.query(
            `INSERT INTO ${TABLES.users} (
                first_name, last_name, email, phone,
                password, preferred_currency, is_deleted
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${USER_SELECT}`,
            [firstName, lastName, email, phone, hashedPassword, preferred_currency, false]
        );

        const newUser = result.rows[0];
        
        // Generate both tokens
        const { accessToken, refreshToken, expiresAt } = await generateTokens(newUser.ID);

        // Set refresh token in cookie
        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
        res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);

        
        res.json({ 
            success: true, 
            message: 'User registered successfully!',
            refreshExpiresAt: expiresAt,
            user: {
                ID: newUser.ID,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                phone: newUser.phone,
                preferred_currency: newUser.preferred_currency || 'USD'
            }
        });

    } catch (error) {
        const isDuplicate = error.code === '23505';
        res.status(isDuplicate ? 409 : 500).json({
            success: false,
            error: isDuplicate ? 'Account already exists' : 'Registration failed',
        });
    }
});

// LOGIN
router.post('/login', loginRateLimiter, async (req, res) => {
    const { email, phone, password } = req.body;

    logAuthTableUse('login_user_lookup', TABLES.users);

    try {
        let query = '';
        let values = [];

        if (email && email.trim() !== '') {
            query = `SELECT ${USER_SELECT} FROM ${TABLES.users} WHERE email = $1 AND is_deleted = false`;
            values = [email];
        } else if (phone && phone.trim() !== '') {
            query = `SELECT ${USER_SELECT} FROM ${TABLES.users} WHERE phone = $1 AND is_deleted = false`;
            values = [phone];
        } else {
            return res.status(400).json({ 
                success: false, 
                error: "Please enter email or phone" 
            });
        }

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                error: "Invalid email, phone, or password" 
            });
        }

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
            return res.status(401).json({ 
                success: false, 
                error: "Invalid email, phone, or password" 
            });
        }

        // Generate both tokens
        const { accessToken, refreshToken, expiresAt } = await generateTokens(user.ID);

        // Set refresh token in cookie
        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
        res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);


        res.json({
            success: true,
            refreshExpiresAt: expiresAt,
            user: {
                ID: user.ID,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                accountType: user.accountType || 'manual',
                preferred_currency: user.preferred_currency || 'USD'
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Refresh token endpoint
router.post('/refresh-token', refreshRateLimiter, async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    try {
        if (!refreshToken) {
            return res.status(401).json({ 
                success: false, 
                error: 'Refresh token required',
                logout: true 
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        const refreshTokenHash = hashToken(refreshToken);

        // Check database
        logAuthTableUse('refresh_token_read', TABLES.refreshTokens);

        const tokenResult = await pool.query(
            `SELECT * FROM ${TABLES.refreshTokens} 
             WHERE token = $1 AND user_id = $2 AND expires_at > NOW()`,
            [refreshTokenHash, decoded.userId]
        );

        if (tokenResult.rows.length === 0) {
            await pool.query(`DELETE FROM ${TABLES.refreshTokens} WHERE user_id = $1`, [decoded.userId]);
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid or expired refresh token',
                logout: true 
            });
        }

        // Delete old token
        await pool.query(
            `DELETE FROM ${TABLES.refreshTokens} WHERE token = $1`,
            [refreshTokenHash]
        );

        // Generate NEW tokens (30 days reset)
        const { accessToken, refreshToken: newRefreshToken, expiresAt } = 
            await generateTokens(decoded.userId);

        // Set new cookie
        res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
        res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);


        res.json({
            success: true,
            refreshExpiresAt: expiresAt
        });

    } catch (error) {
        
        if (error.name === 'TokenExpiredError') {
            // Delete expired token from database
            try {
                const decoded = jwt.decode(refreshToken);
                if (decoded?.userId) {
                    await pool.query(
                        `DELETE FROM ${TABLES.refreshTokens} WHERE user_id = $1`,
                        [decoded.userId]
                    );
                }
            } catch (_cleanupError) {}
        }
        
        return res.status(401).json({ 
            success: false, 
            error: 'Refresh token expired',
            logout: true 
        });
    }
});



// Logout endpoint
router.post('/logout', async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        // If a token exists, delete it from the database
        if (refreshToken) {
            await pool.query(
                `DELETE FROM ${TABLES.refreshTokens} WHERE token = $1`,
                [hashToken(refreshToken)]
            );
        }

        // 🍪 Clear cookie (IMPORTANT)
        clearAuthCookies(res);


        return res.json({
            success: true,
            logout: true,   // 🔥 IMPORTANT for frontend detection
            message: 'Logged out successfully'
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            logout: true,
            error: 'Logout failed but session cleared'
        });
    }
});







// UPDATE PROFILE
router.post('/update-profile', authCheck, async (req, res) => {
    const userId = req.userId;
    const unexpectedFieldError = rejectUnexpectedFields(req.body, [
        'firstName',
        'lastName',
        'email',
        'phone',
        'password',
        'preferred_currency',
    ]);
    if (unexpectedFieldError) {
        return res.status(400).json({ success: false, error: unexpectedFieldError });
    }

    const firstName = trimString(req.body.firstName, { max: 80 });
    const lastName = trimString(req.body.lastName, { max: 80 });
    const email = trimString(req.body.email, { max: 254 });
    const phone = trimString(req.body.phone, { max: 32 });
    const password = trimString(req.body.password, { max: 200 });
    const preferred_currency = currencyCode(req.body.preferred_currency);


    if ([firstName, lastName, email, phone, password, preferred_currency].includes(null)) {
        return res.status(400).json({ success: false, error: 'Invalid profile details' });
    }

    if (password && password.trim().length < 6) {
        return res.status(400).json({ 
            success: false, 
            error: 'Password must be at least 6 characters long' 
        });
    }

    try {
        const currentUserResult = await pool.query(
            `SELECT ${USER_SELECT} FROM ${TABLES.users} WHERE id = $1 AND is_deleted = false`,
            [userId]
        );

        if (currentUserResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const currentUser = currentUserResult.rows[0];

        if (email && email !== currentUser.email) {
            const emailCheck = await pool.query(
                `SELECT id AS "ID" FROM ${TABLES.users} WHERE email = $1 AND id != $2 AND is_deleted = false`,
                [email, userId]
            );
            
            if (emailCheck.rows.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Email already exists' 
                });
            }
        }

        if (phone && phone !== currentUser.phone) {
            const phoneCheck = await pool.query(
                `SELECT id AS "ID" FROM ${TABLES.users} WHERE phone = $1 AND id != $2 AND is_deleted = false`,
                [phone, userId]
            );
            
            if (phoneCheck.rows.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Phone number already exists' 
                });
            }
        }

        let hashedPassword = null;
        if (password) {
            const saltRounds = 10;
            hashedPassword = await bcrypt.hash(password.trim(), saltRounds);
        }

        const formattedCurrency = preferred_currency || null;

        const result = await pool.query(
            `UPDATE ${TABLES.users} SET 
                first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                email = COALESCE($3, email),
                phone = COALESCE($4, phone),
                password = COALESCE($5, password),
                preferred_currency = COALESCE($6, preferred_currency)
             WHERE id = $7 AND is_deleted = false RETURNING ${USER_SELECT}`,
            [
                firstName || null, 
                lastName || null, 
                email || null, 
                phone || null, 
                hashedPassword || null, 
                formattedCurrency || null,
                userId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const updatedUser = result.rows[0];
        
        
        let updateMessage = 'Profile updated!';
        if (password) updateMessage += ' Password updated.';
        if (preferred_currency) updateMessage += ` Currency updated to ${updatedUser.preferred_currency}.`;
        
        res.json({
            success: true,
            message: updateMessage,
            user: {
                ID: updatedUser.ID,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                phone: updatedUser.phone,
                accountType: updatedUser.accountType || 'manual',
                preferred_currency: updatedUser.preferred_currency || 'USD'
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET USER PROFILE
router.get('/user-profile', authCheck, async (req, res) => {
    const userId = req.userId;


    try {
        const result = await pool.query(
            `SELECT ${USER_SELECT}
             FROM ${TABLES.users} 
             WHERE id = $1 AND is_deleted = false`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const user = result.rows[0];
        
        res.json({
            success: true,
            user: {
                ID: user.ID,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                accountType: user.accountType || 'manual',
                preferred_currency: user.preferred_currency || 'USD',
                createdAt: user.createdAt || user.created_at || null
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/ws-token', authCheck, (req, res) => {
    const token = jwt.sign(
        {
            userId: req.userId,
            purpose: 'websocket',
        },
        JWT_ACCESS_SECRET,
        { expiresIn: '60s' }
    );

    res.json({
        success: true,
        token,
    });
});

// UPDATE CURRENCY
router.post('/update-currency', authCheck, async (req, res) => {
    const currency = currencyCode(req.body.currency, { required: true });
    const userId = req.userId;


    if (!currency) {
        return res.status(400).json({ success: false, error: 'Valid currency required' });
    }

    try {
        const result = await pool.query(
            `UPDATE ${TABLES.users} 
             SET preferred_currency = $1 
             WHERE id = $2 AND is_deleted = false 
             RETURNING ${USER_SELECT}`,
            [currency, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const updatedUser = result.rows[0];
        
        res.json({
            success: true,
            message: 'Currency preference updated!',
            user: {
                ID: updatedUser.ID,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                preferred_currency: updatedUser.preferred_currency
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE USER ACCOUNT
router.delete('/delete-account', authCheck, async (req, res) => {
    const userId = req.userId;
    const { password } = req.body;


    if (!password) {
        return res.status(400).json({ 
            success: false, 
            error: 'Password is required' 
        });
    }

    try {
        const userResult = await pool.query(
            `SELECT ${USER_SELECT} FROM ${TABLES.users} WHERE id = $1 AND is_deleted = false`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        const user = userResult.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
            return res.status(401).json({ 
                success: false, 
                error: "Invalid password" 
            });
        }

        // Delete refresh tokens first
        await pool.query(`DELETE FROM ${TABLES.refreshTokens} WHERE user_id = $1`, [userId]);

        // Soft delete user
        await pool.query(
            `UPDATE ${TABLES.users} 
             SET is_deleted = true, status = 'deleted'
             WHERE id = $1`,
            [userId]
        );

        // Clear cookie
        clearAuthCookies(res);

        
        res.json({
            success: true,
            message: 'Account deleted successfully.'
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ADMIN RESTORE
router.post('/admin/restore-user/:userId', authCheck, async (req, res) => {
    const { userId } = req.params;
    const adminSecret = req.headers['x-admin-secret'];
    const expectedAdminSecret = process.env.ADMIN_SECRET;

    if (!expectedAdminSecret) {
        return res.status(503).json({ error: 'Admin restore is not configured' });
    }

    if (!secretsMatch(adminSecret, expectedAdminSecret)) {
        return res.status(403).json({ error: 'Admin access only' });
    }
    
    try {
        const adminUserResult = await pool.query(
            `SELECT id AS "ID", account_type AS "accountType", is_deleted AS "isDeleted"
             FROM ${TABLES.users}
             WHERE id = $1`,
            [req.userId]
        );

        if (adminUserResult.rows.length === 0 || adminUserResult.rows[0].isDeleted) {
            return res.status(403).json({ error: 'Admin account not found' });
        }

        const adminAccountType = String(adminUserResult.rows[0].accountType || '').toLowerCase();
        if (!ADMIN_ACCOUNT_TYPES.has(adminAccountType)) {
            return res.status(403).json({ error: 'Admin role required' });
        }

        await pool.query(
            `UPDATE ${TABLES.users} SET is_deleted = false, status = 'active' WHERE id = $1`,
            [userId]
        );
        
        res.json({ 
            success: true, 
            message: 'User account restored' 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
module.exports.authCheck = authCheck; 
