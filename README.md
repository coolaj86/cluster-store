Cluster Store
=============

A very simple in-memory object store for use with node cluster
(or even completely and unrelated node processes).

Node.js runs on a single core, which isn't very effective.

You can run multiple Node.js instances to take advantage of multiple cores,
but if you do that, you can't share memory between processes.

This module will either run client-server style in environments that benefit from it
(such as the Raspberry Pi 2 with 4 cores), or in-process for environments that don't
(such as the Raspberry Pi B and B+).

**Note**: Most people would probably prefer to just use Redis rather than
wrap a dumb memstore as a service... but I am not most people.

Also works with **level-session-store** (leveldb), **connect-session-knex** (SQLite3),
**session-file-store** (fs), and any other embedded / in-process store.

Usage
=====

The default behavior is to try to connect to a master and, if that fails, to become the master.

However, if you are in fact using the `cluster` rather than spinning up random instances,
you'll probably prefer to use this pattern:

```js
var cluster = require('cluster');
var cstore = require('cluster-store');
var numCores = require('os').cpus().length;

var opts = {
  sock: '/tmp/memstore.sock'

  // If left 'null' or 'undefined' this defaults to a similar memstore
  // with no special logic for 'cookie' or 'expires'
, store: cluster.isMaster && new require('express-session/session/memory')()

  // a good default to use for instances where you might want
  // to cluster or to run standalone, but with the same API
, serve: cluster.isMaster
, connect: cluster.isWorker
, standalone: (1 === numCores) // overrides serve and connect
};

cstore.create(opts).then(function (store) {
  // same api as new new require('express-session/session/memory')(

  store.get(id, function (err, data) {
    console.log(data);
  });

  // app.use(expressSession({ secret: 'keyboard cat', store: store }));
});

process.on('unhandledPromiseRejection', function (err) {
  console.error('Unhandled Promise Rejection');
  console.error(err);
  console.error(err.stack);

  throw err;
});
```

If you wish to always use clustering, even on a single core system, see `test-cluster.js`.

Likewise, if you wish to use standalone mode in a particular worker process see `test-standalone.js`.

API
===

This is modeled after Express'
[Session Store Implementation](https://github.com/expressjs/session#session-store-implementation)

**Note**: These are only exposed if the underlying store supports them.

CRUD methods
------------

* `store.set(id, data, fn)    => (error)`
* `store.get(id, fn)          => (error, data)`
* `store.touch(id, data, fn)  => (error)`
* `store.destroy(id, fn)      => (error)`

Helpers
-------

* `store.all(fn)              => (error, array)`
* `store.clear(fn)            => (error)`
* `store.length(fn)           => (error, length)`

See <https://github.com/expressjs/session#session-store-implementation>@4.x for full details

Standalone / Master Mode is in-process
========================

The `master` in the cluster (meaning `opts.serve = true`) will directly hold the specified store
(a simple memory store by default, or `express-session/session/memory` in the example above)

Likewise, when only one process is being used (`opts.standalone = true`) the listener is
not started and API is completely in-process.

If you take a look at `memstore.js` you'll see that it's a rather simple memory store instance.

Security Warning
================

Note that any application on the system could connect to the socket.

In the future I may add a `secret` field in the options object to be
used for authentication across processes. This would not be difficult,
it's just not necessary for my use case at the moment.
