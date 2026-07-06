function qident(value) {
  return String(value || '')
    .split('.')
    .filter(Boolean)
    .map((part) => `"${part.replace(/"/g, '""')}"`)
    .join('.');
}

const rawAdminIntegrationsTable =
  process.env.CTRADER_ADMIN_INTEGRATIONS_TABLE ||
  process.env.ADMIN_INTEGRATIONS_TABLE ||
  'system.admin_integrations';

const TABLES = {
  adminIntegrations: qident(rawAdminIntegrationsTable),
};

module.exports = {
  TABLES,
};
