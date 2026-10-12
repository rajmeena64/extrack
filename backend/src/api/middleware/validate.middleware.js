const AppError = require('../../core/errors/AppError');

function validate(schema) {
  return (req, res, next) => {
    try {
      if (schema.body && req.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.query && req.query) {
        req.query = schema.query.parse(req.query);
      }
      if (schema.params && req.params) {
        req.params = schema.params.parse(req.params);
      }
      next();
    } catch (err) {
      if (err.errors) {
        const details = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }));
        return next(AppError.badRequest('Validation error', 'VALIDATION_FAILED', details));
      }
      next(err);
    }
  };
}

module.exports = validate;
