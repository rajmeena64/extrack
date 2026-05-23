const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const cloudinary = require('../services/cloudinary');
const upload = require('../middleware/upload');
const fs = require('fs');
const { authCheck } = require('./auth');
const { createRateLimiter } = require('../middleware/rateLimit');
const { trimString } = require('../validators/common');

const screenshotRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: Number(process.env.SCREENSHOT_RATE_LIMIT_MAX || 20),
    keyGenerator: (req) => req.userId || req.ip,
    message: 'Too many screenshot requests. Please try again shortly.',
});

function isAllowedImageMagic(filePath) {
    const buffer = fs.readFileSync(filePath);
    if (buffer.length < 12) return false;

    const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isWebp = buffer.subarray(0, 4).toString('ascii') === 'RIFF'
        && buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    return isPng || isJpeg || isWebp;
}

// ==================== GET TRADE DATA (NOTES, STRATEGY, SCREENSHOTS) ====================
router.get('/get-trade/:unique_id', authCheck, async (req, res) => {
    const { unique_id } = req.params;
    const userId = req.userId;

    if (!unique_id || !userId) {
        return res.json({
            success: false,
            error: 'Unique ID and User ID are required'
        });
    }

    try {
        // Check in trades table first
        const manualTrade = await pool.query(
            `SELECT unique_id, notes, strategy, screenshots 
             FROM trades WHERE unique_id = $1 AND user_id = $2`,
            [unique_id, userId]
        );

        if (manualTrade.rows.length > 0) {
            return res.json({
                success: true,
                trade: manualTrade.rows[0]
            });
        }

        // Check in api_trades table
        const apiTrade = await pool.query(
            `SELECT unique_id, notes, strategy, screenshots 
             FROM api_trades WHERE unique_id = $1 AND user_id = $2`,
            [unique_id, userId]
        );

        if (apiTrade.rows.length > 0) {
            return res.json({
                success: true,
                trade: apiTrade.rows[0]
            });
        }

        return res.json({
            success: false,
            error: 'Trade not found'
        });

    } catch (error) {
        return res.json({
            success: false,
            error: error.message
        });
    }
});

