const repository = require('./brokerRepository');

function serializeBroker(row) {
  return {
    ...row,
    logoPath: row.logoPath ?? null,
    supportedInstruments: Array.isArray(row.supportedInstruments) ? row.supportedInstruments : [],
    supportedTradeMethods: Array.isArray(row.supportedTradeMethods) ? row.supportedTradeMethods : [],
    importFieldMapping: row.importFieldMapping && !Array.isArray(row.importFieldMapping) && typeof row.importFieldMapping === 'object' ? row.importFieldMapping : {},
    searchKeywords: Array.isArray(row.searchKeywords) ? row.searchKeywords : [],
  };
}

async function listBrokers(options) {
  return (await repository.list(options)).map(serializeBroker);
}

async function getBroker(id, options) {
  const broker = await repository.findById(id, options);
  return broker ? serializeBroker(broker) : null;
}

async function listBrokerIntegrations(id) {
  return repository.listIntegrationsByBrokerId(id);
}

module.exports = { getBroker, listBrokerIntegrations, listBrokers, serializeBroker };
