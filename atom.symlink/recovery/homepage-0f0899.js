'use strict';

const config = require('config');
const router = require('express').Router();
const Boom = require('boom');
const sassTypes = require('node-sass').types;

const pkg = require('../package');

const stats = require('@ibl/stats');
const setRouteName = require('@ibl/set-route-name');
const webFrontend = require('@bbc/iplayer-web-frontend');
const webComponents = require('@bbc/iplayer-web-components');
const legacyStaticAssets = require('@bbc/iplayer-web-legacy-static-assets');
const render = require('@bbc/iplayer-web-components-renderer');

const flagpoles = require('../lib/clients/flagpoles');

const createStore = require('../store/createStore');
const bundleActions = require('../store/actions/bundles');
const bannerActions = require('../store/actions/enablePersonalisationBanner');
const identityActions = require('../store/actions/identity');

const idCtaClient = require('../lib/clients/idcta');
const ibl = require('../lib/clients/ibl');
const iblGraph = require('../lib/clients/iblGraph');
const optimizelyPrefetcher = require('../lib/clients/optimizely');

const customSvgs = require('../lib/homepageSvgs');
const translate = require('../lib/translate');
const iblVariantsMvtCreator = require('../lib/mvt/variants');
const experimentationPrefetcher = require('../lib/clients/experimentation');

const App = require('../views/App');

const pageBuilder = require('../lib/builder')({
  pageType: 'home',
  pageScript: 'dist/homepage.js',
  styleOverrides: 'sass/homepage.scss',
  sassOptions: {
    functions: {
      getImagePath: () => sassTypes.String(getImagePath())
    },
    includePaths: legacyStaticAssets.sassPaths
  },
  customSvgs
});

const optimizelyDatafileUrl = config.get('cosmos.optimizelyDatafileUrl');
const stylesheetUrl = `https://iplayer-web.files.bbci.co.uk/iplayer-web-components/${webComponents.version}/iplayer.css`;

const personalisationEnabled = config.get('cosmos.enablePersonalisation') === 'true';

const middleware = [
  setRouteName('homepage'),
  webFrontend.middleware.cookiePolicy,
  webFrontend.middleware.requiresIdentity({ stats, idCtaClient, middlewareEnabled: personalisationEnabled }),
  webFrontend.middleware.region(ibl),
  webFrontend.middleware.uniqueId,
  experimentationPrefetcher.getMiddleware({ scope: 'homepage' }),
  pageBuilder
];

function getPageExperimentsConfig(identity) {
  return [
    'iplrw_cb31_lazy_rendering',
    {
      key: 'iplrw_cb32_appropriate_home_2',
      activate: () => identity && identity.getAgeBracket() === 'u16'
    }
  ];
}

function getTranslations(translator) {
  return {
    remaining: translator('watching_remaining'),
    remainingSingular: translator('watching_remaining_singular'),
    next: translator('watching_my_next'),
    resume: translator('watching_resume'),
    view_all: translator('view_all'),
    group_view_all_aria_label: translator('group_view_all_aria_label'),
    categories_view_all_aria_label: translator('categories_view_all_aria_label'),
    manage_full_list: translator('manage_full_list'),
    manage_full_watching_list_aria_label: translator('manage_full_watching_list_aria_label'),
    manage_full_added_list_aria_label: translator('manage_full_added_list_aria_label'),
    recommendations_view_all_aria_label: translator('recommendations_view_all_aria_label'),
    homepage_search_button_title: translator('homepage_search_button_title'),
    homepage_search_hint: translator('homepage_search_hint'),
    homepage_screen_reader_title: translator('homepage_screen_reader_title'),
    personalisation_off_message: translator('personalisation_off_message'),
    personalisation_off_cta: translator('personalisation_off_cta'),
    personalisation_off_find_out_more_link: translator('personalisation_off_find_out_more_link')
  };
}

function getEditorialOverrides() {
  return flagpoles.get('ops-editorial-overrides') === 'on';
}

