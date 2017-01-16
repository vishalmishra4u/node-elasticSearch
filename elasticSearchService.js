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
  // securityDepositFilter : securityDepositFilter,
  // priceFilter : priceFilter,
  // deliveryFilter : deliveryFilter,
  // distanceFilter : distanceFilter,
  // toolFilter : toolFilter,
  // checkIfBlockedDates : checkIfBlockedDates
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

function securityDepositFilter(conditionPara){
  return Q.promise(function(resolve, reject){

    switch (conditionPara){
      case 1:
        elasticSearchClient
          .search({
            index : elasticSearchConfig.index,
            type: "Tool",
            body: {
              query:{
                "filtered":{
                  "filter":{
                    "match":{
                      "isSecurityDeposit" : true
                    }
                  }
                }
              }
            }
          })
          .then(function (response) {
            console.log("ElasticSearchService#securityDepositFilter :: Response :: ", response);
            return resolve(response);
          })
          .catch(function(err) {
            console.log("ElasticSearchService#securityDepositFilter :: Error :: ", err);
            return reject(err);
          });
        break;
      case 2:
        elasticSearchClient
          .search({
            index : elasticSearchConfig.index,
            type: "Tool",
            body: {
              query:{
                "filtered":{
                  "filter":{
                    "match":{
                      "isSecurityDeposit" : false
                    }
                  }
                }
              }
            }
          })
          .then(function (response) {
            console.log("ElasticSearchService#securityDepositFilter :: Response :: ", response);
            return resolve(response);
          })
          .catch(function(err) {
            console.log("ElasticSearchService#securityDepositFilter :: Error :: ", err);
            return reject(err);
          });
        break;
      default :
        return null;
    }
  });
}

