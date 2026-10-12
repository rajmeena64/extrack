const settingsService = require('../../../domains/settings/settings.service');

const settingsController = {
  async get(req, res, next) {
    try {
      const settings = await settingsService.getSettings(req.userId);
      res.json({ success: true, settings });
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const settings = await settingsService.updateSettings(req.userId, req.body);
      res.json({ success: true, settings });
    } catch (err) { next(err); }
  }
};

module.exports = settingsController;
