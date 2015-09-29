export function initialize(container, application) {
  application.inject('adapter', 'sqlite', 'service:sqlite');
  application.inject('serializer', 'sqlite', 'service:sqlite');
}

export default {
  name: 'sqlite',
  before: 'store',
  initialize: initialize
};
