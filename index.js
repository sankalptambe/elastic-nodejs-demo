require('dotenv').config()

//require the Elasticsearch librray
const elasticsearch = require('elasticsearch');
// instantiate an elasticsearch client
const client = new elasticsearch.Client({
   cloud: {
      id: 'name:'+ process.env.DB_ID,
    },
    auth: {
      username: process.env.DB_USER,
      password: process.env.DB_PASS
    }
   hosts: [process.env.DB_HOST]
});

//require Express
const express = require( 'express' );
// instanciate an instance of express and hold the value in a constant called app
const app     = express();
//require the body-parser library. will be used for parsing body requests
const bodyParser = require('body-parser')
//require the path library
const path    = require( 'path' );

// ping the client to be sure Elasticsearch is up
client.ping({
     requestTimeout: 30000,
 }, function(error) {
 // at this point, eastic search is down, please check your Elasticsearch service
     if (error) {
         console.error('elasticsearch cluster is down!');
     } else {
         console.log('Everything is ok');
     }
 });


// use the bodyparser as a middleware  
app.use(bodyParser.json())
// set port for the app to listen on
app.set( 'port', process.env.PORT || 3001 );
// set path to serve static files
app.use( express.static( path.join( __dirname, 'public' )));

// enable CORS 
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// defined the base route and return with an HTML file called tempate.html
app.get('/', function(req, res){
  res.sendFile('template.html', {
     root: path.join( __dirname, 'views' )
   });
})

// define the /search route that should return elastic search results 
app.get('/search', function (req, res){
  // declare the query object to search elastic search and return only 200 results from the first result found. 
  // also match any data where the name is like the query string sent in

  let body = {
    'size': 20,
    "query": {
      "match": {
         "name": {
            // "query": "*"+req.query['q']+"*",
            "query": req.query['q'],
            // "operator": "and"
         }
      }
    },
	  "suggest" : {
      "mysuggestion" : {
        "text" : req.query['q'],
        "term" : {
          "field" : "name"
        }
      }
    },
	  'highlight': {
      "pre_tags" : ["<em style='color:blue'>"],
      "post_tags" : ["</em>"],
	    'fields': {
	      'name': {}
	    }
	  }
	}

  // perform the actual search passing in the index, the search query and the type
  client.search({index:'testing',  body:body})
  .then(results => {

    let data = {'took': results.took, 'hits': results.hits, 'suggest': results.suggest.mysuggestion}
    res.send(data);
  })
  .catch(err=>{
    console.log(err)
    res.send([]);
  });

})


// define the /search route that should return elastic search results 
app.post('/record', function (req, res){

  console.log(req.body.ip, req.body.name, req.body.product_id)

  var dateTime = require('node-datetime');
  var dt = dateTime.create();
  var formatted = dt.format('Y-m-d H:M:S');


  client.index({
    index:'user_behaviour',  
    body:{
      'ip': req.body.ip,
      'product_id': req.body.product_id,
      'name': req.body.name,
      'date': formatted
    }
  })
  .then(results => {
    res.send(results);
  })
  .catch(err=>{
    console.log(err)
    res.send([]);
  });


})

// define the /search route that should return elastic search results 
app.get('/recent-searches', function (req, res){
  // declare the query object to search elastic search and return only 200 results from the first result found. 
  // also match any data where the name is like the query string sent in

  let body = {
    'size': 10,
    "query": {
      "bool": {
        "filter": [
          { "term": { "ip":  req.query['ip']  }}
        ]
      }
    },
    "sort": [
      {
        "date": {
          "order": "desc"
        }
      }
    ]
  }

  // perform the actual search passing in the index, the search query and the type
  client.search({index:'user_behaviour',  body:body})
  .then(results => {

    res.send(results.hits);
  })
  .catch(err=>{
    console.log(err.status)
  });

})

// listen on the specified port
app .listen( app.get( 'port' ), function(){
  console.log( 'Express server listening on port ' + app.get( 'port' ));
} );