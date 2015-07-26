'use strict';

/*global Promise*/
var defer;

if ('function' === typeof setImmediate) {
  defer = setImmediate;
} else {
  defer = function (fn) { process.nextTick(fn.bind.apply(fn, arguments)); };
}

function create(/*opts*/) {
  // don't leak prototypes as implicitly non-null
  var db = Object.create(null);

  return Promise.resolve({
    // required / recommended
    set: function (id, data, fn) {
      db[id] = data;

      if (!fn) { return; }
      defer(fn, null);
    }
  , get: function (id, fn) {
      if (!fn) { return; }
      defer(fn, null, 'undefined' === typeof db[id] ? null : db[id]);
    }
  , touch: function (id, data, fn) {
      db[id] = data;

      if (!fn) { return; }
      defer(fn, null);
    }
  , destroy: function (id, fn) {
      delete db[id];

      if (!fn) { return; }
      defer(fn, null);
    }
    // optional
  , all: function (fn) {
      if (!fn) { return; }
      defer(fn, null, Object.keys(db).map(function (key) {
        return db[key];
      }));
    }
  , length: function (fn) {
      if (!fn) { return; }
      defer(fn, null, Object.keys(db).length);
    }
  , clear: function (fn) {
      db = Object.create(null);

      if (!fn) { return; }
      defer(fn, null);
    }
  });
}

module.exports.create = create;
