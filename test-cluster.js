'use strict';

var cluster = require('cluster');
//var numCores = 2;
var numCores = require('os').cpus().length;
var id = (cluster.isMaster && '0' || cluster.worker.id).toString();

function run() {
  var mstore = require('./cluster');

  return mstore.create({
      standalone: null
    , serve: null
    , connect: null
  }).then(function (store) {
    store.set('foo', 'bar', function (err) {
      if (err) { console.error(err); return; }

      store.get('baz', function (err, data) {
        if (err) { console.error(err); return; }
        console.log(id, 'should be null:', data);
      });

      store.get('foo', function (err, data) {
        if (err) { console.error(err); return; }
        console.log(id, 'should be bar:', data);
      });
    });
  });
}

if (cluster.isMaster) {
  // not a bad idea to setup the master before forking the workers
  run().then(function () {
    var i;

    for (i = 1; i <= numCores; i += 1) {
      cluster.fork();
    }
  });
} else {
  run();
}

// The native Promise implementation ignores errors because... dumbness???
process.on('unhandledPromiseRejection', function (err) {
  console.error('Unhandled Promise Rejection');
  console.error(err);
  console.error(err.stack);

  process.exit(1);
});
