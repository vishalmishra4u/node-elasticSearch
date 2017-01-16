/**
 * Created by vishal on 30/5/16.
 */
var config = sails.config,
  elasticSearchClient = config.elasticSearchClient,
  elasticSearchConfig = config.elasticSearchConfig,
  Q = require('q'),
  request = require('request');

module.exports = {
  indexItem: indexItem,
  deleteToolFromElastic : deleteToolFromElastic,
  searchItem : searchItem,
  searchItemWithDistance : searchItemWithDistance,
  addANewFieldToDocument : addANewFieldToDocument,
  createScriptWithFieldName : createScriptWithFieldName
  priceAggregation : priceAggregation,
  updateDocument : updateDocument,
  deleteDocumentFromElastic : deleteDocumentFromElastic,
  searchToolByReferenceId : searchToolByReferenceId
  UpperLowerlimitFilter : UpperLowerlimitFilter
};

function indexItem(type, item) {
  return Q.promise(function(resolve, reject){
    elasticSearchClient
      .index({
        index: elasticSearchConfig.index,
        type: type,
        id : item.referenceId,
        body: item
      })
      .then(function (response) {
        console.log("ElasticSearchService#indexItem :: Response :: ", response);
        return resolve(response);
      })
      .catch(function(err) {
        console.log("ElasticSearchService#indexItem :: Error :: ", err);
        return reject(err);
      });
  });
}

function deleteDocumentFromElastic(referenceId){
  return Q.promise(function(resolve, reject) {
    var url = 'http://localhost:9200/'+ index_Name + '/' + type_Name + '/ss'+ referenceId;
    request.delete(url, function (error, response, body) {
      if(error) {
        console.log("ElasticSearchService#deleteToolFromElastic :: Error :: ", error);
        return reject(error);
      }
      return resolve();
    });
  });
}

//Method to search a document by a search query
function searchItem(searchQuery, lat, lon) {
  return Q.promise(function(resolve, reject) {

    elasticSearchClient
      .search({
        index : elasticSearchConfig.index,
        type: "type_of_index",
        body: {
          "query":{
            "bool":{
              "must":{
                "match": {
                  "field_Name": value
                }
              },
              //Add one or more match_phrase_prefix with more fields
              "should": [
                {
                  "match_phrase_prefix" : {
                    "field_Name" : {
                      "query" : searchQuery,
                      "max_expansions" : 75
                    }
                  }
                }
                // Add more fields
                //{
                //   "match_phrase_prefix" : {
                //     "field_Name_another" : {
                //       "query" : searchQuery,
                //       "max_expansions" : 75
                //     }
                //   }
                // }
              ]
            }
          }
        }
      })
      .then(function (response) {
        console.log("ElasticSearchService#searchItem :: Response :: ", response);
        return resolve(response);
      })
      .catch(function(err) {
        console.log("ElasticSearchService#searchItem :: Error :: ", err);
        return reject(err);
      });
  });
}


function searchItemWithDistance(searchQuery, lat, lon, maxDistance) {
  return Q.promise(function(resolve, reject) {

    maxDistance = maxDistance+"mi";
    elasticSearchClient
      .search({
        index : elasticSearchConfig.index,
        type: "Tool",
        body: {
          "query":{
            "bool":{
              "must":{
                "match": {
                  "field_Name": value
                }
              },
              "should": [
                {
                  "match_phrase_prefix" : {
                    "field_Name" : {
                      "query" : searchQuery,
                      "max_expansions" : 75
                    }
                  }
                }
              ]
            }
          },
          "sort": [
            {
              "_geo_distance": {
                "location": {
                  "lat": lat,
                  "lon": lon
                },
                "order":         "asc",
                "unit":          "mi",
                "distance_type": "plane"
              },
              "script" : "doc[\u0027location\u0027].distanceInKm(lat,lon)"
            }
          ],
          "filter" : {
            "geo_distance_range" : {
              "from" : "0mi",
              "to" : maxDistance,
              "location" : {
                "lat" : lat,
                "lon" : lon
              }
            }
          }
        }
      })
      .then(function (response) {
        console.log("ElasticSearchService#searchItem :: Response :: ", response);
        return resolve(response);
      })
      .catch(function(err) {
        console.log("ElasticSearchService#searchItem :: Error :: ", err);
        return reject(err);
      });
  });
}