function getUserState(identity) {
  if (identity) {
    if (identity.isPersonalisationEnabled()) {
      return 'signedIn';
    }
    return 'signedInNotPersonalised';
  }
  return 'signedOut';
}

function getIdentityState(identity) {
  if (!identity) {
    return {
      signedIn: false
    };
  }

  return {
    signedIn: true,
    personalisationEnabled: identity.isPersonalisationEnabled(),
    ageBracket: identity.getAgeBracket(),
    findOutMoreUrl: '/usingthebbc/account/about-your-personalisation-settings'
  };
}

function getInitialState({ identity, translator, lazyRenderingExperimentVarient }) {
  return {
    editorialOverrides: getEditorialOverrides(),
    enablePersonalisationBanner: {
      personalisationDismissed: false
    },
    experiments: {
      iplrw_cb31_lazy_rendering: lazyRenderingExperimentVarient
    },
    identity: getIdentityState(identity),
    translations: getTranslations(translator),
    iblBaseUrl: config.get('cosmos.iblBaseUrl')
  };
}

function fetchIdCtaIfEnablePersBannerRequired(identity, store) {
  if (identity && !identity.isPersonalisationEnabled() && identity.getAgeBracket() !== 'u13') {
    return store.dispatch(identityActions.fetchIdCtaConfig());
  }
}

function getUserAgeBracketForIbl({ identity, userInDefaultU16Variant }) {
  if (userInDefaultU16Variant && identity && identity.getAgeBracket() === 'u16') {
    return 'o18';
  }

  return identity && identity.getAgeBracket() || 'o18';
}

function addUserVariables({ variables, identity, userInDefaultU16Variant }) {
  const userState = getUserState(identity);
  const userAgeBracket = getUserAgeBracketForIbl({ identity, userInDefaultU16Variant });

  return Object.assign(
    {},
    variables,
    { userState, userAgeBracket }
  );
}

function getGraphQLClient({ identity, userInDefaultU16Variant, experiments }) {
  const auth = identity ? identity.getAuthorization() : null;

  return {
    graphQLById: (queryId, variables = {}) => {
      const variablesWithUser = addUserVariables({ variables, identity, userInDefaultU16Variant });
      return iblGraph.graphQLById(queryId, variablesWithUser, auth, experiments);
    }
  };
}

function getImagePath() {
  const staticHost = config.get('staticHost');
  const appVersion = config.get('version');
  const appName = pkg.name;

  return `${staticHost}/${appName}/${appVersion}/homepage`;
}

function varyAndPersistExperiments({ req, res, pageExperimentsConfig, allActiveBuckets, bucketsFromRequestHeaders, cookiePolicy }) {
  const experimentsToVaryOn = pageExperimentsConfig.map((experiment) => experiment.key || experiment);
  webFrontend.varyOnExperiments(req, res, experimentsToVaryOn, optimizelyDatafileUrl);

  const bucketsToPersist = optimizelyPrefetcher.getBucketsToPersist(bucketsFromRequestHeaders, allActiveBuckets);
  webFrontend.persistExperimentBuckets(bucketsToPersist, res, cookiePolicy);
}

function buildMarkup(store) {
  return render(App, {
    store
  });
}

function getSectionStatsLabels(storeState) {
  return storeState.bundles.reduce((labels, bundle) => {
    if (bundle.message) {
      return Object.assign({}, labels, { [`section_${bundle.id}`]: bundle.message.type });
    }

    return labels;
  }, {});
}

function addLinkHeader(res) {
  const webComponentsVersion = webComponents.version;
  const preloadHeaders = [
    `<https://iplayer-web.files.bbci.co.uk/iplayer-web-components/${webComponentsVersion}/iplayer.css>; rel=preload; as=style; nopush`,
    `<https://iplayer-web.files.bbci.co.uk/iplayer-web-components/${webComponentsVersion}/fonts/tviplayericons.woff?-bpwhxc>; rel=preload; as=font; crossorigin; type="font/woff2"; nopush`
  ];
  const prefetchHeaders = [
    '<https://emp.bbci.co.uk/emp/bump-3/bump-3.js>; rel=prefetch'
  ];
  res.append('link', preloadHeaders);
  res.append('link', prefetchHeaders);
}

