# Ember SQLite Adapter

This addon is intended to be used with PhoneGap/Cordova, but does check for its presence ,falling back to a WebSQL database, which can be used for tests and development inside browsers.

## Warning

This addon should *NOT* be considered stable and production ready. It is under heavy development at this moment.
By the time we hit 1.0, you can then assume it is stable.

Tested only with Ember CLI 1.13+, Ember 1.13+ and Ember Data 1.13+.

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

## Running Tests

* `ember test`
* `ember test --server`


## Versioning

This library follows [Semantic Versioning](http://semver.org/)

## Want to help?

Great! Please do help, we are always trying to improve this library.

## Legal

[Bit Zesty](http://bitzesty.com) (c) 2015

[@bitzesty](http://twitter.com/bitzesty)

[Licensed under the MIT license](https://github.com/bitzesty/ember-sqlite-adapter/blob/master/LICENSE.md)
