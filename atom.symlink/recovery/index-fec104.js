'use strict';

const optimizely = require('@optimizely/optimizely-sdk');
const parseIdentity = require('./lib/parseIdentity');
const pkg = require('./package.json');

const FIVE_MINUTES = (1000 * 60) * 5;

async function updateCache({ ibl, cache }) {
  try {
    cache.experimentsContext = await ibl.getExperimentsContext({ platform: 'web' });
    cache.optimizelyInstance = optimizely.createInstance({ datafile: cache.experimentsContext.experimentDefinitions });
  } catch (err) {
    // leave cache as it was
  }
}

function addVariant({ req, optimizelyInstance, visitorIds }) {
  return (experiment) => {
    const { experimentKey } = experiment;
    const existingVariation = req.header(`x-experiment-${experimentKey}`);

    if (existingVariation) {
      req.experimentation.variants[experimentKey] = existingVariation;
      return;
    }

    const visitorId = visitorIds[experiment.visitorId];
    if (visitorId) {
      req.experimentation.variants[experimentKey] = optimizelyInstance.getVariation(experimentKey, visitorId);
      return true;
    }
  };
}

function buildDefaultExperimentationObject({ cache, scope }) {
  return {
    context: cache.experimentsContext,
    variants: {},
    scope
  };
}

function getExperimentsInScope({ scope, cache }) {
  return cache.experimentsContext.experimentMapping.filter((experiment) => experiment.scope === scope);
}

function hasExperimentsForVisitorIdType(experiments, visitorIdType) {
  return experiments.some(({ visitorId }) => visitorId === visitorIdType);
}

function addVary(res) {
  return ({ experimentKey }) => {
    res.vary(`x-experiment-${experimentKey}`);
  };
}

function buildVisitorIds(req, experiments) {
  return {
    USER_ID: getUserId(req, experiments),
    DEVICE_ID: getDeviceId(req, experiments)
  };
}

function getUserId(req, experiments) {
  if (hasExperimentsForVisitorIdType(experiments, 'USER_ID')) {
    const identity = parseIdentity(req);
    if (identity && identity.ep) {
      return req.header('x-hashed-id');
    }
  }
}

function getDeviceId(req, experiments) {
  if (hasExperimentsForVisitorIdType(experiments, 'DEVICE_ID')) {
    return req.header('x-unique-id');
  }
}

function getMiddleware({ cache, scope }) {
  return (req, res, next) => {
    const performanceEnabled = req.cookiePolicy && req.cookiePolicy.performance;
    const isCDN = req.header('x-cdn') === '1';

    req.experimentation = buildDefaultExperimentationObject({ cache, scope });

    const { experimentsContext, optimizelyInstance } = cache;
    if (!experimentsContext || !optimizelyInstance || isCDN) {
      return next();
    }

    const experimentsInScope = getExperimentsInScope({ scope, cache });
    experimentsInScope.forEach(addVary(res));

    if (!performanceEnabled) {
      return next();
    }

    const hasExperimentsWithUserId = hasExperimentsForVisitorIdType(experimentsInScope, 'USER_ID');
    if (hasExperimentsWithUserId) {
      res.vary('x-signed-in');
    }

    const visitorIds = buildVisitorIds(req, experimentsInScope);
    const didCreateNewVariants = experimentsInScope
      .map(addVariant({ req, optimizelyInstance, visitorIds }))
      .some((didGetVariation) => didGetVariation);

    const isSignedIn = req.header('x-identity');
    if (didCreateNewVariants || (hasExperimentsWithUserId && isSignedIn && !visitorIds.USER_ID)) {
      res.setHeader('Cache-Control', 'private,no-store,no-cache,must-revalidate,max-age=0');
    }

    next();
  };
}

function getRequireConfigJavascript() {
  return `
    require.config({
      paths: {
        'iplayer-web-experimentation': 'https://iplayer-web.files.bbci.co.uk/iplayer-web-experimentation/${pkg.version}/client'
      }
    });
  `;
}

function getActivationJavascript(experimentation) {
  const hasNoContext = experimentation.context === null;

  if (hasNoContext) {
    return '';
  }
  return `
    require(['iplayer-web-experimentation'], function (experimentation) {
      experimentation.activate('${experimentation.scope}', ${JSON.stringify(experimentation.context)});
    });
  `;
}

module.exports = {

  createPrefetcher: ({ ibl }) => {
    const cache = {
      experimentsContext: null
    };

    return {
      start: () => {
        setInterval(() => {
          updateCache({ ibl, cache });
        }, FIVE_MINUTES);
        return updateCache({ ibl, cache });
      },
      getMiddleware: ({ scope }) => getMiddleware({ cache, scope })
    };
  },

  getScript: (req) => {
    if (!req.experimentation) {
      return '';
    }
    const output = [
      '<script>',
      getRequireConfigJavascript(),
      getActivationJavascript(req.experimentation),
      '</script>'
    ];
    return output.join('');
  }

};
