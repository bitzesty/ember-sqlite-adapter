import Ember from 'ember';

export default Ember.Service.extend({
  /**
   * This method fires up on service initialization, and is responsible for
   * opening the database with the name fetched from the app's configuration file,
   * and then calls the function to create the necessary table.
   *
   * @return {void} Open database and invoke function to create table
   */
  openDatabase: function() {
    var config = this.container.lookupFactory('config:environment');

    this.db = window.sqlitePlugin.openDatabase({name: config.sqlite.db_name + ".db", location: 2});

    this.checkAndCreateTableIfNecessary();
  }.on("init"),

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
      transaction.executeSql('CREATE TABLE IF NOT EXISTS serialized_records (type text, id text, data text)');
    });
  }
});
