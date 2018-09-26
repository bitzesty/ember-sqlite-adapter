import Ember from 'ember';
import QueryBuilder from "../lib/query";
import {pluralize} from 'ember-inflector';
import uuid from "../lib/uuid";
const { getOwner } = Ember;

/* global requirejs */

export default Ember.Service.extend({
  store: Ember.inject.service(),
  /**
   * This method is responsible for
   * opening the database with the name fetched from the app's configuration file,
   * and then calls the function to create the necessary table.
   *
   * @return {void} Open database and invoke function to create table
   */
  openDatabase: function(db_name) {
    var _this = this;
    this.schemaCache = {};

    return new Ember.RSVP.Promise(function(resolve, reject) {
      if (window.cordova && window.sqlitePlugin !== undefined) {
        _this.db = window.sqlitePlugin.openDatabase({
          name: db_name + ".db",
          location: 'default'
        });
      } else {
        // WebSQL
        _this.db = window.openDatabase(db_name, '1.0', db_name, 1);
      }

      _this.checkCreateTables(getOwner(_this)).then(resolve, reject);
    });
  },

  close: function() {
    var _this = this;

    this.db = null;
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
        transaction.executeSql('CREATE TABLE IF NOT EXISTS migrations (id text, date text)');

        var migrations = _this.getMigrations();

        transaction.executeSql("SELECT * FROM migrations", [], function(tx, res) {
          var alreadyExecuted = [];

          for (var i = 0; i < res.rows.length; i++) {
            alreadyExecuted.push(res.rows.item(i).id + "");
          }

          var lastPromise = new Ember.RSVP.Promise(function(resolve) {
            resolve();
          });

          migrations.forEach(function(name) {
            var migration = getOwner(_this).lookup("migration:" + name);
            var timestamp = name.split("-")[0];

            if (alreadyExecuted.indexOf(timestamp) === -1) {
              (function(stamp) {
                Ember.debug("Executing migration of id: " + stamp);
                lastPromise = lastPromise.then(function() {
                  var promise = migration._internalRun(_this.db);
                  promise.then(function() {
                    _this.db.transaction(function(tx) {
                      tx.executeSql("INSERT INTO migrations (id, date) VALUES (?, ?)", [stamp, new Date().getTime()]);
                    }, function(error) {
                      console.log(error);
                      reject(error);
                    });
                  });

                  return promise;
                });
              })(timestamp);
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

    var keywords = ["limit", "offset", "sort_by", "sort_order", "per_page", "page"];

    var query = QueryBuilder.create();
    query.from(plural);

    if (options.page !== undefined) {
      var per_page = options.per_page || 10;

      query.limit(per_page);
      query.offset((options.page - 1) * per_page);
    }

    Object.keys(options).filter(function(k) {
      return keywords.indexOf(k) === -1;
    }).forEach(function(key) {
      if (options[key] instanceof Array) {
        let vals = options[key].join("','");
        query.where([`${plural}.${key}`, "IN", `('${vals}')`]);
      } else {
        query.where([`${plural}.${key}`, "?"]);
        params.push(options[key]);
      }
    });

    var dummyRecord = this.get("store").createRecord(type.modelName);
    var snapshot = dummyRecord._createSnapshot();
    var columns = [plural + ".*"];

    var relations = [];

    snapshot.eachRelationship((name, relationship) => {
      if (relationship.kind === "hasMany") {
        var table = _this.pluralizeModelName(relationship.type);

        relations.push({
          table: table,
          column: type.modelName.underscore() + "_id",
          model: this.get("store").modelFor(relationship.type),
          relation: relationship.type.underscore() + "_ids"
        });
      }
    });

    var response = {};
    var coreData = {};

    response[plural] = [];

    query.select(columns);

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        var sql = query.buildSQL();

        Ember.debug(sql);
        transaction.executeSql(sql, params, function(tx, res) {
          var rows = {};

          var _rows = [];
          for (var i = 0; i < res.rows.length; i++) {
            _rows.push(res.rows.item(i));
          }

          _rows.forEach(function(row) {
            if (rows[row.id] === undefined) {
              rows[row.id] = {};
            }

            Object.keys(row).forEach(function(key) {
              if (key.indexOf("__") !== -1) {
                var parts = key.split("__");

                if (rows[row.id][parts[0]] === undefined) {
                  rows[row.id][parts[0]] = [];
                }

                if (row[key]) {
                  rows[row.id][parts[0]].push(row[key]);
                }
              } else {
                rows[row.id][key] = row[key];
              }
            });
          });

          Object.keys(rows).forEach(function(key) {
            response[plural].push(rows[key]);
          });

          var promises = [];

          relations.map(function(relation) {
            response[plural].forEach(function(r) {
              var sql = "SELECT id FROM " + relation["table"] + " WHERE " + relation["column"] + " = ?";
              promises.push(_this.customQuery().executeSQL(sql, [r.id]).then(data => {
                r[relation["table"]] = data.data.map(d => d.id);
              }));
            });
          });

          Ember.RSVP.all(promises).then(function() {
            resolve(response);
          }, reject);
        }, function(tx, e) {
          console.log(e);
          Ember.run(null, reject, e);
        });
      });
    });
  },

  findAll: function(type) {
    var _this = this;
    var plural = this.pluralizeModelName(type.modelName);

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        Ember.debug("SELECT * from '" + plural + "'");
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

  findRecord: async function(type, id) {
    var _this = this;
    var plural = this.pluralizeModelName(type.modelName);

    var dummyRecord = this.get("store").createRecord(type.modelName);
    var snapshot = dummyRecord._createSnapshot();
    var query = QueryBuilder.create();
    var params = [];

    query.from(plural);
    query.where([plural + ".id", "?"]);
    params.push(id);
    var columns = [plural + ".*"];

    var relations = [];

    snapshot.eachRelationship((name, relationship) => {
      if (relationship.kind === "hasMany") {
        var table = _this.pluralizeModelName(relationship.type);

        relations.push({
          table: table,
          column: type.modelName.underscore() + "_id",
          model: this.get("store").modelFor(relationship.type),
          relation: relationship.type.underscore() + "_ids",
          id: id
        });
      }
    });

    var response = {};
    var coreData = {};

    for (var relation of relations) {
      var options = {};

      options[relation["column"]] = relation["id"];
      let resp = await this.query(relation["model"], options);
      response[relation["table"]] = resp[relation["table"]];
      coreData[relation["table"]] = resp[relation["table"]].map((s) => s.id);
    }

    query.select(columns);

    dummyRecord.destroyRecord();

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        var sql = query.buildSQL();
        Ember.debug(sql);
        Ember.debug(params);
        transaction.executeSql(sql, params, function(tx, res) {
          if (res.rows.length === 0) {
            reject("Not found");
            return;
          }


          var _rows = [];
          for (var i = 0; i < res.rows.length; i++) {
            _rows.push(res.rows.item(i));
          }

          _rows.forEach(function(row) {
            Object.keys(res.rows.item(0)).forEach(function(key) {
              coreData[key] = row[key];
            });
          });

          response[type.modelName] = coreData;

          Ember.run.next(this, function() {
            resolve(response);
          });
        }, function(tx, e) {
          console.log(arguments);
          reject(e);
        });
      });
    });
  },

  createRecord: function(store, type, snapshot) {
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

          transaction.executeSql(sql, params, function() {
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
    var plural = this.pluralizeModelName(type.modelName);

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        var sql = "DELETE FROM " + plural + " WHERE id = ?;";
        var params = [id];

        transaction.executeSql(sql, params, function(tx, res) {
          if (res.rowsAffected === 0) {
            return reject("DELETE failed");
          }

          resolve(data);
        }, function(tx, e) {
          console.log(e);
          reject(e);
        });
      });
    });
  },
  count: function(type, conditions) {
    var _this = this;
    var plural = this.pluralizeModelName(type);

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        var sql = "SELECT count(*) as c from " + plural;
        var params = [];

        if (conditions) {
          sql += " WHERE ";
          Object.keys(conditions).forEach(function(k) {
            sql += k + " = ? ";
            params.push(conditions[k]);
          });
        }

        transaction.executeSql(sql, params, function(tx, res) {
          Ember.run(null, resolve, res.rows.item(0).c);
        });
      }, function(tx, error) {
        Ember.run(null, reject, error);
      });
    });
  },
  customQuery: function() {
    return QueryBuilder.create({ connection: this.db });
  },
  customInsert: function(type, data) {
    var _this = this;
    var plural = this.pluralizeModelName(type);
    var sql = "INSERT INTO " + plural + " (";
    sql += Object.keys(data).join(", ");
    sql += ") VALUES (";
    sql += Object.keys(data).map(() => "?");
    sql += ")";
    var values = Object.keys(data).map(k => data[k]);

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        transaction.executeSql(sql, values, function() {
          Ember.run(null, resolve);
        }, function(tx, error) {
          Ember.run(null, reject, error);
        });
      });
    });
  },
  customUpdate: function(type, data) {
    var _this = this;
    var plural = this.pluralizeModelName(type);
    var sql = "UPDATE " + plural + " SET ";
    var mapping = [];
    var values = [];

    // to keep them the same order
    // as traversing objects doesn't always return
    // same ordering
    Object.keys(data).filter(function(k) {
      return k !== "id";
    }).forEach(function(key) {
      mapping.push(key + " = ?");
      values.push(data[key]);
    });

    sql += mapping.join(", ");
    sql += " WHERE id = ?";

    values.push(data.id);

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        Ember.debug(sql, values);
        transaction.executeSql(sql, values, function() {
          Ember.run(null, resolve);
        },function(tx, error) {
          Ember.run(null, reject, error);
        });
      });
    });
  },
  insertOrUpdate: function(type, data) {
    var _this = this;
    var plural = this.pluralizeModelName(type);
    var sql = "SELECT count(*) as c FROM " + plural + " WHERE id = ?";
    Ember.debug(plural);

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        Ember.debug(sql, [data.id]);
        transaction.executeSql(sql, [data.id], function(tx, res) {
          if (res.rows.item(0).c > 0) {
            _this.customUpdate(type, data).then(resolve, reject);
          } else {
            _this.customInsert(type, data).then(resolve, reject);
          }
        }, function(tx, error) {
          Ember.run(null, reject, error);
        });
      });
    });
  },
  generateId: function() {
    return uuid();
  },
  customDelete: function(type, conditions) {
    var _this = this;
    var plural = this.pluralizeModelName(type);
    var sql = "DELETE FROM " + plural + " WHERE ";

    var wheres = [];
    var values = [];
    Object.keys(conditions).forEach(function(key) {
      if (conditions[key] instanceof Array) {
        wheres.push(key + " IN ('" + conditions[key].join("', '") + "')");
      } else {
        if (key.indexOf("NOT") > -1) {
          wheres.push(key + " != ?");
        } else {
          wheres.push(key + " = ?");
        }

        values.push(conditions[key]);
      }
    });

    sql += wheres.join(" AND ");

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.db.transaction(function(transaction) {
        Ember.debug(sql, values);
        transaction.executeSql(sql, values, function() {
          Ember.run(null, resolve);
        }, function(tx, error) {
          Ember.run(null, reject, error);
        });
      });
    });
  }
});
