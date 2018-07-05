'use strict';

define([
  'reduxStore',
  'lib/iplayer-web-optimizely-client',
  'web-app/config',
  'utils/id',
  'utils/istats'
], function (
  reduxStore,
  optimizelyClient,
  webAppConfig,
  id,
  istats
) {
  var REGION_COOKIE_NAME = 'ckps_tviplayer_region';
  var client = optimizelyClient.create({ env: webAppConfig.env });
  var crossPlatformClient = new Promise(function (resolve, reject) {
    window.require(['iplayer-web-experimentation'], function(experimentation));
  });

  function getVariant(experimentKey, attributes) {
    return this.getClient().then(function (clientInstance) {
      return clientInstance.activate(experimentKey, attributes);
    });
  }

  function track(trackingKey, attributes) {
    return this.getClient().then(function (clientInstance) {
      return clientInstance.track(trackingKey, attributes);
    });
  }

  function isValidEventKey(eventKey) {
    return this.getClient().then(function (clientInstance) {
      return clientInstance.isValidEventKey(eventKey);
    });
  }

  function getRegionAttribute() {
    if (!window.bbccookies.readPolicy().personalisation) {
      return { region: null };
    }

    return {
      region: window.bbccookies.get(REGION_COOKIE_NAME)
    };
  }

  function getPersonalisationAttribute(user) {
    if (id.signedIn()) {
      return {
        personalisation: (user.personalisationEnabled ? 'on' : 'off')
      };
    }
  }

  function buildPrevPageType(labels) {
    if (!labels.length) {
      return {
        prev_page_type: null
      };
    }

    return {
      prev_page_type: labels[0].prev_page_type
    };
  }

  function getAttributes() {
    var state = reduxStore.getState();

    return Object.assign(
      {
        player_type: state.player.name,
        breakpoint: String(state.page.breakpoint)
      },
      getRegionAttribute(),
      getPersonalisationAttribute(state.user)
    );
  }

  function getAttributesWithPrevPage() {
    return istats.labelsSentWith(['prev_page_type']).then(function (labels) {
      return Object.assign(
        {},
        getAttributes(),
        buildPrevPageType(labels)
      );
    });
  }

  function getClient() {
    return client;
  }

  function getCrossPlatformClient() {
    return crossPlatformClient;
  }

  return {
    getAttributes: getAttributes,
    getAttributesWithPrevPage: getAttributesWithPrevPage,
    getClient: getClient,
    getVariant: getVariant,
    track: track,
    isValidEventKey: isValidEventKey
  };
});
