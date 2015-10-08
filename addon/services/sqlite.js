import Ember from 'ember';
import QueryBuilder from "../lib/query";

export default Ember.Service.extend({
  /**
   * This method fires up on service initialization, and is responsible for
   * opening the database with the name fetched from the app's configuration file,
   * and then calls the function to create the necessary table.
   *
   * @return {void} Open database and invoke function to create table
   */
  openDatabase: Ember.on('init', function() {
    var config = this.container.lookupFactory('config:environment');

    var db_name = config !== undefined ? config.sqlite.db_name : "my_app_db";

    if (window.cordova) {
      this.db = window.sqlitePlugin.openDatabase({name: db_name + ".db", androidDatabaseImplementation: 2, androidLockWorkaround: 1});
    } else {
      this.db = window.openDatabase(db_name, '1.0', db_name, 1);
    }

    this.checkAndCreateTableIfNecessary();
  }),

  /**
   * This method opens up a transaction to create the table we are going
   * to use to store the data, if it's not already there.
   *
   * We are going to use a single table in order to avoid migrations,
   * and the overhead of needing to have the models definitions every time we
   * need to do any operation.
   *
   * Also, by doing this way, it remains similar to how data is fetched from
   * online sources: getting a JSON and de-serializing it.
   *
   * @return {void} Creates serialized_records table if it doesn't already exist
   */
  checkAndCreateTableIfNecessary: function() {
    this.db.transaction(function(transaction) {
      transaction.executeSql('CREATE TABLE IF NOT EXISTS serialized_records (type text, id text, data blob)');
      transaction.executeSql('CREATE TABLE IF NOT EXISTS images (id text, data blob)');
    });
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
