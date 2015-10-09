module.exports = {
  description: 'Generates a new SQLite database migration',

  normalizeEntityName: function(entityName) {
    var now = new Date();

    var name = now.getFullYear().toString();
    name += now.getMonth() + 1;
    name += now.getDate();
    name += now.getHours();
    name += now.getMinutes();
    name += now.getSeconds();

    return name + "-" + entityName;
  }
};
