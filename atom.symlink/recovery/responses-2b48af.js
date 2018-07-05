'use strict';

const assert = require('assert');
const sinon = require('sinon');
const request = require('supertest');
const nock = require('nock');

const server = require('../../../');
const navigationPresenter = require('../../../lib/presenters/navigation');
const footerPresenter = require('../../../lib/presenters/footer');
const iblClient = require('../../../lib/clients/ibl');
const idClient = require('../../../lib/clients/id');

const episodeFixture = require('../../fixtures/episode');
const prerollsFixture = require('../../fixtures/prerolls');
const nextEpisodeFixture = require('../../fixtures/nextEpisode');
const episodeWithOnlyAudioDescribedFixture = require('../../fixtures/episodeWithOnlyAudioDescribed');
const episodeWithOnlySignedFixture = require('../../fixtures/episodeWithOnlySigned');
const episodeWithAudioDescribedAndSignedFixture = require('../../fixtures/episodeWithAudioDescribedAndSigned');
const experimentationContext = require('../../fixtures/experimentationContext');

const sandbox = sinon.sandbox.create();
const stubNavigationMarkup = '<stubnavigationmarkup>';
const stubFooterJSON = {
  sections: []
};

nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');

function callPriorityKind(json) {
  const slugOrJson = !json ? '/panorama-teenage-prison-abuse-exposed' : json;
  return request(server)
    .get(`/iplayer/episode/b06ymzly${slugOrJson}`);
}

function callAccessibleKind(kind, json) {
  const slugOrJson = !json ? '/panorama-teenage-prison-abuse-exposed' : json;
  return request(server)
    .get(`/iplayer/episode/b06ymzly/${kind}${slugOrJson}`);
}

