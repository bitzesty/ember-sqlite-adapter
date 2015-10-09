import Migration from "ember-sqlite-adapter/migration";

export default Migration.extend({
  run: function() {
    // var done = this.done;
    //
    // ** if you need the results:
    // this.execute(sql).then((res) => {
    //   done();
    // });
    //
    // ** otherwise, just put them line by line,
    // they'll be executed in the right order, but on the last one
    // you'll need to call the `done` function on the callback:
    //
    // this.execute(sql);
    // this.execute(sql);
    // this.execute(sql, []).then(function() {
    //   done();
    // });
  }
});
