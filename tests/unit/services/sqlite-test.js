import { moduleFor, test } from 'ember-qunit';

moduleFor('service:sqlite', 'Unit | Service | sqlite', {
  // Specify the other units that are required for this test.
  // needs: ['service:foo']
});

// Replace this with your real tests.
test('it exists', function(assert) {
  var service = this.subject();
  assert.ok(service);
});

test("it builds simple sql queries correctly", function(assert) {
  var service = this.subject();

  var query = service.query();

  assert.ok(query);

  query.select(["id", "type"])
       .from("serialized_records")
       .where(["type", "?"])
       .limit(100)
       .order("id", "desc");

  var sql = query.buildSQL();

  assert.equal(sql, "SELECT id, type FROM serialized_records WHERE type = ? ORDER BY id desc LIMIT 100");
});

test("it builds complex sql queries correctly", function(assert) {
  var service = this.subject();

  var query = service.query();

  assert.ok(query);

  query.select(["id", "type"])
       .from("serialized_records")
       .join({
         type: "OUTER",
         table: "other_table",
         conditions: [
           ["colA", ">", "5"],
           ["other_table.colB", "serialized_records.colC"]
         ]
       })
       .where(["type", "?"])
       .where(["colA", "<=", "120"])
       .groupBy("colA")
       .limit(100)
       .order("id", "desc");

  var sql = query.buildSQL();

  assert.equal(sql, "SELECT id, type FROM serialized_records OUTER JOIN other_table ON colA > 5 AND other_table.colB = serialized_records.colC WHERE type = ? AND colA <= 120 GROUP BY colA ORDER BY id desc LIMIT 100");
});
