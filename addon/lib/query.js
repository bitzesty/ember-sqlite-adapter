import Ember from "ember";

export default Ember.Object.extend({
  connection: null,
  options: {
    from: "",
    columns: ["*"],
    joins: [],
    wheres: [],
    orders: [],
    limit: 0,
    offset: 0,
    groups: []
  },
  reset: Ember.on("init", function() {
    this.options = {
      from: "",
      columns: ["*"],
      joins: [],
      wheres: [],
      orders: [],
      limit: 0,
      offset: 0,
      groups: []
    };
  }),
  from: function(table) {
    this.options.from = table;

    return this;
  },
  select: function(columns) {
    this.options.columns = columns;

    return this;
  },
  join: function(joinObj) {
    this.options.joins.push(joinObj);

    return this;
  },
  where: function(whereObj) {
    this.options.wheres.push(whereObj);

    return this;
  },
  limit: function(limit) {
    this.options.limit = limit;

    return this;
  },
  offset: function(offset) {
    this.options.offset = offset;

    return this;
  },
  order: function(column, direction) {
    var directions = ["asc", "desc"];

    if (directions.indexOf(direction) === -1) {
      direction = "asc";
    }

    this.options.orders.push(column + " " + direction);

    return this;
  },
  groupBy: function(column) {
    this.options.groups.push(column);

    return this;
  },
  renderJoin: function(join) {
    var sql = "";

    if (join.type !== undefined) {
      sql += join.type.toUpperCase();
    }

    sql += " JOIN ";
    sql += join.table;

    if (join.conditions !== undefined) {
      sql += " ON ";

      var conditions = [];

      for (var i = 0; i < join.conditions.length; i++) {
        var condition = join.conditions[i];

        var a = null;
        var b = null;
        var op = null;

        if (condition.length === 2) {
          a = condition[0];
          b = condition[1];
          op = "=";
        } else {
          a = condition[0];
          op = condition[1];
          b = condition[2];
        }

        conditions.push(a + " " + op + " " + b);
      }

      sql += conditions.join(" AND ");
    }

    return sql;
  },
  renderWhere: function(where) {
    var a = null;
    var b = null;
    var op = null;

    if (where.length === 2) {
      a = where[0];
      b = where[1];
      op = "=";
    } else {
      a = where[0];
      op = where[1];
      b = where[2];
    }

    return a + " " + op + " " + b;
  },
  buildSQL: function() {
    var sql = "SELECT ";

    sql += this.options.columns.join(", ");
    sql += " FROM " + this.options.from;

    // for in is safe for arrays
    for (var j = 0; j < this.options.joins.length; j++) {
      sql += " " + this.renderJoin(this.options.joins[j]);
    }

    if (this.options.wheres.length > 0) {
      sql += " WHERE ";

      var wheres = [];

      for (var i = 0; i < this.options.wheres.length; i++) {
        wheres.push(this.renderWhere(this.options.wheres[i]));
      }

      sql += wheres.join(" AND ");
    }

    if (this.options.groups.length > 0) {
      sql += " GROUP BY " + this.options.groups.join(", ");
    }

    if (this.options.orders.length > 0) {
      sql += " ORDER BY " + this.options.orders.join(", ");
    }

    if (this.options.limit > 0) {
      sql += " LIMIT " + this.options.limit;
    }

    if (this.options.offset > 0) {
      sql += " OFFSET " + this.options.offset;
    }

    return sql;
  },
  execute: function(inputPreparedStatement) {
    inputPreparedStatement = inputPreparedStatement || [];

    var sql = this.buildSQL();
    this.lastSQL = sql;

    Ember.debug("[SQLITE ADAPTER SQL] " + sql);

    var _this = this;

    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.connection.transaction(function(tx) {
        tx.executeSql(sql, inputPreparedStatement, function(tx, res) {
          var result = {rows: res.rows.length, data: []};

          for (var i = 0; i < res.rows.length; i++) {
            result.data.push(res.rows.item(i));
          }

          resolve(result);
        }, function(error) {
          reject(error);
        });
      });
    });
  }
});
