export function initialize(container, application) {
  application.deferReadiness();

  var sqlite = container.lookup("service:sqlite");

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
