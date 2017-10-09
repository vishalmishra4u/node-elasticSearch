# node-elasticSearch
A Github documentation to learn the How-Tos of elasticsearch for indexing, searching, updating, deleting and various other tasks.

## Getting Started:

### Points before going through the document:
1. index_name specifies the index of the elasticsearch being used.
2. type_name specifies the type of the index. (An index may have multiple types)

1. __Index the document__
```
function indexItem(type, item) {
        elasticSearchClient
            .index({
              index: index_name,
              type: type_name,
              id : item.referenceId,
              body: item
          })
}  
```

2. __Delete the document:__
```
  function deleteDocumentFromElastic(referenceId){
      var url = 'http://localhost:9200/'+ index_Name + '/' + type_Name + '/ss'+ referenceId;
      request.delete(url, function (error, response, body) {
        if(error) {
          console.log("ElasticSearchService#deleteToolFromElastic :: Error :: ", error);
          throw new(error);
          }
        });
    }
```

3. __Search a document by a search query__
```
elasticSearchClient.search({
  index: index_name,
  type: type_name,
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
  index: index_name,
  type: type_name,
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
  index: index_name,
  type: type_of_index,
  id: referenceId,
  body: {
    "script": fieldName
  }
});

```

6. __Searching by using all the parameters__
```
var filterCriteria = [];
if(data.searchQuery){
  filterCriteria.push({
    "bool": {
      "must": {
        "match": {
          //Field which must match with documentry
          "field_Name": value
        }
      },
      "should": [
        {
          "match_phrase_prefix": {
            "field_Name": {
              "query": data.searchQuery,
              "max_expansions": 75
            }
          }
        }
      ]
    }
  });
}
//Push to filter Criteria array for the fields to add conditions
//e.g: geo-distance-query
filterCriteria.push({
  "geo_distance_range": {
    "from": fromDistance || "0mi",
    "to": toDistance || maxDistance,
    "location": {
      "lat": lat,
      "lon": lon
    }
  }
});
//e.g: A not query for filtering
//querying the sent dates do not match a field 
if(searchData.dateValues){
  filterCriteria.push({
    "filtered": {
      "filter": {
        "not": {
          //'terms' is used to compare multiple data
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
  index: index_name,
  type: type_name,
  body: {
    "query": {
      "bool": {
        "must": filterCriteria
      }
    },
    //This will give anaggregation of min,max and average
    "aggs": {
      "priceStats": {
        "stats": {
          "field": field_on_which_aggregation_has_to_be_done
        }
      }
    }
  }
})
```

7. __Filter documents on the basis of upper and lower limit__
```
//Filter on the basis of lower and upper limit
elasticSearchClient
  .search({
  index: index_name,
  type: type_Name,
  body: {
    "query": {
      "range": {
        "field_Name": {
          "gte": lowerLimit,
          "lte": upperLimit
        }
      }
    }
  }
})
      
```

8. __Updating elastic documents fields__
```
elasticSearchClient
  .update({
  index: index_name,
  type: type_name,
  id: referenceId,
  body: {
    "doc": {
      //Update the fields one by one
      field1: document.field1
    }
  }
})

```

9. __Filtering the documents on the basis of unique referenceId__
```
elasticSearchClient
  .search({
  index: index_name,
  type: type_name,
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
```
