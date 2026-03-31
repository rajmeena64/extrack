const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const cloudinary = require('../config/cloudinary');
const upload = require('../config/multer');
const fs = require('fs');

// ==================== GET TRADE DATA (NOTES, STRATEGY, SCREENSHOTS) ====================
router.get('/get-trade/:unique_id', async (req, res) => {
    const { unique_id } = req.params;
    const { userId } = req.query; // userId as query parameter

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
router.post('/update-trade', async (req, res) => {
    const { unique_id, userId, notes, strategy } = req.body;

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
            updates.push(`notes = $${paramIndex}`);
            values.push(notes);
            paramIndex++;
        }

        // Add strategy if provided
        if (strategy !== undefined) {
            updates.push(`strategy = $${paramIndex}`);
            values.push(strategy);
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
router.post('/upload-screenshot', upload.single('screenshot'), async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ 
                success: false, 
                error: 'No file uploaded' 
            });
        }

        const { unique_id, userId } = req.body;

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
            } catch (e) {
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
router.delete('/delete-screenshot', async (req, res) => {
    const { unique_id, screenshotUrl, userId } = req.body;

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
            } catch (e) {
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
            } catch (cloudinaryError) {
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