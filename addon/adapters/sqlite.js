import DS from 'ember-data';
import Ember from "ember";

export default DS.RESTAdapter.extend({
  sqlite: Ember.inject.service(),
  findAll: function(_store, type) {
    return this.get("sqlite").findAll(type);
  },
  findRecord: function(_store, type, id) {
    return this.get("sqlite").findRecord(type, id);
  },
  createRecord: function(store, type, snapshot) {
    return this.get("sqlite").createRecord(store, type, snapshot);
  },
  find: function(store, type, id) {
    return this.get("sqlite").findRecord(type, id);
  },
  query: function(store, type, query) {
    return this.get("sqlite").query(type, query);
  },

  findMany: function(store, type, ids, snapshots) {
    return this.query(store, type, {
      id: ids
    });
  },

  /**
    Called by the store in order to fetch a JSON object for
    the record that matches a particular query.
    The `queryRecord` method makes an Ajax (HTTP GET) request to a URL
    computed by `buildURL`, and returns a promise for the resulting
    payload.
    The `query` argument is a simple JavaScript object that will be passed directly
    to the server as parameters.
    @method queryRecord
    @param {DS.Store} store
    @param {DS.Model} type
    @param {Object} query
    @return {Promise} promise
  */
  queryRecord: function(store, type, query) {
    return this.get("sqlite").query(type, query);
  },

  updateRecord: function(store, type, snapshot) {
    return this.get("sqlite").updateRecord(store, type, snapshot.id, snapshot);
  },
  deleteRecord: function(store, type, snapshot) {
    var id = snapshot.id;

    return this.get("sqlite").deleteRecord(type, id);
  },
});
