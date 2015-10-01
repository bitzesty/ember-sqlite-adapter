import DS from 'ember-data';

export default DS.RESTAdapter.extend({
  findAll: function(_store, type) {
    return this.sqlite.findAll(type);
  },
  findRecord: function(_store, type, id) {
    return this.sqlite.findRecord(type, id);
  },
  createRecord: function(store, type, snapshot) {
    return this.sqlite.createRecord(store, type, snapshot);
  },
  find: function(store, type, id) {
    return this.sqlite.findRecord(type, id);
  },
  updateRecord: function(store, type, snapshot) {
    var data = {};
    var serializer = store.serializerFor(type.modelName);

    serializer.serializeIntoHash(data, type, snapshot, { includeId: true });

    return this.sqlite.updateRecord(type.modelName, snapshot.id, data);
  },
  deleteRecord: function(store, type, snapshot) {
    var id = snapshot.id;
    var data = {};
    var serializer = store.serializerFor(type.modelName);

    serializer.serializeIntoHash(data, type, snapshot, { includeId: true });

    return this.sqlite.deleteRecord(type.modelName, id, data);
  },
});
