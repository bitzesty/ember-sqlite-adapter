# Ember SQLite Adapter

This addon is intended to be used with PhoneGap/Cordova, but does check for its presence ,falling back to a WebSQL database, which can be used for tests and development inside browsers.

[npm-badge]: https://img.shields.io/npm/v/ember-sqlite-adapter.svg
[npm-badge-url]: https://www.npmjs.com/package/ember-sqlite-adapter
[ember-observer-badge]: http://emberobserver.com/badges/ember-sqlite-adapter.svg
[ember-observer-badge-url]: http://emberobserver.com/addons/ember-sqlite-adapter
[license-badge]: https://img.shields.io/npm/l/ember-sqlite-adapter.svg
[license-badge-url]: LICENSE.md
[dependencies-badge]: https://img.shields.io/david/bitzesty/ember-sqlite-adapter.svg
[dependencies-badge-url]: https://david-dm.org/bitzesty/ember-sqlite-adapter
[devDependencies-badge]: https://img.shields.io/david/dev/bitzesty/ember-sqlite-adapter.svg
[devDependencies-badge-url]: https://david-dm.org/bitzesty/ember-sqlite-adapter#info=devDependencies

## Warning

This addon should *NOT* be considered stable and production ready. It is under heavy development at this moment.
By the time we hit 1.0, you can then assume it is stable.

Tested only with Ember CLI 2.5.1, Ember 2.5+ and Ember Data 2.5+.

## Pre-requisites

* [Cordova SQLite plugin](https://github.com/litehelpers/Cordova-sqlite-storage) installed (if you want to use actual SQLite)

## Installation

To install this addon, please use the following command:

```
ember install ember-sqlite-adapter
```

## How it works

At first, we tried to implement a single table in which records would get serialized into, which would make trivial to deal with records. However, that caused memory issues due to the size of the records.

So, the solution was to build a table for each model. But creating the tables based on the model definition isn't going to work on the long term. If you create the table, and later then introduce a new field or remove a field, how could the plugin know what to do?

Then, it came to me to use migrations. By using migrations all along, we leave the database structure up to the application developer and if later on the app needs a db structure, migrations make this easier.

## Database opening

Ember SQLite Adapter no longer opens the database automatically. It is the application responsibility to open the database in order to use it.

Since the `openDatabase` method returns a promise, you can put it in a route, like so:

```
export default Ember.Route.extend({
  sqlite: Ember.inject.service(),
  beforeModel: function() {
    return this.get("sqlite").openDatabase("database_name");
  }
});
```

For each database you open, the addon will check all migrations and run the ones that need running.
Specially useful if you have a multi-user application, and opening one database per user makes it:

- lighter, meaning less data in each table
- management becomes easier, you can just findAll and be done with it
- complete isolation between databases

##### IMPORTANT

For now, the addon can only handle one open database. We'll make it support more in the upcoming future.

## Migrations

To generate migrations, use the command line like so:

```
ember g migration CreateTableXXXXXX
```

and by doing that, a file will be created inside your `app/migrations` folder. It should look like this:

```
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
```
The execute method receives an sql param, and an array of inputs that you must pass if you use prepared statements.

## Adapter and Serializer

Ember SQLite Adapter comes with an adapter and serializer ready to use.

The adapter can be used as follows:

```
import SQLiteAdapter from "./sqlite";

export default SQLiteAdapter.extend({});
```

And the serializer follows the same pattern:

```
import SQLiteSerializer from "./sqlite";

export default SQLiteSerializer.extend({});
```

## Using SQLite directly

TODO: put instructions here in how to use SQLite directly

## Running Tests

* `ember test`
* `ember test --server`


## Versioning

This library follows [Semantic Versioning](http://semver.org/)

## Want to help?

Great! Please do help, we are always trying to improve this library.

## Legal

[Bit Zesty](http://bitzesty.com) (c) 2016

[@bitzesty](http://twitter.com/bitzesty)

[Licensed under the MIT license](https://github.com/bitzesty/ember-sqlite-adapter/blob/master/LICENSE.md)
