'use strict';

var memstore = require('./index');

function create(opts) {
  opts.standalone = true;

  // TODO if cluster *is* used issue a warning?
  // I suppose the user could be issuing a different filename for each
  // ... but then they have no need to use this module, right?

  return memstore.create(opts);
}

module.exports.create = create;
