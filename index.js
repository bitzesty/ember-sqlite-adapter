/* jshint node: true */
'use strict';

module.exports = {
  name: 'ember-sqlite-adapter',
  isDevelopingAddon: function() {
    return true;
  },
  included: function(app) {
    this._super.included(app);

    app.import('vendor/shortid.js');
  }
};
