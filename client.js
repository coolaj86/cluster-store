'use strict';

/*global Promise*/

function startServer(opts) {
  return require('./server').create(opts).then(function (server) {
    // this process doesn't need to connect to itself
    // through a socket
    return server.masterClient;
  });
}

function getConnection(opts) {
  return new Promise(function (resolve) {
    //setTimeout(function () {
      var WebSocket = require('ws');
      var ws = new WebSocket('ws+unix:' + opts.sock);

      ws.on('error', function (err) {
        console.error('[ERROR] ws connection failed, retrying');
        console.error(err);

        function retry() {
          setTimeout(function () {
            getConnection(opts).then(resolve, retry);
          }, 100 + (Math.random() * 250));
        }

        if (!opts.connect && ('ENOENT' === err.code || 'ECONNREFUSED' === err.code)) {
          console.log('[NO SERVER] attempting to create a server #######################');
          return startServer(opts).then(function (client) {
            // ws.masterClient = client;
            resolve({ masterClient: client });
          }, function () {
            retry();
          });
        }

        retry();
      });

      /*
      ws.on('open', function () {
        resolve(ws);
      });
      */
      ws.___listeners = [];
      ws.on('message', function (data) {
        ws.___listeners.forEach(function (fn) {
          try {
            fn(data);
          } catch(e) {
            console.error("[ERROR] ws.on('message', fn) (multi-callback)");
            console.error(e);
            // ignore
          }
        });
      });

      function onInitMessage(str) {
        // TODO there's no way to remove a listener... what to do?
        var data;

        try {
          data = JSON.parse(str);
        } catch(e) {
          console.error('[ERROR]');
          console.error(e);
        }

        if ('methods' !== data.type) {
          return;
        }

        var index = ws.___listeners.indexOf(onInitMessage);
        ws.___listeners.splice(index, 1);
        ws._methods = data.methods;

        resolve(ws);
      }

      ws.___listeners.push(onInitMessage);
    //}, 100 + (Math.random() * 250));
  });
}

function create(opts) {
  if (!opts.sock) {
    opts.sock = '/tmp/memstore' + '.sock';
  }

  var promise;
  var numcpus = require('os').cpus().length;
  if (opts.standalone || (1 === numcpus && !opts.serve && !opts.connect)) {
    return require('./memstore').create(opts);
  }

  function retryServe() {
    return startServer(opts).then(function (client) {
      // ws.masterClient = client;
      return { masterClient: client };
    }, function (err) {
      console.error('[ERROR] retryServe()');
      console.error(err);
      retryServe();
    });
  }

  if (opts.serve) {
    promise = retryServe();
  } else {
    promise = getConnection(opts);
  }

  /*
  if (opts.connect) {
  }
  */

  // TODO maybe use HTTP POST instead?
  return promise.then(function (ws) {
    if (ws.masterClient) {
      return ws.masterClient;
    }

    var db = {};

    function rpc(fname, args) {
      var id;
      var cb;

      if ('function' === typeof args[args.length - 1]) {
        id = Math.random();
        cb = args.pop();
      }

      ws.send(JSON.stringify({
        type: 'rpc'
      , func: fname
      , args: args
      , filename: opts.filename
      , id: id
      }));

      if (!cb) {
        return;
      }

      function onMessage(data) {
        var cmd;

        try {
          cmd = JSON.parse(data.toString('utf8'));
        } catch(e) {
          console.error('[ERROR] in client, from sql server parse json');
          console.error(e);
          console.error(data);
          console.error();

          //ws.send(JSON.stringify({ type: 'error', value: { message: e.message, code: "E_PARSE_JSON" } }));
          return;
        }

        if (cmd.id !== id) {
          return;
        }

        if ('on' !== fname) {
          var index = ws.___listeners.indexOf(onMessage);
          ws.___listeners.splice(index, 1);
        }

        cb.apply(cmd.this, cmd.args);
      }

      ws.___listeners.push(onMessage);
    }

    ws._methods.forEach(function (key) {
      db[key] = function () {
        rpc(key, Array.prototype.slice.call(arguments));
      };
    });

    return db;
  });
}

module.exports.create = create;
