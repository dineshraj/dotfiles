import { version } from './package.json';
import uuidv4 from 'uuid/v4';

const dependencyFetcher = fetchDependencies();

const EXPERIMENTS_COOKIE_NAME = 'ckpf_iplayer_experiments';
const UUID_COOKIE_NAME = 'ckpf_mvt';
const COOKIE_DOMAIN = '.bbc.co.uk';
const COOKIE_PATH = '/';
const LOG_LEVEL_ERROR = 4;
const WHITELIST = /iplxp_(.*)/;
const OPTIMIZELY_DATAFILE_URL = {
  sandbox: 'https://cdn.optimizely.com/json/8349552234.json',
  production: 'https://cdn.optimizely.com/json/8347890599.json'
};

window.require.config({
  paths: {
    'optimizely-client-sdk': `https://iplayer-web.files.bbci.co.uk/iplayer-web-optimizely-client/${version}/optimizely.min`
  }
});

function fetchDependencies() {
  return new Promise((resolve, reject) => {
    window.require(['optimizely-client-sdk', 'utils/istats'], (client, istats) => {
      resolve({ client, istats });
    }, reject);
  });
}

function fetchDatafile(datafile) {
  return fetch(datafile).then((response) => {
    if (!response.ok) {
      throw new Error();
    }
    return response.json();
  });
}

function createOptimizelyInstance(client, datafile) {
  return client.createInstance({
    datafile,
    skipJSONValidation: true,
    logLevel: LOG_LEVEL_ERROR
  });
}

function getDatafilePath(env) {
  if (!env) return;

  if (env === 'live') return OPTIMIZELY_DATAFILE_URL.production;

  return OPTIMIZELY_DATAFILE_URL.sandbox;
}

function fetchOptimizely(config) {
  const datafilePath = config.datafile || getDatafilePath(config.env);

  if (!datafilePath) {
    return Promise.reject('Please specify a env or datafile');
  }

  return dependencyFetcher.then(({ client, istats }) => {
    return fetchDatafile(datafilePath).then((datafile) => {
      const clientInstance = createOptimizelyInstance(client, datafile);
      return { clientInstance, istats };
    });
  });
}

function initialiseOptimizely({ clientInstance, istats }) {

  function getExperiment(lowerCaseExperimentKey) {
    const experiments = clientInstance.configObj.experimentKeyMap;
    const originalCaseKey = Object.keys(experiments).find(
      (experimentKey) => experimentKey.toLowerCase() === lowerCaseExperimentKey
    );

    return experiments[originalCaseKey];
  }

  function isExperimentRunning(experimentKey) {
    const experiment = getExperiment(experimentKey);
    return (experiment && experiment.status === 'Running');
  }

  function isWhitelisted(experimentKey) {
    return WHITELIST.test(experimentKey);
  }

  function getExistingExperiments() {
    const experiments = parseCookie();

    if (!experiments) return {};

    return Object.keys(experiments).reduce((existingExperiments, key) => {
      if (isExperimentRunning(key) || isWhitelisted(key)) {
        return Object.assign({}, existingExperiments, {
          [key]: experiments[key]
        });
      }

      return existingExperiments;
    }, {});
  }

  function initialiseExperiment(experiments, experimentKey, uuid, attributes) {
    const variation = clientInstance.activate(experimentKey, uuid, attributes);
    const lowerCaseExperimentKey = experimentKey.toLowerCase();

    istats.fireLog(
      {
        mvt_experience: `${lowerCaseExperimentKey}.${variation}`,
        [`mvt_${lowerCaseExperimentKey}`]: variation,
        ckpf_mvt: uuid
      },
      'optimizely',
      'ab-test'
    );

    return Object.assign(
      {},
      experiments,
      { [lowerCaseExperimentKey]: variation }
    );
  }

  function parseCookie() {
    try {
      return JSON.parse(window.bbccookies.get(EXPERIMENTS_COOKIE_NAME));
    } catch (err) {
      return {};
    }
  }

  function performanceCookiesAllowed() {
    return window.bbccookies.readPolicy().performance;
  }

  function getCookieExpiry() {
    const now = new Date();
    now.setYear(now.getFullYear() + 1);

    return now;
  }

  function getCookieOptions() {
    return {
      domain: COOKIE_DOMAIN,
      path: COOKIE_PATH,
      expires: getCookieExpiry()
    };
  }

  function getOrCreateUUIDCookie() {
    const uuidCookie = window.bbccookies.get(UUID_COOKIE_NAME);

    if (!uuidCookie) {
      return setUUIDCookie();
    }

    return uuidCookie;
  }

  function setUUIDCookie() {
    const uuid = uuidv4();
    const options = getCookieOptions();

    window.bbccookies.set(UUID_COOKIE_NAME, uuid, options);

    return uuid;
  }

  function setExperimentCookie(experiments) {
    window.bbccookies.set(EXPERIMENTS_COOKIE_NAME, JSON.stringify(experiments), getCookieOptions());
  }

  return {
    track: (conversion, attributes) => {
      const performanceAllowed = performanceCookiesAllowed();

      if (!performanceAllowed) {
        return;
      }

      return clientInstance.track(conversion, getOrCreateUUIDCookie(), attributes);
    },
    activate: (experimentKey, attributes) => {
      const performanceAllowed = performanceCookiesAllowed();

      if (!performanceAllowed) {
        return;
      }

      const lowerCaseExperimentKey = experimentKey.toLowerCase();
      const uuid = getOrCreateUUIDCookie();
      const existingExperiments = getExistingExperiments();
      const isUserInExperiment = (lowerCaseExperimentKey in existingExperiments);
      const variation = existingExperiments[lowerCaseExperimentKey];

      if (isExperimentRunning(lowerCaseExperimentKey) && !isUserInExperiment) {
        const runningExperiments = initialiseExperiment(existingExperiments, experimentKey, uuid, attributes);
        setExperimentCookie(runningExperiments);

        return runningExperiments[lowerCaseExperimentKey];
      }

      setExperimentCookie(existingExperiments);

      return variation;
    },
    isValidEventKey: (key) => clientInstance.configObj.eventKeyMap.hasOwnProperty(key)
  };
}

function create(config) {
  return fetchOptimizely(config).then(initialiseOptimizely);
}

export default {
  create
};
