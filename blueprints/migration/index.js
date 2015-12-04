module.exports = {
  description: 'Generates a new SQLite database migration',

  normalizeEntityName: function(entityName) {
    var now = new Date();

    var name = now.getFullYear().toString();
    name += this.padZero(now.getMonth() + 1, 2);
    name += this.padZero(now.getDate(), 2);
    name += this.padZero(now.getHours(), 2);
    name += this.padZero(now.getMinutes(), 2);
    name += this.padZero(now.getSeconds(), 2);

    return name + "-" + entityName;
  },
  padZero: function(str, places) {
    str = str + ""; // in case of a number
    if (str.length < places) {
      while (str.length < places) {
        str = "0" + str;
      }
    }

    return str;
  }
};