function priceFilter(priceLow, priceHigh){
  return Q.promise(function(resolve, reject){
    elasticSearchClient
      .search({
        index : elasticSearchConfig.index,
        type: "Tool",
        body: {
          "query": {
            "range" : {
              "price" : {
                "gte" : priceLow,
                "lte" : priceHigh
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

function deliveryFilter(){
  return Q.promise(function(resolve, reject){
    elasticSearchClient
      .search({
        index : elasticSearchConfig.index,
        type: "Tool",
        body: {
          query:{
            "filtered":{
              "filter":{
                "match":{
                  "isDeliveryAvailable" : true
                }
              }
            }
          }
        }
      })
      .then(function (response) {
        console.log("ElasticSearchService#deliveryFilter :: Response :: ", response);
        return resolve(response);
      })
      .catch(function(err) {
        console.log("ElasticSearchService#deliveryFilter :: Error :: ", err);
        return reject(err);
      });
  });
}

function distanceFilter(lowRange, highRange, lat, lon){
  return Q.promise(function(resolve, reject){
    elasticSearchClient
      .search({
        index : elasticSearchConfig.index,
        type: "Tool",
        body: {
          "filter" : {
            "geo_distance_range" : {
              "from" : lowRange,
              "to" : highRange,
              "location" : {
                "lat" : lat,
                "lon" : lon
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

function toolFilter(toolFilterData, dateValues, categories){

  return Q.promise(function(resolve, reject){
    var fromDistance = toolFilterData.fromDistance ? toolFilterData.fromDistance : "0mi";
    var toDistance = toolFilterData.toDistance ? toolFilterData.toDistance : elasticSearchConfig.maxDistance;
    var filterCriteria = [
      "_score" ,
      {
        "geo_distance_range" : {
          "from" : fromDistance ? fromDistance : "0mi",
          "to" : toDistance ? toDistance : elasticSearchConfig.maxDistance,
          "location" : {
            "lat" : toolFilterData.lat,
            "lon" : toolFilterData.lon
          }
        }
      }
    ];

    if(toolFilterData.isDeliveryAvailable === "true") {
      filterCriteria.push({
        "term":{
          "isDeliveryAvailable" : toolFilterData.isDeliveryAvailable
        }
      });
    }

    if(toolFilterData.isPickUpAvailable === "true") {
      filterCriteria.push({
        "term":{
          "isPickUpAvailable" : toolFilterData.isPickUpAvailable
        }
      });
    }

    if(toolFilterData.isExcludeSecurityDeposit === "true") {
      filterCriteria.push({
        "term": {
          "isSecurityDeposit" : false
        }
      });
    }

    if(categories){
      filterCriteria.push({
        "query":{
          "terms" : {
            "categoryReferenceId" : Array.isArray(categories) ? categories : [ categories ]
          }
        }
      });
    }

    if(dateValues){
      filterCriteria.push({
        "filtered" : {
          "filter": {
            "not" : {
              "terms": {
                "blockedDates": dateValues
              }
            }
          }
        }
      });
    }

    if(dateValues){
      filterCriteria.push({
        "filtered" : {
          "filter": {
            "not" : {
              "terms": {
                "bookedDates": dateValues
              }
            }
          }
        }
      });
    }

    filterCriteria.push({
      "term" : {
        "isActive" : true
      }
    });

    if(toolFilterData.searchQuery) {
      filterCriteria.push({
        "bool": {
          "should": [
            {
              "match_phrase_prefix" : {
                "name" : {
                  "query" : toolFilterData.searchQuery,
                  "max_expansions" : 50
                }
              }
            },
            {
              "match_phrase_prefix" : {
                "manufacturer" : {
                  "query" : toolFilterData.searchQuery,
                  "max_expansions" : 50
                }
              }
            },
            {
              "match_phrase_prefix" : {
                "category" : {
                  "query" : toolFilterData.searchQuery,
                  "max_expansions" : 50
                }
              }
            }
          ]
        }
      });
    }

    if(toolFilterData.rating) {
      filterCriteria.push({
        "nested" : {
          "path" : "reviews", "query" : {
            "range" : {
              "reviews.avgRating" : {
                "gte" : toolFilterData.rating,"lte" : "5"}
            }
          }
        }
      });
    }

    if(toolFilterData.priceLowerRange && toolFilterData.priceUpperRange){
      filterCriteria.push({
        "range" : {
          "price": {
            "gte": toolFilterData.priceLowerRange,
            "lte": toolFilterData.priceUpperRange}
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
              must: filterCriteria
            }
          },
          "sort": [
            {
              "_geo_distance": {
                "location": {
                  "lat":  toolFilterData.lat,
                  "lon": toolFilterData.lon
                },
                "order":         "asc",
                "unit":          "mi",
                "distance_type": "plane"
              }
            }
          ]
        }
      })
      .then(function (response) {
        console.log("ElasticSearchService#toolFilter :: Response :: ", response);
        return resolve(response);
      })
      .catch(function(err) {
        console.log("ElasticSearchService#toolFilter :: Error :: ", err);
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

function checkIfBlockedDates(referenceId, dateValues) {
  return Q.promise(function(resolve, reject) {
    elasticSearchClient
      .search({
        index: elasticSearchConfig.index,
        type: "Tool",
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
        var data = [];
        var isBlocked = false;
        _.forEach(response.hits.hits, function(hit) {
          data.push(hit._source);
        });

        _.forEach(data[0].blockedDates, function(dates){
          _.forEach(dateValues, function(rentalDate){
            if(dates === rentalDate){
              isBlocked = true;
              return reject({
                code : 400,
                message: 'INITIALIZE_RENTAL_NOT_POSSIBLE_DUE_TO_BLOCKED_DATES'
              });
            }
          });
        });

        _.forEach(data[0].bookedDates, function(dates){
          _.forEach(dateValues, function(rentalDate){
            if(dates === rentalDate){
              isBlocked = true;
              return reject({
                code : 400,
                message: 'INITIALIZE_RENTAL_NOT_POSSIBLE_DUE_TO_BOOKED_DATES'
              });
            }
          });
        });

        console.log("ElasticSearchService#searchItem :: Response :: ", response);
        var newResponse = {
          isBlocked : isBlocked,
          tool : data
        };

        return resolve(newResponse);
      })
      .catch(function(err) {
        console.log("ElasticSearchService#searchItem :: Error :: ", err);
        return reject(err);
      });
  });
}
