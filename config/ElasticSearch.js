var elasticsearch = require('elasticsearch'),

  index = "index_name_goes_here",
  client = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'trace'
  });

module.exports.elasticSearchClient = client;

module.exports.elasticSearchConfig = {
  index: index
};
