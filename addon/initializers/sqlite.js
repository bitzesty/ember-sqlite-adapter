export function initialize(container, application) {
  application.deferReadiness();

  document.addEventListener("deviceready", function() {
    console.log("DEVICE READY")
    application.inject('adapter', 'sqlite', 'service:sqlite');
    application.inject('serializer', 'sqlite', 'service:sqlite');

    application.advanceReadiness();
  }, false);
}

export default {
  name: 'sqlite',
  before: 'store',
  initialize: initialize
};
