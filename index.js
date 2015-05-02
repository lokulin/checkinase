var newrelic = require('newrelic');
var cluster = require('cluster');
var express = require('express');
var http = require('http');
var https = require('https');
var url = require('url');
var numCPUs = require('os').cpus().length;
var app = express();


function getStatus(targetURL, cb) {
    var proto = url.parse(unescape(targetURL)).protocol == 'http:' ? http : https;

    proto.get(targetURL, function(res) {
        res.setEncoding('utf8');

        var body = '';
        res.on('data', function(d) {
            body += d;
        });

        res.on('end', function() {
            try {
                var parsed = JSON.parse(body);
            } catch (err) {
                return cb('Unable to parse response as JSON',null);
            }

            if(parsed.status != null) {
              return cb(null, {
                status: parsed.status
              });
            } else {
              cb("No status attribute in JSON response.",null);
            }
        });
    }).on('error', function(err) {
        cb('Error with requested URL',null);
    });
};


app.set('port', (process.env.PORT || 5000));

app.get('/', function(request, response) {
  var targetURL = request.query.url;
  getStatus(targetURL, function(err,resp){
    if(err === null) {
      return response.send(resp.status);
    } else {
      return response.send('Error: ' + err);
    }
  });
});

if (cluster.isMaster) {
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });
} else {
  app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
  });
}
