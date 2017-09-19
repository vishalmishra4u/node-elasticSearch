# node-elasticSearch
A node module to access the elasticsearch documents by using various functions to index, search, update, delete and various other tasks.

## Getting Started:

1. __Index the document. It takes two params__ :  
  a) type : __type__ of the elastic  
  b) item : Document to be indexed

```
function indexItem(type, item) {
        elasticSearchClient
            .index({
              index: elasticSearchConfig.index,
              type: type,
              id : item.referenceId,
              body: item
          })
}  
```

2. __Delete the document:__  
Replace the __index_Name__ & __type_Name__ with the name and type of your index
```
  function deleteDocumentFromElastic(referenceId){
      var url = 'http://localhost:9200/'+ index_Name + '/' + type_Name + '/ss'+ referenceId;
      request.delete(url, function (error, response, body) {
        if(error) {
          console.log("ElasticSearchService#deleteToolFromElastic :: Error :: ", error);
          return reject(error);
          }
        });
    }
```

3. __Search a document by a search query__

```
elasticSearchClient.search({
  index: elasticSearchConfig.index,
  type: type_of_index,//Index name will come here
  body: {
    "query": {
      "bool": {
        "must": {
          "match": {
            "field_Name": value
          }
        },
        //Add one or more match_phrase_prefix with more fields
        //The max_expansions parameter controls how many terms the prefix is allowed to match
        "should": [
          {
            "match_phrase_prefix": {
              "field_Name": {
                "query": searchQuery,
                "max_expansions": 75
              }
            }
          }
        ]
      }
    }
  }
})
```
4. __Search a document by search query and filter on distance__
```
  var maxDistance = maxDistance+"mi";
  elasticSearchClient.search({
  index: __index_name__,
  type: __type_of_index__,
  body: {
    "query": {
      "bool": {
        "must": {
          "match": {
            "field_Name": value
          }
        },
        "should": [
          {
            "match_phrase_prefix": {
              "field_Name": {
                "query": searchQuery,
                "max_expansions": 75
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
          "order": "asc",
          "unit": "mi",
          "distance_type": "plane"
        },
      }
    ],
    "filter": {
      "geo_distance_range": {
        "from": minDistance,
        "to": maxDistance,
        "location": {
          "lat": lat,
          "lon": lon
        }
      }
    }
  }
})
```

5. __Add a field in Existing document__

```
var fieldname='ctx._source.'+fieldname+'= true';
elasticSearchClient.update({
  index: __index_name__,
  type: __type_of_index__,
  id: referenceId,
  body: {
    "script": fieldName
  }
});

```

```
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
```
