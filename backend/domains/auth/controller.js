const express = require('express');
const router = express.Router();
const pool = require('../../infra/db/supabase');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createRateLimiter } = require('../../core/rateLimiter/index');
const { hashToken, secretsMatch } = require('../../shared/utils/security');
const { logAuthTableUse, TABLES, USER_SELECT } = require('../../config/tables');
const {
    currencyCode,
    rejectUnexpectedFields,
    trimString,
} = require('../../api/validators/common');
const { sendLoginNotificationEmail } = require('./email.service');
const { logInternalError, publicError, sanitizeError } = require('../../core/errors/safeErrors');

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

const queueLoginNotification = ({ user, req, method = 'password' }) => {
    const email = user?.email || user?.email_original;
    if (!email) return;

    const name = [user?.firstName || user?.first_name, user?.lastName || user?.last_name]
        .filter(Boolean)
        .join(' ')
        || user?.name
        || 'there';

    sendLoginNotificationEmail({
        email,
        name,
        method,
        ipAddress: req.ip || null,
        userAgent: String(req.headers['user-agent'] || '').slice(0, 512),
        loginTime: new Date(),
    }).catch((error) => {
        console.warn('auth.legacy_login_notification_failed', { userId: user?.ID || user?.id, error: sanitizeError(error) });
    });
};

const ADMIN_ACCOUNT_TYPES = new Set(['admin', 'superadmin']);

// AUTH CHECK MIDDLEWARE
const AUTH_USER_CACHE_TTL_MS = Number(process.env.AUTH_USER_CACHE_TTL_MS || 30000);
const activeUserCache = new Map();
const activeUserInFlight = new Map();

async function ensureActiveUser(userId) {
    const key = String(userId);
    const cached = activeUserCache.get(key);

    if (cached && Date.now() < cached.expiresAt) {
        return true;
    }

    activeUserCache.delete(key);

    // If another request is already checking this user, wait for that same DB query.
    if (activeUserInFlight.has(key)) {
        return activeUserInFlight.get(key);
    }

    const checkPromise = (async () => {
        const userResult = await pool.query(
            `SELECT id AS "ID" FROM ${TABLES.users} WHERE id = $1 AND is_deleted = false`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            activeUserCache.delete(key);
            return false;
        }

        activeUserCache.set(key, {
            expiresAt: Date.now() + AUTH_USER_CACHE_TTL_MS,
        });

        return true;
    })();

    activeUserInFlight.set(key, checkPromise);

    try {
        return await checkPromise;
    } finally {
        activeUserInFlight.delete(key);
    }
}



        const authCheck = async (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                const bearerToken = authHeader && authHeader.startsWith('Bearer ')
                    ? authHeader.split(' ')[1]
                    : null;
                const token = req.cookies?.accessToken || bearerToken;

                if (!token) {
                    return publicError(res, { status: 401, code: 'AUTH_REQUIRED', req });
                }
        
       // Verify access token
            const decoded = jwt.verify(token, JWT_ACCESS_SECRET);

            const userId = decoded.userId;

            if (!userId) {
                return publicError(res, { status: 401, code: 'AUTH_REQUIRED', req });
            }

            const isActiveUser = await ensureActiveUser(userId);

            if (!isActiveUser) {
                return publicError(res, { status: 401, code: 'AUTH_REQUIRED', req });
            }

            req.userId = userId;
            req.user = {
                id: userId,
                userId,
            };

            return next();
    } catch (error) {
        
        // Special flag for expired access tokens
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                code: 'SESSION_EXPIRED',
                message: 'Session expired. Please sign in again.',
                error: 'Session expired. Please sign in again.',
                expired: true
            });
        }
        
        return publicError(res, { status: 401, code: 'AUTH_REQUIRED', req });
    }
};









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
        logInternalError(req, error, 'auth.legacy_profile_update_failed');
        return publicError(res, { status: 500, code: 'INTERNAL_ERROR', req });
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
                error: "Invalid credentials." 
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
        logInternalError(req, error, 'auth.legacy_delete_account_failed');
        return publicError(res, { status: 500, code: 'INTERNAL_ERROR', req });
    }
});



module.exports = router;
module.exports.authCheck = authCheck; 
