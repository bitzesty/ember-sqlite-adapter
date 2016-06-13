export function initialize(application) {
  application.inject('adapter', 'sqlite', 'service:sqlite');
  application.inject('serializer', 'sqlite', 'service:sqlite');
  application.inject('route', 'sqlite', 'service:sqlite');
}

export default {
  name: 'sqlite',
  initialize
};
