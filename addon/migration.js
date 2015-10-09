import Ember from "ember";

export default Ember.Object.extend({
  run: Ember.K,
  createInitialPromise: Ember.on("init", function() {
    this.promiseChain = null;

    this.promiseChain = new Ember.RSVP.Promise(function(resolve) {
      resolve();
    });
  }),
  execute: function(sql, preparedInputs) {
    var _this = this;

    // var promise = new Ember.RSVP.Promise(function(resolve) {
    //   _this.transaction.executeSql(sql, preparedInputs, function(tx, res) {
    //     resolve(res);
    //   })
    // });

    // this.promiseChain.then(function() {

    // });

    return promise;
  },
  _internalRun: function(transaction) {
    var _this = this;
    this.transaction = transaction;

    return new Ember.RSVP.Promise(function(resolve, _reject) {
      _this.done = resolve;

      _this.run();
    });
  }
});
