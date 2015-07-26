'use strict';
/*global Promise*/

var wsses = {};

function createApp(server, options) {
  var promise;

  if (wsses[options.filename]) {
    return Promise.resolve(wsses[options.filename]);
  }

  if (options.store) {
    promise = Promise.resolve(options.store);
  } else {
    promise = require('./memstore').create(options);
  }

  return promise.then(function (db) {
    var url = require('url');
    //var express = require('express');
    //var app = express();
    var wss = server.wss;

    function app(req, res) {
      res.end('NOT IMPLEMENTED');
    }

    function getMethods(db) {
      /*
      var instanceMethods = Object.keys(db)
        .map(function (key) { return 'function' === typeof db[key] ? key : null; })
        .filter(function (key) { return key; })
        ;

      var protoMethods = Object.keys(Object.getPrototypeOf(db))
        .map(function (key) { return 'function' === typeof Object.getPrototypeOf(db)[key] ? key : null; })
        .filter(function (key) { return key; })
        ;

      return instanceMethods.concat(protoMethods);
      */

      return [
        'set', 'get', 'touch', 'destroy'
      , 'all', 'length', 'clear'
      , 'emit', 'on', 'off', 'once'
      , 'removeListener', 'addListener'
      , 'removeEventListener', 'addEventListener'
      ].filter(function (key) {
        if ('function' === typeof db[key]) {
          return true;
        }
      });
    }

    wss.on('connection', function (ws) {
      ws.send(JSON.stringify({
        type: 'methods'
      , methods: getMethods(db)
      }));

      var location = url.parse(ws.upgradeReq.url, true);
      // you might use location.query.access_token to authenticate or share sessions
      // or ws.upgradeReq.headers.cookie (see http://stackoverflow.com/a/16395220/151312

      ws.__session_id = location.query.session_id || Math.random();

      ws.on('message', function (buffer) {
        var cmd;

        try {
          cmd = JSON.parse(buffer.toString('utf8'));
        } catch(e) {
          console.error('[ERROR] parse json');
          console.error(e);
          console.error(buffer);
          console.error();
          ws.send(JSON.stringify({ type: 'error', value: { message: e.message, code: "E_PARSE_JSON" } }));
          return;
        }

        switch(cmd.type) {
          case 'init':
            break;

          case 'rpc':
            if (cmd.hasCallback) {
              cmd.args.push(function () {
                var args = Array.prototype.slice.call(arguments);

                ws.send(JSON.stringify({
                  this: this
                , args: args
                , id: cmd.id
                }));
              });

              // TODO handle 'off' by id
              cmd.args[cmd.args.length - 1].__id = cmd.id;
            }

            db[cmd.func].apply(db, cmd.args);
            break;

          default:
            throw new Error('UNKNOWN TYPE');
            //break;
        }

      });

      ws.send(JSON.stringify({ type: 'session', value: ws.__session_id }));
    });

    app.masterClient = db;
    //wsses[options.filename] = app;

    return app;
  });
}

function create(options) {
  var server = require('http').createServer();
  var WebSocketServer = require('ws').Server;
  var wss = new WebSocketServer({ server: server });
  //var port = process.env.PORT || process.argv[0] || 4080;

  var fs = require('fs');
  var ps = [];

  ps.push(new Promise(function (resolve) {
    fs.unlink(options.sock, function () {
      // ignore error when socket doesn't exist

      server.listen(options.sock, resolve);
    });
  }));

  ps.push(createApp({ server: server, wss: wss }, options).then(function (app) {
    server.on('request', app);
    return { masterClient: app.masterClient };
  }));

  return Promise.all(ps).then(function (results) {
    return results[1];
  });
}

module.exports.create = create;
