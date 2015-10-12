import Migration from "ember-sqlite-adapter/migration";

export default Migration.extend({
  run: function() {
    // they'll be executed in the right order, but on the last one
    // you'll need to call the `done` method:
    //
    // this.execute(sql);
    // this.execute(sql);
    // this.execute(sql, []);
    // this.done();
  }
});