function addANewFieldToDocument(referenceId, fieldName){
  return Q.promise(function(resolve, reject) {
    createScriptWithFieldName(fieldName)
    .then(function(script){
      elasticSearchClient
        .update({
          index: elasticSearchConfig.index,
          type: type,
          id: referenceId,
          body: {
            "script" : fieldName
          }
        });
      return resolve();
    })
    .catch(function(err){
      console.log(err);
      return reject(err);
    });
  });
}

function createScriptWithFieldName(fieldName){
  return Q.promise(function(resolve, reject){
    return 'ctx._source.'+fieldname+ '= true';
  });
}

function priceAggregation(searchData, searchQuery){
  return Q.promise(function(resolve,reject){
    var filterCriteria = [];

    if(data.searchQuery){
      filterCriteria.push({
        "bool" : {
          "must":{
            "match": {
              //Field which must match with documentry
              "field_Name": value
            }
          },
          "should" : [
            {
              "match_phrase_prefix" : {
                "field_Name" : {
                  "query" : data.searchQuery,
                  "max_expansions" : 75
                }
              }
            }
          ]
        }
      });
    }

    //Push to filterCriteria array for the fields to add conditions
    //e.g : geo-distance-query
    filterCriteria.push(
      {
        "geo_distance_range" : {
          "from" : searchData.fromDistance ? searchData.fromDistance : "0mi",
          "to" : searchData.toDistance ? searchData.toDistance : searchData.maxDistance,
          "location" : {
            "lat" : searchData.lat, "lon" : searchData.lon
          }
        }
      });

    //e.g : A not query for filtering
    //querying the sent dates do not match a field
    if(searchData.dateValues){
      filterCriteria.push({
        "filtered" : {
          "filter": {
            "not" : {
              // 'terms' is used to compare multiple data
              "terms": {
                "field_Name": value
              }
            }
          }
        }
      });
    }

    elasticSearchClient
      .search({
        index : elasticSearchConfig.index,
        type: "Tool",
        body: {
          "query": {
            "bool": {
              "must": filterCriteria
            }
          },
          //This will give an aggregation of min, max and average
          "aggs": {
            "priceStats": {
              "stats": {
                "field": "field_on_which_aggregation_has_to_be_done"
              }
            }
          }
        }
      })
      .then(function (response) {
        console.log("ElasticSearchService#distanceFilter :: Response :: ", response);
        return resolve(response);
      })
      .catch(function(err) {
        console.log("ElasticSearchService#distanceFilter :: Error :: ", err);
        return reject(err);
      });
  });
}

//Filter on the basis of lower and upper limit
function UpperLowerlimitFilter(lowerLimit, upperLimit){
  return Q.promise(function(resolve, reject){
    elasticSearchClient
      .search({
        index : elasticSearchConfig.index,
        type: "type_Name",
        body: {
          "query": {
            "range" : {
              "field_Name" : {
                "gte" : lowerLimit,
                "lte" : upperLimit
              }
            }
          }
        }
      })
      .then(function (response) {
        console.log("ElasticSearchService#priceFilter :: Response :: ", response);
        return resolve(response);
      })
      .catch(function(err) {
        console.log("ElasticSearchService#priceFilter :: Error :: ", err);
        return reject(err);
      });
  });
}


function updateDocument(referenceId, document){
  return Q.promise(function(resolve, reject){
    elasticSearchClient
      .update({
        index: elasticSearchConfig.index,
        type: "Tool",
        id : referenceId,
        body: {
          "doc" : {
            //Update the fields one by one
            //field1 : document.field1
          }
        }
      })
      .then(function(){
        console.log("ElasticSearchService#updateDocument :: response :: ", response);
        return resolve();
      })
      .catch(function (err) {
        console.log("ElasticSearchService#updateDocument :: Error :: ", err);
        return reject(err);
      });
  });
}

function searchToolByReferenceId(referenceId){
  return Q.promise(function(resolve, reject) {
    elasticSearchClient
      .search({
        index: elasticSearchConfig.index,
        type: "index_Name",
        body: {
          "size": 1,
          query: {
            "filtered": {
              "filter": {
                "match": {
                  "referenceId": referenceId
                }
              }
            }
          }
        }
      })
      .then(function (response) {
        console.log("ElasticSearchService#searchItem :: Response :: ", response);
        return resolve(response);
      })
      .catch(function(err) {
        console.log("ElasticSearchService#searchItem :: Error :: ", err);
        return reject(err);
      });
  });
}