// ==================== UPDATE TRADE DATA (NOTES, STRATEGY) ====================
router.post('/update-trade', authCheck, async (req, res) => {
    const { unique_id, notes, strategy } = req.body;
    const userId = req.userId;
    const normalizedNotes = trimString(notes, { max: 5000 });
    const normalizedStrategy = trimString(strategy, { max: 120 });

    // Validation
    if (!unique_id || !userId) {
        return res.json({
            success: false,
            error: 'Unique ID and User ID are required'
        });
    }

    try {
        // Check which table has this unique_id
        let tableName = null;

        // Check in trades table (manual trades)
        const manualTrade = await pool.query(
            `SELECT * FROM trades WHERE unique_id = $1 AND user_id = $2`,
            [unique_id, userId]
        );

        if (manualTrade.rows.length > 0) {
            tableName = 'trades';
        } else {
            // Check in api_trades table
            const apiTrade = await pool.query(
                `SELECT * FROM api_trades WHERE unique_id = $1 AND user_id = $2`,
                [unique_id, userId]
            );

            if (apiTrade.rows.length > 0) {
                tableName = 'api_trades';
            }
        }

        // If trade not found in any table
        if (!tableName) {
            return res.json({
                success: false,
                error: 'Trade not found or unauthorized'
            });
        }

        // Build dynamic update query
        const updates = [];
        const values = [unique_id, userId];
        let paramIndex = 3;

        // Add notes if provided
        if (notes !== undefined) {
            if (normalizedNotes === null) {
                return res.status(400).json({ success: false, error: 'Invalid notes' });
            }
            updates.push(`notes = $${paramIndex}`);
            values.push(normalizedNotes || null);
            paramIndex++;
        }

        // Add strategy if provided
        if (strategy !== undefined) {
            if (normalizedStrategy === null) {
                return res.status(400).json({ success: false, error: 'Invalid strategy' });
            }
            updates.push(`strategy = $${paramIndex}`);
            values.push(normalizedStrategy || null);
            paramIndex++;
        }

        // If nothing to update
        if (updates.length === 0) {
            return res.json({
                success: false,
                error: 'No data provided to update'
            });
        }

        // Execute update query
        const updateQuery = `
            UPDATE ${tableName} 
            SET ${updates.join(', ')} 
            WHERE unique_id = $1 AND user_id = $2 
            RETURNING unique_id, notes, strategy, screenshots
        `;

        const result = await pool.query(updateQuery, values);
        
        if (result.rowCount === 0) {
            return res.json({
                success: false,
                error: 'No rows updated'
            });
        }

        res.json({
            success: true,
            message: 'Trade updated successfully',
            trade: result.rows[0]
        });

    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// ==================== SCREENSHOT UPLOAD TO CLOUDINARY ====================
router.post('/upload-screenshot', authCheck, screenshotRateLimiter, upload.single('screenshot'), async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ 
                success: false, 
                error: 'No file uploaded' 
            });
        }

        if (!isAllowedImageMagic(req.file.path)) {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                error: 'Invalid image file',
            });
        }

        const { unique_id } = req.body;
        const userId = req.userId;

        if (!unique_id || !userId) {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.json({ 
                success: false, 
                error: 'Unique ID and User ID required' 
            });
        }

        // Check which table has this unique_id
        let tableName = null;
        let existingTrade = null;

        // Check in trades table
        const manualTrade = await pool.query(
            `SELECT * FROM trades WHERE unique_id = $1 AND user_id = $2`,
            [unique_id, userId]
        );

        if (manualTrade.rows.length > 0) {
            tableName = 'trades';
            existingTrade = manualTrade.rows[0];
        } else {
            // Check in api_trades table
            const apiTrade = await pool.query(
                `SELECT * FROM api_trades WHERE unique_id = $1 AND user_id = $2`,
                [unique_id, userId]
            );

            if (apiTrade.rows.length > 0) {
                tableName = 'api_trades';
                existingTrade = apiTrade.rows[0];
            }
        }

        if (!tableName) {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.json({ 
                success: false, 
                error: 'Trade not found or unauthorized' 
            });
        }

        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
            folder: `trading-app/user_${userId}`,
            public_id: `trade_${unique_id}_${Date.now()}`,
            overwrite: false
        });

        // Delete temp file
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        // Get existing screenshots
        let existingScreenshots = [];
        if (existingTrade.screenshots) {
            try {
                existingScreenshots = Array.isArray(existingTrade.screenshots) 
                    ? existingTrade.screenshots 
                    : JSON.parse(existingTrade.screenshots);
            } catch (_e) {
                existingScreenshots = [];
            }
        }

        // Add new screenshot
        const newScreenshotUrl = uploadResult.secure_url;
        existingScreenshots.push(newScreenshotUrl);

        // Update database
        await pool.query(
            `UPDATE ${tableName} SET screenshots = $1 WHERE unique_id = $2 AND user_id = $3`,
            [JSON.stringify(existingScreenshots), unique_id, userId]
        );

        res.json({
            success: true,
            message: 'Screenshot uploaded successfully!',
            screenshotUrl: newScreenshotUrl,
            unique_id: unique_id,
            screenshotCount: existingScreenshots.length,
            screenshots: existingScreenshots
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==================== DELETE SCREENSHOT FROM CLOUDINARY ====================
router.delete('/delete-screenshot', authCheck, screenshotRateLimiter, async (req, res) => {
    const { unique_id, screenshotUrl } = req.body;
    const userId = req.userId;

    if (!unique_id || !screenshotUrl || !userId) {
        return res.json({ 
            success: false, 
            error: 'Unique ID, Screenshot URL and User ID required' 
        });
    }

    try {
        // Check which table has this unique_id
        let tableName = null;
        let existingTrade = null;

        const manualTrade = await pool.query(
            `SELECT * FROM trades WHERE unique_id = $1 AND user_id = $2`,
            [unique_id, userId]
        );

        if (manualTrade.rows.length > 0) {
            tableName = 'trades';
            existingTrade = manualTrade.rows[0];
        } else {
            const apiTrade = await pool.query(
                `SELECT * FROM api_trades WHERE unique_id = $1 AND user_id = $2`,
                [unique_id, userId]
            );

            if (apiTrade.rows.length > 0) {
                tableName = 'api_trades';
                existingTrade = apiTrade.rows[0];
            }
        }

        if (!tableName) {
            return res.json({ 
                success: false, 
                error: 'Trade not found or unauthorized' 
            });
        }

        // Get existing screenshots
        let existingScreenshots = [];
        if (existingTrade.screenshots) {
            try {
                existingScreenshots = Array.isArray(existingTrade.screenshots) 
                    ? existingTrade.screenshots 
                    : JSON.parse(existingTrade.screenshots);
            } catch (_e) {
                return res.json({ 
                    success: false, 
                    error: 'Invalid screenshots data format' 
                });
            }
        }

        // Check if screenshot exists
        if (!existingScreenshots.includes(screenshotUrl)) {
            return res.json({ 
                success: false, 
                error: 'Screenshot not found for this trade' 
            });
        }

        // Delete from Cloudinary
        if (screenshotUrl.includes('cloudinary.com')) {
            try {
                const urlParts = screenshotUrl.split('/');
                const uploadIndex = urlParts.indexOf('upload');
                if (uploadIndex !== -1) {
                    const publicIdParts = urlParts.slice(uploadIndex + 2);
                    const publicId = publicIdParts.join('/').replace(/\.[^/.]+$/, "");
                    await cloudinary.uploader.destroy(publicId);
                }
            } catch (_cloudinaryError) {
                // Ignore Cloudinary deletion errors
            }
        }

        // Remove from database
        const updatedScreenshots = existingScreenshots.filter(url => url !== screenshotUrl);
        
        await pool.query(
            `UPDATE ${tableName} SET screenshots = $1 WHERE unique_id = $2 AND user_id = $3`,
            [JSON.stringify(updatedScreenshots), unique_id, userId]
        );

        res.json({ 
            success: true, 
            message: 'Screenshot deleted successfully!',
            unique_id: unique_id,
            deletedScreenshot: screenshotUrl,
            remainingScreenshotCount: updatedScreenshots.length,
            screenshots: updatedScreenshots
        });

    } catch (error) {
        res.json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;
