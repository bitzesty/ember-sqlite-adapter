import Ember from 'ember';
import QueryBuilder from "../lib/query";
import Inflector from 'ember-inflector';
import {singularize, pluralize} from 'ember-inflector';
import uuid from "../lib/uuid";

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
    this.schemaCache = {};

    return new Ember.RSVP.Promise(function(resolve, reject) {
      var config = _this.container.lookupFactory('config:environment');

      var db_name = config !== undefined ? config.sqlite.db_name : "my_app_db";

      if (window.cordova && window.sqlitePlugin !== undefined) {
        _this.db = window.sqlitePlugin.openDatabase({name: db_name + ".db"});
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

        transaction.executeSql("SELECT * FROM migrations", [], function(tx, res) {
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
                var promise = migration._internalRun(_this.db);
                promise.then(function() {
                  _this.db.transaction(function(tx) {
                    tx.executeSql("INSERT INTO migrations (id, date) VALUES (?, ?)", [timestamp, new Date().getTime()]);
                  }, function(error) {
                    console.log(error);
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
        console.error(error);
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

  pluralizeModelName: function(modelName) {
    return pluralize(modelName).underscore();
  },

  query: function(type, options) {
    var _this = this;
    var plural = this.pluralizeModelName(type.modelName);
    var params = [];

    var keywords = ["limit", "offset"];

    var query = QueryBuilder.create();
    query.from(plural);

    if (options.page !== undefined) {
      per_page = options.per_page || 10;

      query.limit(per_page);
      query.offset((options.page - 1) * per_page);
    }

    Object.keys(options).filter(function(k) {
      return keywords.indexOf(k) === -1;
    }).forEach(function(key) {
      query.where([key, "?"]);
      params.push(options[key]);
    });

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        var sql = query.buildSQL();

        Ember.debug(sql);
        transaction.executeSql(sql, params, function(tx, res) {
          var rows = [];

          for (var i = 0; i < res.rows.length; i++) {
            rows.push(res.rows.item(i));
          }

          var response = {};
          response[plural] = rows;

          Ember.run(null, resolve, response);
        });
      }, function(tx, e) {
        console.error(e);
        Ember.run(null, reject, e);
      });
    });
  },

  findAll: function(type) {
    var _this = this;
    var plural = this.pluralizeModelName(type.modelName);

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        transaction.executeSql("SELECT * from '" + plural + "'", [], function(tx, res) {
          var rows = [];

          for (var i = 0; i < res.rows.length; i++) {
            var row = res.rows.item(i);
            row._id = row.id;
            rows.push(row);
          }

          var response = {};
          response[plural] = rows;

          Ember.run(null, resolve, response);
        }, function(tx, e) {
          console.error(e);
          Ember.run(null, reject, e);
        });
      });
    });
  },

  findRecord: function(type, id) {
    var _this = this;
    var plural = this.pluralizeModelName(type.modelName);

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        transaction.executeSql("SELECT * from '" + plural + "' WHERE id = ?;", [id], function(tx, res) {
          if (res.rows.length === 0) {
            reject("Not found");
            return;
          }

          var response = {};
          var coreData = {};
          Object.keys(res.rows.item(0)).forEach(function(key) {
            coreData[key] = res.rows.item(0)[key];
          });
          coreData._id = coreData.id;
          response[type.modelName] = coreData;
          resolve(response);
        }, function(tx, e) {
          console.log(arguments);
          reject(e);
        });
      });
    });
  },

  createRecord: function(store, type, snapshot) {
    var data = {};
    var serializer = store.serializerFor(type.modelName);
    var _this = this;

    var data = snapshot.serialize({ includeId: true });

    if (data.id === undefined) {
      data.id = uuid();
    }
    var plural = this.pluralizeModelName(type.modelName);
    var columnNames = Object.keys(data);

    return new Ember.RSVP.Promise(function(resolve, reject) {
      // as it's an insert, it is important that the order of arguments is right
      var insertData = columnNames.map(function(column) {
        return data[column] || null;
      });

      var prepParams = insertData.map(() => "?").join(", ");
      _this.db.transaction(function(transaction) {
        var sql = "INSERT INTO '" + plural + "' (" + columnNames.join(", ") + ") VALUES (" + prepParams + ");";


        transaction.executeSql(sql, insertData, function(tx, res) {
          if (res.rowsAffected === 0) {
            return reject("Insert failed");
          }

          var response = {id: data.id};
          response[type.modelName] = data;
          resolve(response);
        }, function(tx, e) {
          console.log(arguments);
          reject(e);
        });
      });
    });
  },
  updateRecord: function(store, type, id, snapshot) {
    var _this = this;
    var plural = this.pluralizeModelName(type.modelName);

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.findRecord(type, id).then(function() {
        _this.db.transaction(function(transaction) {
          var data = snapshot.serialize({includeId: true});
          var params = [];
          var updates = Object.keys(data).map(function(key) {
            params.push(data[key]);
            return key + " = ?";
          }).join(", ");
          var sql = "UPDATE " + plural + " SET " + updates + " WHERE id = ?";
          params.push(id);

          transaction.executeSql(sql, params, function(tx, res) {
            var response = {};
            response[type.modelName] = data;
            response[type.modelName].id = id;

            resolve(response);
          }, function(tx, e) {
            console.log(arguments);
            reject(e);
          });
        });
      }, function() {
        _this.createRecord(store, type, snapshot).then(resolve, reject);
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
  /**
   * TODO: add conditions
   */
  count: function(type) {
    var _this = this;
    var plural = this.pluralizeModelName(type);

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        var sql = "SELECT count(*) as c from " + plural;
        transaction.executeSql(sql, [], function(tx, res) {
          resolve(res.rows.item(0).c);
        });
      });
    });
  }
});