async function handleGraphQLHomepage({ req, res, identity, lang, translator, userPageBuckets, bucketsFromRequestHeaders, pageExperimentsConfig }) {

  console.log('req', req.variants);

  const {
    headers,
    cookiePolicy,
    uniqueId,
    region: { userAttributes },
    experimentation: { variants: experiments }
  } = req;
  const persBannerDismissed = headers['x-enable-personalisation-upsell'] === 'off';
  const lazyRenderingExperimentVarient = userPageBuckets.iplrw_cb31_lazy_rendering;
  const userInDefaultU16Variant = userPageBuckets['iplrw_cb32_appropriate_home_2'] === 'default';
  const initialState = getInitialState({ identity, translator, lazyRenderingExperimentVarient });
  const ibl = getGraphQLClient({ identity, userInDefaultU16Variant, experiments });
  const existingBuckets = Object.assign({}, userPageBuckets, bucketsFromRequestHeaders);
  const iblVariants = iblVariantsMvtCreator.create(optimizelyPrefetcher, existingBuckets, cookiePolicy, uniqueId, userAttributes);
  const store = createStore(initialState, { ibl, iblVariants, idCtaClient });

  if (persBannerDismissed) {
    store.dispatch(bannerActions.hidePersonalisationBanner());
  }

  res.serverTimingStart('data');
  await Promise.all([
    fetchIdCtaIfEnablePersBannerRequired(identity, store),
    store.dispatch(bundleActions.fetchBundles({ lang }))
  ]);

  res.serverTimingEnd('data');
  const state = store.getState();
  addLinkHeader(res);

  const { variantBuckets } = state;
  const allActiveBuckets = Object.assign({}, variantBuckets, userPageBuckets);
  varyAndPersistExperiments({ req, res, pageExperimentsConfig, allActiveBuckets, bucketsFromRequestHeaders, cookiePolicy });

  res.serverTimingStart('markup');
  const markup = buildMarkup(store, { translator });
  res.serverTimingEnd('markup');

  const experimentAnalyticsLabels = optimizelyPrefetcher.getStatsLabels(bucketsFromRequestHeaders, allActiveBuckets, uniqueId);
  const sectionAnalyticsLabels = getSectionStatsLabels(state);
  const analyticsLabels = Object.assign({}, experimentAnalyticsLabels, sectionAnalyticsLabels);

  const scriptConfig = {
    initialState: state
  };
  res.buildPage(markup, {
    stylesheetUrl,
    analyticsLabels,
    scriptConfig,
    clientRendering: true,
    appUpsell: true,
    counterName: 'iplayer.tv.page',
    navigation: { page: 'homepage' },
    metaDescription: translator('homepage_meta_description')
  });
}

router.get('/iplayer', middleware, (req, res, next) => {
  const { language: lang, identity, region = 'lo', cookiePolicy, uniqueId } = req;
  const translator = translate.create(lang);

  const userAttributes = { region };
  const bucketsFromRequestHeaders = webFrontend.getExperimentBuckets(req.headers);
  const pageExperimentsConfig = getPageExperimentsConfig(identity);
  const userPageBuckets = optimizelyPrefetcher.getBuckets(pageExperimentsConfig, bucketsFromRequestHeaders, cookiePolicy, uniqueId, userAttributes);

  return handleGraphQLHomepage({ req, res, identity, lang, translator, userPageBuckets, bucketsFromRequestHeaders, pageExperimentsConfig })
    .catch((err) => {
      next(Boom.badGateway(err));
    });
});

module.exports = router;
