import Ember from "ember";

export default Ember.Object.extend({
  transaction: null,
  run: Ember.K,
  execute: function(sql, preparedInputs) {

  }
});
