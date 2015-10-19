import Ember from "ember";

/**
 * Base Migration class
 *
 * This class does quite some things under the hood.
 * Behaves much like the Ember.Test class works, by
 * maintaining a chain of promises, to sort of create
 * a DSL to write sql queries.
 *
 * @class Migration
 */
export default Ember.Object.extend({
  /**
   * The run method is the one, and only one, you should
   * write in your migrations.
   *
   * Inside it, you'll put calls to the execute method, and
   * it'll chain them all together.
   *
   * @method run
   */
  run: Ember.K,
  /**
   * Initialize the promise chain with a resolving
   * promise.
   *
   * This is just so we can chain the first one.
   * @method createInitialPromise
   */
  createInitialPromise: Ember.on("init", function() {
    this.promiseChain = null;

    this.promiseChain = new Ember.RSVP.Promise(function(resolve) {
      resolve();
    });
  }),
  /**
   * Executes an sql statement, prepared or not,
   * by chaining it to the last promise
   *
   * @param  {String} sql            SQL Statement
   * @param  {Array} preparedInputs  Input data to prepared statement
   * @return {Promise}
   */
  execute: function(sql, preparedInputs) {
    var _this = this;

    this.promiseChain = this.promiseChain.then(function() {
      return new Ember.RSVP.Promise(function(resolve) {
        _this.db.transaction(function(tx) {
          tx.executeSql(sql, preparedInputs, function(tx, res) {
            resolve(res);
          });
        }, function(tx, error) {
          console.error(arguments);
        });
      });
    });

    return this.promiseChain;
  },
  /**
   * Resolves the promise that the migration runner
   * creates to know this migration is done
   *
   * @method done
   */
  done: function() {
    var resolve = this._resolve;

    this.promiseChain.then(resolve);
  },
  /**
   * Method called by the migration runner.
   * Receives a db connection and instruments the
   * main run method
   *
   * @param  {SQLConnection} transaction WebSQL or SQlite connection
   * @return {Promise}
   */
  _internalRun: function(db) {
    var _this = this;
    this.db = db;

    return new Ember.RSVP.Promise(function(resolve) {
      _this._resolve = resolve;
      _this.run();
    });
  }
});