describe('GET /iplayer/episode', () => {
  beforeEach(() => {
    sandbox.stub(iblClient, 'getEpisodes').returns(Promise.resolve(episodeFixture));
    sandbox.stub(iblClient, 'getNextEpisode').returns(Promise.resolve());
    sandbox.stub(iblClient, 'getEpisodePrerolls').returns(Promise.resolve([]));
    sandbox.stub(iblClient, 'getProgrammeEpisodes').returns(Promise.reject());
    sandbox.stub(iblClient, 'getExperimentsContext').resolves();
    sandbox.stub(idClient, 'getConfig').returns(Promise.resolve({ 'bbcid-v5': 'ATOMIC_TANGERINE' }));
    sandbox.stub(idClient, 'getButton').returns(Promise.resolve({}));
    sandbox.stub(navigationPresenter, 'present').returns(Promise.resolve(stubNavigationMarkup));
    sandbox.stub(footerPresenter, 'present').returns(Promise.resolve(stubFooterJSON));
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('returns lower cache times', () => {
    return callPriorityKind()
      .then((res) => {
        assert.equal(res.headers['cache-control'], 'max-age=30,stale-while-revalidate=7200,stale-if-error=7200');
      });
  });

  it('sends correct resource hints headers', () => {
    return callPriorityKind()
      .set('x-forwarded-protocol', 'http')
      .set('host', 'www.bbc.co.uk')
      .then((res) => {
        assert(res.headers.link.includes('<https://mybbc.files.bbci.co.uk>; rel=preconnect'));
        assert(res.headers.link.includes('<https://iplayer-web.files.bbci.co.uk>; rel=preconnect'));
        assert(res.headers.link.includes('<https://emp.bbci.co.uk/emp/bump-3/bump-3.js>; rel=preload; as=script; nopush'));
      });
  });

  it('calls iBL episode route with the correct options', () => {
    return callPriorityKind()
      .set('accept-language', 'ga')
      .then(() => {
        sinon.assert.calledWith(iblClient.getEpisodes, sinon.match.any, {
          availability: 'available',
          lang: 'ga',
          rights: 'web',
          mixin: 'live'
        });
      });
  });

  it('calls iBL next episode route with the correct episode id and language', () => {
    return callPriorityKind()
      .set('accept-language', 'ga')
      .then(() => {
        sinon.assert.calledWith(iblClient.getNextEpisode, 'b06ymzly', {
          lang: 'ga'
        });
      });
  });

  it('returns a 502 when iBL returns an error', () => {
    iblClient.getEpisodes.returns(Promise.reject());
    return callPriorityKind()
      .expect(502);
  });

  describe('Priority kind', () => {

    it('returns a 200', () => {
      return callPriorityKind()
        .expect(200);
    });

    it('returns a 200 if getNextEpisode fails', () => {
      iblClient.getNextEpisode.returns(Promise.reject());

      return callPriorityKind()
        .then((res) => {
          assert.equal(res.status, 200);
        });
    });

    it('returns a 404 when there is an invalid pid', () => {
      return request(server)
        .get('/iplayer/episode/moo')
        .then((res) => assert.equal(res.status, 404));
    });

    it('returns a 302 when a episode can not be found and does not fetch programme episodes', () => {
      iblClient.getEpisodes.returns(Promise.resolve([]));
      return callPriorityKind()
        .then((res) => {
          assert.equal(res.status, 302);
          assert.equal(res.headers.location, 'http://www.bbc.co.uk/programmes/b06ymzly');
          sinon.assert.notCalled(iblClient.getProgrammeEpisodes);
        });
    });

    it('does not include resource hints when 302 redirect is returned', () => {
      iblClient.getEpisodes.returns(Promise.resolve([]));
      return callPriorityKind()
        .then((res) => {
          assert(!res.headers.link);
        });
    });

    it('returns a 301 when an episode is found but has no slug', () => {
      return request(server)
        .get('/iplayer/episode/b06ymzly')
        .then((res) => {
          assert.equal(res.status, 301);
          assert.equal(res.headers.location, '/iplayer/episode/b06ymzly/panorama-teenage-prison-abuse-exposed');
        });
    });

    it('returns a 301 when an episode is found but slug is not valid', () => {
      return request(server)
        .get('/iplayer/episode/b06ymzly/this-is-not-a-valid-slug')
        .then((res) => {
          assert.equal(res.status, 301);
          assert.equal(res.headers.location, '/iplayer/episode/b06ymzly/panorama-teenage-prison-abuse-exposed');
        });
    });

    it('returns a 301 when an episode is found has multiple invalid slugs', () => {
      return request(server)
        .get('/iplayer/episode/b06ymzly/woof/meow')
        .then((res) => {
          assert.equal(res.status, 301);
          assert.equal(res.headers.location, '/iplayer/episode/b06ymzly/panorama-teenage-prison-abuse-exposed');
        });
    });

    it('returns a 301 when an episode is found and has a valid slug but additional routes', () => {
      return request(server)
        .get('/iplayer/episode/b06ymzly/panorama-teenage-prison-abuse-exposed/meow')
        .then((res) => {
          assert.equal(res.status, 301);
          assert.equal(res.headers.location, '/iplayer/episode/b06ymzly/panorama-teenage-prison-abuse-exposed');
        });
    });

    it('does not include resource hints when 301 redirect is returned', () => {
      return request(server)
        .get('/iplayer/episode/b06ymzly/panorama-teenage-prison-abuse-exposed/meow')
        .then((res) => {
          assert(!res.headers.link);
        });
    });

    it('returns a 302 to /programmes when the version requested is unavailable', () => {
      iblClient.getEpisodes.returns(Promise.resolve(episodeWithOnlyAudioDescribedFixture));
      return callPriorityKind()
        .then((res) => {
          assert.equal(res.status, 302);
          assert.equal(res.headers.location, 'http://www.bbc.co.uk/programmes/b06ymzly');
        });
    });

  });

  describe('Accessible Versions', () => {

    it('returns a 301 when an invalid version is requested', () => {
      return callAccessibleKind('woof')
        .then((res) => {
          assert.equal(res.status, 301);
          assert.equal(res.headers.location, '/iplayer/episode/b06ymzly/panorama-teenage-prison-abuse-exposed');
        });
    });

    it('returns a 301 when an invalid version and invalid slug is requested', () => {
      return request(server)
        .get('/iplayer/episode/b06ymzly/woof/this-is-not-valid')
        .then((res) => {
          assert.equal(res.status, 301);
          assert.equal(res.headers.location, '/iplayer/episode/b06ymzly/panorama-teenage-prison-abuse-exposed');
        });
    });

    describe('audio-described', () => {

      beforeEach(() => {
        iblClient.getEpisodes.returns(Promise.resolve(episodeWithOnlyAudioDescribedFixture));
      });

      it('returns a 200', () => {
        return callAccessibleKind('ad')
          .expect(200);
      });

      it('returns a 301 when an episode is found but has no slug', () => {
        return request(server)
          .get('/iplayer/episode/b06ymzly/ad')
          .then((res) => {
            assert.equal(res.status, 301);
            assert.equal(res.headers.location, '/iplayer/episode/b06ymzly/ad/panorama-teenage-prison-abuse-exposed');
          });
      });

      it('returns a 301 when an episode is found but slug is not valid', () => {
        return request(server)
          .get('/iplayer/episode/b06ymzly/ad/this-is-not-a-valid-slug')
          .then((res) => {
            assert.equal(res.status, 301);
            assert.equal(res.headers.location, '/iplayer/episode/b06ymzly/ad/panorama-teenage-prison-abuse-exposed');
          });
      });

      it('returns a 301 when an episode is found has multiple invalid slugs', () => {
        return request(server)
          .get('/iplayer/episode/b06ymzly/ad/woof/meow')
          .then((res) => {
            assert.equal(res.status, 301);
            assert.equal(res.headers.location, '/iplayer/episode/b06ymzly/ad/panorama-teenage-prison-abuse-exposed');
          });
      });

      it('returns a 301 when an episode is found and has a valid slug but additional routes', () => {
        return request(server)
          .get('/iplayer/episode/b06ymzly/ad/panorama-teenage-prison-abuse-exposed/meow')
          .then((res) => {
            assert.equal(res.status, 301);
            assert.equal(res.headers.location, '/iplayer/episode/b06ymzly/ad/panorama-teenage-prison-abuse-exposed');
          });
      });

      it('returns a 302 to /programmes when the version requested is unavailable', () => {
        iblClient.getEpisodes.returns(Promise.resolve(episodeFixture));
        return callAccessibleKind('ad')
          .then((res) => {
            assert.equal(res.status, 302);
            assert.equal(res.headers.location, 'http://www.bbc.co.uk/programmes/b06ymzly');
          });
      });

    });

    describe('signed', () => {

      beforeEach(() => {
        iblClient.getEpisodes.returns(Promise.resolve(episodeWithOnlySignedFixture));
      });

      it('returns a 200', () => {
        return callAccessibleKind('sign')
          .expect(200);
      });

      it('returns a 301 when an episode is found but has no slug', () => {
        return request(server)
          .get('/iplayer/episode/b06ymzly/sign')
          .then((res) => {
            assert.equal(res.status, 301);
            assert.equal(res.headers.location, '/iplayer/episode/b06ymzly/sign/panorama-teenage-prison-abuse-exposed');
          });
      });

      it('returns a 301 when an episode is found but slug is not valid', () => {
        return request(server)
          .get('/iplayer/episode/b06ymzly/sign/this-is-not-a-valid-slug')
          .then((res) => {
            assert.equal(res.status, 301);
            assert.equal(res.headers.location, '/iplayer/episode/b06ymzly/sign/panorama-teenage-prison-abuse-exposed');
          });
      });

      it('returns a 301 when an episode is found has multiple invalid slugs', () => {
        return request(server)
          .get('/iplayer/episode/b06ymzly/sign/woof/meow')
          .then((res) => {
            assert.equal(res.status, 301);
            assert.equal(res.headers.location, '/iplayer/episode/b06ymzly/sign/panorama-teenage-prison-abuse-exposed');
          });
      });

      it('returns a 301 when an episode is found and has a valid slug but additional routes', () => {
        return request(server)
          .get('/iplayer/episode/b06ymzly/sign/panorama-teenage-prison-abuse-exposed/meow')
          .then((res) => {
            assert.equal(res.status, 301);
            assert.equal(res.headers.location, '/iplayer/episode/b06ymzly/sign/panorama-teenage-prison-abuse-exposed');
          });
      });

      it('returns a 302 to /programmes when the version requested is unavailable', () => {
        iblClient.getEpisodes.returns(Promise.resolve(episodeFixture));
        return callAccessibleKind('sign')
          .then((res) => {
            assert.equal(res.status, 302);
            assert.equal(res.headers.location, 'http://www.bbc.co.uk/programmes/b06ymzly');
          });
      });

    });

  });

  describe('.json route', () => {

    beforeEach(() => {
      iblClient.getEpisodes.returns(Promise.resolve(episodeFixture));
    });

    it('returns a 200 when an episode on the .json endpoint is found', () => {
      return callPriorityKind('.json')
        .then((res) => {
          assert.equal(res.status, 200);
        });
    });

    it('returns a 404 when there is an invalid pid', () => {
      return request(server)
        .get('/iplayer/episode/moo.json')
        .then((res) => assert.equal(res.status, 404));
    });

    it('returns a 404 when a version is not found', () => {
      iblClient.getEpisodes.returns(Promise.resolve([]));

      return callPriorityKind('.json')
        .then((res) => assert.equal(res.status, 404));
    });

    it('returns a 404 when an episode is not found', () => {
      return callAccessibleKind('sign', '.json')
        .then((res) => assert.equal(res.status, 404));
    });

    describe('config', () => {

      it('does not contain the requirePath', () => {
        return callPriorityKind('.json')
          .then((res) => {
            assert.equal(res.body.config.hasOwnProperty('requirePath'), false);
          });
      });

      it('returns the iBL response on an episode key', () => {
        return callPriorityKind('.json')
          .then((res) => {
            assert.deepEqual(res.body.config.episode, episodeFixture[0]);
          });
      });

      it('returns the prerolls object', () => {
        iblClient.getEpisodePrerolls.returns(Promise.resolve(prerollsFixture));

        return callPriorityKind('.json')
          .then((res) => {
            assert.deepEqual(res.body.config.prerolls, prerollsFixture);
          });
      });

      it('returns the next episode object', () => {
        iblClient.getNextEpisode.returns(Promise.resolve(nextEpisodeFixture));

        return callPriorityKind('.json')
          .then((res) => {
            assert.deepEqual(res.body.config.nextEpisode, nextEpisodeFixture);
          });
      });

      it('does not include nextEpisode if getNextEpisode fails', () => {
        iblClient.getNextEpisode.returns(Promise.reject());

        return callPriorityKind('.json')
          .then((res) => {
            assert.equal(res.status, 200);
            assert.deepEqual(res.body.config.nextEpisode, undefined);
          });
      });

      it('returns an empty array for prerolls if the request fails', () => {
        iblClient.getEpisodePrerolls.returns(Promise.reject());

        return callPriorityKind('.json')
          .then((res) => {
            assert.deepEqual(res.body.config.prerolls, []);
          });
      });

      it('returns page data on the config object', () => {
        return callPriorityKind('.json')
          .then((res) => {
            const actual = res.body.config.page;
            const expected = {
              walledGarden: false,
              slug: 'panorama-teenage-prison-abuse-exposed'
            };

            assert.deepEqual(actual, expected);
          });
      });

      it('returns metadata on the config object', () => {
        return callPriorityKind('.json')
          .then((res) => {
            const actual = res.body.config.metadata;
            const expected = {
              title: 'Panorama - Teenage Prison Abuse Exposed',
              description: 'Undercover investigation into the treatment of young people in prison.',
              keywords: 'Panorama, Teenage Prison Abuse Exposed',
              openGraph: {
                title: 'Panorama - Teenage Prison Abuse Exposed',
                description: 'Undercover investigation into the treatment of young people in prison.',
                image: 'https://ichef.bbci.co.uk/images/ic/1200x675/p03fchwy.jpg'
              }
            };

            assert.deepEqual(actual, expected);
          });
      });

      it('returns downloadURIs on the config object', () => {
        return callPriorityKind('.json')
          .then((res) => {
            const actual = res.body.config.downloadURIs;
            const expected = {
              SD: 'bbc-ipd:download/b06ymzly/b06z8z77/sd/standard/UGFub3JhbWEgLSBUZWVuYWdlIFByaXNvbiBBYnVzZSBFeHBvc2Vk/b006t14n/UGFub3JhbWE=',
              HD: 'bbc-ipd:download/b06ymzly/b06z8z77/hd/standard/UGFub3JhbWEgLSBUZWVuYWdlIFByaXNvbiBBYnVzZSBFeHBvc2Vk/b006t14n/UGFub3JhbWE='
            };

            assert.deepEqual(actual, expected);
          });
      });
      it('returns stats on the config object', () => {
        return callPriorityKind('.json')
          .then((res) => {
            const actual = res.body.config.stats;
            const expected = {
              counterName: 'iplayer.tv.episode.panorama.teenage_prison_abuse_exposed.b06ymzly.page',
              labels: {
                episode_id: 'b06ymzly',
                event_master_brand: 'bbc_one',
                episode_version: 'standard',
                object_editorial_type: 'doom',
                object_timeliness_type: 'last-chance',
                object_tleo_type: 'brand',
                page_type: 'episode',
                brand_id: 'b006t14n',
                tleo_id: 'b006t14n',
                related_link: 'not-shown'
              }
            };

            assert.deepEqual(actual, expected);
          });
      });

      it('returns stats on the config object and varies episode_version on the kind', () => {
        iblClient.getEpisodes.returns(Promise.resolve(episodeWithAudioDescribedAndSignedFixture));
        return request(server)
          .get('/iplayer/episode/b06ymzly/sign.json')
          .then((res) => {
            const actual = res.body.config.stats.labels.episode_version;
            const expected = 'sl';

            assert.equal(actual, expected);
          });
      });

      it('builds accessible config', () => {
        iblClient.getEpisodes.returns(Promise.resolve(episodeWithOnlySignedFixture));
        return request(server)
          .get('/iplayer/episode/b06ymzly/sign.json')
          .then((res) => {
            const actual = res.body.config.metadata;
            const expected = {
              title: 'Panorama - Teenage Prison Abuse Exposed - Signed',
              description: 'The incredible ways in which animals cope with living in the planet\'s deserts.',
              keywords: 'Panorama, Teenage Prison Abuse Exposed',
              openGraph: {
                title: 'Panorama - Teenage Prison Abuse Exposed',
                description: 'The incredible ways in which animals cope with living in the planet\'s deserts.',
                image: 'https://ichef.bbci.co.uk/images/ic/1200x675/p04hbfgn.jpg'
              }
            };

            assert.deepEqual(actual, expected);
          });
      });
    });

  });

});
