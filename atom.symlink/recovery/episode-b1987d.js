'use strict';

const router = require('express').Router();
const Boom = require('boom');
const iblClient = require('../lib/clients/ibl');
const setRouteName = require('@ibl/set-route-name');
const componentLibrary = require('@bbc/iplayer-web-legacy-static-assets');
const metadataConverter = require('@bbc/iplayer-web-metadata-converter');
const webFrontend = require('@bbc/iplayer-web-frontend');

const translate = require('../lib/translate');
const pageOptionsBuilder = require('../lib/builders/pageOptions');
const pageDataBuilder = require('../lib/builders/pageData');
const scriptConfigBuilder = require('../lib/builders/scriptConfig');
const configBuilder = require('../lib/builders/config');
const episodeUtil = require('../lib/episode');
const { buildProgrammesUrl, buildEpisodeUrl } = require('../lib/builders/url');
const svgBuilder = require('../lib/builders/svgs');
const idctaBuilder = require('../lib/builders/idCta');
const resourceHints = require('../lib/resourceHints');
const experimentationPrefetcher = require('../lib/clients/experimentation');

const builder = require('../lib/builder')({
  pageType: 'episode',
  customSvgs: svgBuilder(),
  styleOverrides: 'sass/episode.scss',
  pageScript: 'dist/episode.js',
  requireCommon: 'none',
  customRequirePaths: {
    'demi-1': '//static.bbci.co.uk/frameworks/demi/0.10.1/sharedmodules/demi-1'
  },
  sassOptions: {
    includePaths: componentLibrary.sassPaths
  }
});

const { getHTML, getJSON } = require('../views/EpisodeLayout.jsx');
const middleware = [
  setRouteName('episode'),
  webFrontend.middleware.cookiePolicy,
  webFrontend.middleware.uniqueId,
  experimentationPrefetcher.getMiddleware({ scope: 'episode' }),
  builder
];

function getRequestedVersion(episode, kind) {
  const priorityVersion = metadataConverter.getPriorityVersion(episode);
  const priorityIsNotAccessibleVersion = ['audio-described', 'signed'].indexOf(priorityVersion.kind) === -1;

  if (!kind) {
    return priorityIsNotAccessibleVersion ? priorityVersion : false;
  }

  return metadataConverter.getSpecifiedVersionFromSlug(episode, kind);
}

function fetchEpisode(pid, lang) {
  const opts = {
    rights: 'web',
    availability: 'available',
    mixin: 'live',
    lang
  };

    return iblClient.getEpisodes(pid, opts)
      .then((episodes) => episodes[0]);
  }

  function fetchEpisodePrerolls(pid) {
    return iblClient.getEpisodePrerolls(pid)
      .catch(() => []);
  }

  function fetchNextEpisode(pid, lang) {
    return iblClient.getNextEpisode(pid, { lang })
      .catch(() => undefined);
  }

function fetchProgrammeEpisodes(tleoId, lang) {
  const opts = {
    rights: 'web',
    availability: 'available',
    per_page: 4,
    lang
  };

  return iblClient.getProgrammeEpisodes(tleoId, opts)
    .then((res) => {
      return {
        episodes: res.elements,
        total: res.count
      };
    })
    .catch(() => null);
}

function buildIdCtaData(episode, kindSlug) {
  return {
    pid: episode.id,
    kind: kindSlug,
    slug: metadataConverter.buildSlug(episode.title, episode.subtitle)
  };
}

function fetchScriptConfigAndIdCta(episode, kind, translator) {
  return scriptConfigBuilder()
    .then((scriptConfig) => {
      const { idAvailable } = scriptConfig;
      const idCtaData = buildIdCtaData(episode, kind);
      if (!idAvailable) {
        return buildScriptConfigAndIdCta(scriptConfig, false);
      }
      return idctaBuilder(idCtaData, translator)
        .then(([idCtaButton, msiCtaButton]) => {
          return buildScriptConfigAndIdCta(scriptConfig, {
            idcta: idCtaButton.html,
            msicta: msiCtaButton.html
          });
        })
        .catch(() => buildScriptConfigAndIdCta(scriptConfig, false));
    });
}

