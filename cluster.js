'use strict';

var memstore = require('./index');

function create(opts) {
  var cluster = require('cluster');
  var numCores = require('os').cpus().length;

  if (!opts.serve && ('boolean' !== typeof opts.serve)) {
    opts.serve = (numCores > 1) && cluster.isMaster;
  }

  if (!opts.connect && ('boolean' !== typeof opts.connect)) {
    opts.connect = (numCores > 1) && cluster.isWorker;
  }

  return memstore.create(opts);
}

module.exports.create = create;
