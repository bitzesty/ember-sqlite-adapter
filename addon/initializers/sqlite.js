export function initialize() {

  var application = arguments[1] || arguments[0];

  application.deferReadiness();

  var sqlite = application.__container__.lookup("service:sqlite");

  if (window.cordova) {
    document.addEventListener("deviceready", function() {
      sqlite.openDatabase().then(function() {
        application.inject('adapter', 'sqlite', 'service:sqlite');
        application.inject('serializer', 'sqlite', 'service:sqlite');
        application.inject('route', 'sqlite', 'service:sqlite');

        application.advanceReadiness();
      });
    }, false);
  } else {
    sqlite.openDatabase().then(function() {
      application.inject('adapter', 'sqlite', 'service:sqlite');
      application.inject('serializer', 'sqlite', 'service:sqlite');
      application.inject('route', 'sqlite', 'service:sqlite');

      application.advanceReadiness();
    });
  }
}

export default {
  name: 'sqlite',
  after: 'store',
  initialize: initialize
};