function buildScriptConfigAndIdCta(scriptConfig, idCta) {
  return {
    scriptConfig: Object.assign({}, scriptConfig, { idCtaAvailable: !!idCta }),
    idCta
  };
}

function fetchIblData(pid, language, kindSlug) {
  const iblFetches = [
    fetchEpisode(pid, language),
    fetchEpisodePrerolls(pid),
    fetchNextEpisode(pid, language)
  ];
  return Promise.all(iblFetches)
    .then(([episode, prerolls, nextEpisode]) => {
      if (!episode) return {};

      const defaultData = { episode, prerolls, nextEpisode };
      const tleoId = episode && episode.tleo_id;

      return fetchProgrammeEpisodes(tleoId, language)
        .then((programmeEpisodes) => Object.assign({ programmeEpisodes }, defaultData))
        .catch(() => defaultData);
    })
    .then(({ episode, prerolls, nextEpisode, programmeEpisodes }) => {
      const version = episode && getRequestedVersion(episode, kindSlug);
      const episodeSlug = episode && metadataConverter.buildSlug(episode.title, episode.subtitle);

      return {
        episode,
        nextEpisode,
        programmeEpisodes,
        version,
        episodeSlug,
        prerolls
      };
    });
}

function handleEpisodeRequest(req, res, next) {
  const {
    language,
    params: { pid, slug, kindSlug }
  } = req;
  const onwardJourney = false;
  const playerOpen = false;
  const translator = translate.create(language);

  fetchIblData(pid, language, kindSlug)
    .then(({ episode, nextEpisode, programmeEpisodes, version, episodeSlug, prerolls }) => {

      if (!episode || !version) {
        return res.redirect(buildProgrammesUrl(pid));
      }

      const validSlug = episodeSlug === slug && !req.params['0'];
      if (!validSlug) {
        return res.redirect(301, buildEpisodeUrl(pid, episodeSlug, kindSlug));
      }

      return fetchScriptConfigAndIdCta(episode, kindSlug, translator)
        .then(({ scriptConfig, idCta }) => {
          const kind = episodeUtil.getVersionKindFromSlug(kindSlug);
          const pageData = Object.assign(
            { scriptConfig, idCta },
            pageDataBuilder(episode, kind, onwardJourney, playerOpen, translator, programmeEpisodes)
          );
          const markup = getHTML(pageData);
          const pageOptions = pageOptionsBuilder(req, episode, nextEpisode, prerolls, kind, translator);

          resourceHints(res);
          return res.buildPage(markup, pageOptions);
        });
    })
    .catch((err) => {
      next(Boom.badGateway(err));
    });
}

function handleJsonRequest(req, res, next) {
  const {
    language,
    params: { pid, kindSlug }
  } = req;
  const translator = translate.create(language);
  const onwardJourney = true;
  const playerOpen = req.query.playerOpen === 'true';

  fetchIblData(pid, language, kindSlug)
    .then(({ episode, nextEpisode, programmeEpisodes, version, prerolls }) => {

      if (!episode || !version) {
        return next(Boom.notFound());
      }

      return fetchScriptConfigAndIdCta(episode, kindSlug, translator)
        .then(({ scriptConfig, idCta }) => {
          const kind = episodeUtil.getVersionKindFromSlug(kindSlug);
          const pageData = Object.assign({ scriptConfig, idCta, playerOpen }, pageDataBuilder(episode, kind, onwardJourney, playerOpen, translator, programmeEpisodes));
          const pageConfig = configBuilder(episode, nextEpisode, prerolls, kind, translator);

          return res.json({
            config: pageConfig,
            markup: getJSON(pageData)
          });
        });
    })
    .catch((err) => {
      next(Boom.badGateway(err));
    });
}

const basePath = '/iplayer/episode';
const pid = ':pid([0-9b-df-hj-np-tv-z]{8,15})';
const kindSlug = ':kindSlug(ad|sign)';
const slug = ':slug*?';

router.get(`${basePath}/${pid}/${kindSlug}.json`, middleware, handleJsonRequest);
router.get(`${basePath}/${pid}/${kindSlug}/${slug}`, middleware, handleEpisodeRequest);

router.get(`${basePath}/${pid}.json`, middleware, handleJsonRequest);
router.get(`${basePath}/${pid}/${slug}`, middleware, handleEpisodeRequest);

module.exports = router;
