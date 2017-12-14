import DS from 'ember-data';
import Ember from 'ember';

export default DS.RESTSerializer.extend({
  serializeBelongsTo: function(snapshot, json, relationship) {
    var key = relationship.key;

    var belongsTo = snapshot.belongsTo(key);

    key = this.keyForRelationship ? this.keyForRelationship(key, "belongsTo", "serialize") : key;

    json[key + "_id"] = Ember.isNone(belongsTo) ? belongsTo : belongsTo.record.get("id");

    return json;
  }
});
