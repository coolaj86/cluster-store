'use strict';

function run() {
  var mstore = require('./standalone');

  mstore.create({
      sock: '/tmp/memstore.sock'
    , standalone: null
    , serve: null
    , connect: null
  }).then(function (store) {
    store.set('foo', 'bar', function (err) {
      if (err) { console.error(err); return; }

      store.get('baz', function (err, data) {
        if (err) { console.error(err); return; }
        console.log('should be null:', data);
      });

      store.get('foo', function (err, data) {
        if (err) { console.error(err); return; }
        console.log('should be bar:', data);
      });
    });
  });
}

run();

// The native Promise implementation ignores errors because... dumbness???
process.on('unhandledPromiseRejection', function (err) {
  console.error('Unhandled Promise Rejection');
  console.error(err);
  console.error(err.stack);

  process.exit(1);
});
