import Ember from 'ember';
import QueryBuilder from "../lib/query";

/* global requirejs */

export default Ember.Service.extend({
  /**
   * This method is responsible for
   * opening the database with the name fetched from the app's configuration file,
   * and then calls the function to create the necessary table.
   *
   * @return {void} Open database and invoke function to create table
   */
  openDatabase: function() {
    var _this = this;

    return new Ember.RSVP.Promise(function(resolve, reject) {
      var config = _this.container.lookupFactory('config:environment');

      var db_name = config !== undefined ? config.sqlite.db_name : "my_app_db";

      if (window.cordova && window.sqlitePlugin !== undefined) {
        _this.db = window.sqlitePlugin.openDatabase({name: db_name + ".db", androidDatabaseImplementation: 2, androidLockWorkaround: 1});
      } else {
        // WebSQL
        _this.db = window.openDatabase(db_name, '1.0', db_name, 1);
      }

      _this.checkCreateTables(_this.container).then(resolve, reject);
    });
  },

  /**
   * This method creates the migrations table if it doesn't exist, and then
   * loop through the migrations folder in the app, checking which ones need to run,
   * and run the ones that need to.
   *
   * @return {void} Run migrations if needed
   */
  checkCreateTables: function() {
    var _this = this;

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        transaction.executeSql('CREATE TABLE IF NOT EXISTS migrations (id integer, date integer)');

        var migrations = _this.getMigrations();

        var timestamps = migrations.map(function(name) {
          return name.split("-")[0];
        });

        transaction.executeSql("SELECT * FROM migrations WHERE id IN (?)", [timestamps], function(tx, res) {
          var alreadyExecuted = [];

          for (var i = 0; i < res.rows.length; i++) {
            alreadyExecuted.push(res.rows.item(i).id + "");
          }

          var lastPromise = new Ember.RSVP.Promise(function(resolve) {
            resolve();
          });

          migrations.forEach(function(name) {
            var migration = _this.container.lookup("migration:" + name);
            var timestamp = name.split("-")[0];

            if (alreadyExecuted.indexOf(timestamp) === -1) {
              Ember.debug("Executing migration of id: " + timestamp);
              lastPromise = lastPromise.then(function() {
                var promise = migration._internalRun(transaction);
                promise.then(function() {
                  _this.db.transaction(function(tx) {
                    tx.executeSql("INSERT INTO migrations (id, date) VALUES (?, ?)", [timestamp, new Date().getTime()]);
                  }, function(error) {
                    reject(error);
                  });
                });

                return promise;
              });
            }
          });

          lastPromise.then(function() {
            resolve();
          });
        });
      }, function(error) {
        Ember.debug(error);
        reject();
      });
    });
  },

  /**
   * Function shamelessly copied over
   * from ember-i18n code to fetch locales.
   *
   * We're doing the same except we are filtering jshint temp
   * files and test ones as well.
   *
   * TODO: check if we need to keep test ones
   * @return {Array} Array of model names
   */
  getModelNames: function() {
    var matchKey = '/models/(.+)$';
    return Object.keys(requirejs.entries)
    .reduce((models, module) => {
      var match = module.match(matchKey);
      if (match) {
        models.pushObject(match[1]);
      }
      return models;
    }, Ember.A())
    .filter(function(match) {
      return match.indexOf("-test") === -1 && match.indexOf(".jshint") === -1;
    });
  },

  /**
   * Function shamelessly copied over
   * from ember-i18n code to fetch locales.
   *
   * We're doing the same except we are filtering jshint temp
   * files and test ones as well.
   *
   * TODO: check if we need to keep test ones
   * @return {Array} Array of model names
   */
  getMigrations: function() {
    var matchKey = '/migrations/(.+)$';
    return Object.keys(requirejs.entries)
    .reduce((migrations, module) => {
      var match = module.match(matchKey);
      if (match) {
        migrations.pushObject(match[1]);
      }
      return migrations;
    }, Ember.A())
    .filter(function(match) {
      return match.indexOf("-test") === -1 && match.indexOf(".jshint") === -1;
    })
    .sort();
  },

  findAll: function(type) {
    var _this = this;

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        transaction.executeSql("SELECT * from serialized_records WHERE type = '" + type.modelName + "';", [], function(tx, res) {
          var rows = [];

          for (var i = 0; i < res.rows.length; i++) {
            rows.push(JSON.parse(res.rows.item(i).data || "{}"));
          }

          Ember.run(null, resolve, rows);
        }, function(e) {
          Ember.run(null, reject, e);
        });
      });
    });
  },

  findRecord: function(type, id) {
    var _this = this;

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        transaction.executeSql("SELECT * from serialized_records WHERE type = ? AND id = ?;", [type.modelName, id], function(tx, res) {
          if (res.rows.length === 0) {
            return reject("Not found");
          }

          var row = JSON.parse(res.rows.item(0).data || "{}");

          resolve(row);
        }, function(e) {
          reject(e);
        });
      });
    });
  },

  createRecord: function(store, type, snapshot) {
    var data = {};
    var serializer = store.serializerFor(type.modelName);
    var _this = this;

    serializer.serializeIntoHash(data, type, snapshot, { includeId: true });

    data.id = window.shortid.generate();

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        var sql = "INSERT INTO serialized_records (type, id, data) VALUES (?, ?, ?);";
        var params = [type.modelName, data.id, JSON.stringify(data)];

        transaction.executeSql(sql, params, function(tx, res) {
          if (res.rowsAffected === 0) {
            return reject("Insert failed");
          }

          resolve(data);
        }, function(e) {
          reject(e);
        });
      });
    });
  },
  updateRecord: function(type, id, data) {
    var _this = this;
    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        var sql = "UPDATE serialized_records SET data = ? WHERE id = ? AND type = ?;";
        var params = [JSON.stringify(data), id, type];

        transaction.executeSql(sql, params, function(tx, res) {
          if (res.rowsAffected === 0) {
            return reject("Update failed");
          }

          resolve(data);
        }, function(e) {
          reject(e);
        });
      });
    });
  },
  deleteRecord: function(type, id, data) {
    var _this = this;
    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        var sql = "DELETE FROM serialized_records WHERE id = ? AND type = ?;";
        var params = [id, type];

        transaction.executeSql(sql, params, function(tx, res) {
          if (res.rowsAffected === 0) {
            return reject("DELETE failed");
          }

          resolve(data);
        }, function(e) {
          reject(e);
        });
      });
    });
  },

  // not the adapters query, but rather a query builder
  query: function() {
    return QueryBuilder.create({
      connection: this.db
    });
  }
});
