cluster-store
=============

Makes any storage strategy similar to `express/session` useful in both `cluster` and non-`cluster` environments
by wrapping it with `cluster-rpc`.

Also works with **level-session-store** (leveldb), **connect-session-knex** (SQLite3), **session-file-store** (fs),
and any other embedded / in-process store.

Note: Most people would probably prefer to just use Redis rather than wrap a dumb memstore as a service...
but I am not most people.

Install
=======

```
npm install --save memstore-cluster@2.x
```

v1.x vs v2.x
------------

The [old v1](https://github.com/coolaj86/cluster-store/tree/v1.x)
used `ws` which makes it usable when clustering node processes without using `cluster`.

If you need that functionaliy, use v1 instead of v2.

Usage
=====

### standalone (non-cluster)
--------------

The usage is exactly the same as **master**, no changes necessary.

### master

In the **master**/**standalone** process you will create the real store instance
and then in the you must pass each worker via `addWorker()` so that it signals
the worker to create its own rpc-wrapped instance.

```javascript
'use strict';

var cluster = require('cluster');

var cstore = require('cluster-store/master').create({
  name: 'foo-store'
, store: null // use default in-memory store
});

cstore.addWorker(cluster.fork());

cstore.then(function (store) {
  store.set('foo', 'bar');
});
```

Note: `store` can be replaced with any `express/session` store, such as:
  * `new require('express-session/session/memory')()`
  * `require('level-session-store')(session)`
  * and others

### worker

```javascript
'use strict';

// retrieve the instance
var cstore = require('cluster-store/worker').create({
  name: 'foo-store'
});

cstore.then(function (store) {
  store.get('foo', function (err, result) {
    console.log(result);
  });
});
```

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

Example
=======

```javascript
'use strict';

var cluster = require('cluster');
var cstore;


if (cluster.isMaster) {


  cstore = require('./master').create({
    name: 'foo-level'
  });
  cstore.addWorker(cluster.fork());
  cstore.then(function (store) {
    store.put('foo', 'bar');
  });


}
else {


  cstore = require('./worker').create({
    name: 'foo-level'
  });


}


cstore.then(function (store) {
  setTimeout(function () {
    store.get('foo', function (err, result) {
      console.log(cluster.isMaster && '0' || cluster.worker.id.toString(), "store.get('foo')", result);

      if (!cluster.isMaster) {
        process.exit(0);
      }
    });
  }, 250);
});

process.on('unhandledRejection', function (err) {
  console.log('unhandledRejection', err);
});
```
