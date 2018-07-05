'use strict';

const _ = require('lodash');
const episodeConverter = require('@bbc/iplayer-web-metadata-converter');
const webRoutes = require('@bbc/iplayer-web-routes');

const VERSION_KIND_TO_DOWNLOAD_KIND_MAP = {
  'audio-described': 'dubbedaudiodescribed',
  signed: 'signed'
};

const VERSION_KIND_TO_KEY = {
  'audio-described': 'AD',
  signed: 'SL'
};

const VERSION_KIND_TO_SLUG = {
  'audio-described': 'ad',
  signed: 'sign'
};

const VERSION_SLUG_TO_KIND = {
  ad: 'audio-described',
  sign: 'signed'
};

function encodeStringForDownloads(string) {
  return new Buffer(string).toString('base64').replace('/', '-');
}

function getSubtitle(episode) {
  return episode.subtitle ? ` - ${episode.subtitle}` : '';
}

function getCompleteTitle(episode) {
  return episode.title + getSubtitle(episode);
}

function getVersion(episode, kind) {
  const { versions } = episode;
  const priorityVersion = versions[0];

  if (!kind) {
    return priorityVersion;
  }

  return versions.find((version) => version.kind === kind);
}

function buildDownloadUri(episode) {
  const episodeCompleteTitle = encodeStringForDownloads(getCompleteTitle(episode));
  const episodeTitle = encodeStringForDownloads(episode.title);

  return (version, hasHD) => {
    const quality = (hasHD === true) ? 'hd' : 'sd';
    const downloadKind = VERSION_KIND_TO_DOWNLOAD_KIND_MAP[version.kind] || 'standard';

    console.log('version id', version.id);

    return `bbc-ipd:download/${episode.id}/${version.id}/${quality}/${downloadKind}/${episodeCompleteTitle}/${episode.tleo_id}/${episodeTitle}`;
  };
}

function sortDownloads(downloads) {
  const order = ['SD', 'HD', 'AD', 'SL'];
  const sortedDownloads = order.reduce((obj, key) => {
    if (downloads.hasOwnProperty(key)) {
      obj[key] = downloads[key];
    }
    return obj;
  }, {});

  return sortedDownloads;
}

function buildPagePath(episode, kindSlug, walledGarden) {
  const { id, title, subtitle } = episode;
  const slug = episodeConverter.buildSlug(title, subtitle);
  const masterBrand = episode.master_brand.id;

  if (walledGarden) {
    return webRoutes.childrensEpisode(masterBrand, id, slug, kindSlug);
  }

  return webRoutes.episode(id, slug, kindSlug);
}

const VERSION_SLUG_TO_KIND = {
  ad: 'audio-described',
  sign: 'signed',
  'sd': 'original'
};

function getdownloadURIs(episode) {
  const hasHD = _.get(episode, 'versions[0].hd');
  const downloadUriBuilder = buildDownloadUri(episode);
  const downloadURIs = episode.versions.reduce((obj, version) => {
    if (version.download) {
      const key = VERSION_KIND_TO_KEY[version.kind];
      console.log('key we are getting a URI for', VERSION_KIND_TO_KEY[version.kind] || 'SD');
      if (obj[key] !== undefined) {
        obj[key] = downloadUriBuilder(version, false);
      }
    }
    return obj;
  }, {});

  if (hasHD) {
    const downloadURIsWithHD = Object.assign(
      {
        HD: downloadUriBuilder(episode.versions[0], hasHD)
      },
      downloadURIs
    );
    return sortDownloads(downloadURIsWithHD);
  }

  return sortDownloads(downloadURIs);
}

function getAccessibleVersionSlug(episode, kind) {
  const version = getVersion(episode, kind);

  return VERSION_KIND_TO_SLUG[version.kind];
}

function getVersionKindFromSlug(kindSlug) {
  return VERSION_SLUG_TO_KIND[kindSlug];
}

module.exports = {
  buildPagePath,
  getVersion,
  getCompleteTitle,
  getdownloadURIs,
  getAccessibleVersionSlug,
  getVersionKindFromSlug
};
