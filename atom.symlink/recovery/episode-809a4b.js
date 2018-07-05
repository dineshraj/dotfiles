'use strict';

const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const episodeConverter = require('@bbc/iplayer-web-metadata-converter');
const webRoutes = require('@bbc/iplayer-web-routes');

const episodeUtil = require('../../lib/episode');
const episodeFixture = require('../fixtures/episodeWithAudioDescribedAndSigned')[0];

const sandbox = sinon.sandbox.create();

describe('Episode Util', () => {
  it('returns priority version if no kind is passed', () => {
    assert.deepEqual(episodeUtil.getVersion(episodeFixture), episodeFixture.versions[0]);
  });

  it('returns specified version based on kind if it exists', () => {
    assert.deepEqual(episodeUtil.getVersion(episodeFixture, 'audio-described'), episodeFixture.versions[1]);
  });

  describe('.buildPagePath(episodeFixture, versionSlug, walledGarden)', () => {
    beforeEach(() => {
      sandbox.stub(episodeConverter, 'buildSlug').returns('foo-bar');
      sandbox.stub(webRoutes, 'childrensEpisode').returns('childrens-path');
      sandbox.stub(webRoutes, 'episode').returns('normal-path');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('builds a walledGarden path when on a walled garden page', () => {
      const output = episodeUtil.buildPagePath(episodeFixture, 'ad', true);

      sinon.assert.calledWith(episodeConverter.buildSlug, episodeFixture.title, episodeFixture.subtitle);
      sinon.assert.calledWith(webRoutes.childrensEpisode, episodeFixture.master_brand.id, episodeFixture.id, 'foo-bar', 'ad');

      assert.equal(output, 'childrens-path');
    });

    it('builds a non-children path', () => {
      const output = episodeUtil.buildPagePath(episodeFixture, 'ad', false);

      sinon.assert.calledWith(episodeConverter.buildSlug, episodeFixture.title, episodeFixture.subtitle);
      sinon.assert.calledWith(webRoutes.episode, episodeFixture.id, 'foo-bar', 'ad');

      assert.equal(output, 'normal-path');
    });
  });

  describe('.getAccessibleVersionSlug(episodeFixture, kind)', () => {
    it('returns undefined when a match isn\'t found', () => {
      assert.deepEqual(episodeUtil.getAccessibleVersionSlug(episodeFixture), undefined);
    });
    it('returns ad when it is audio-described', () => {
      assert.deepEqual(episodeUtil.getAccessibleVersionSlug(episodeFixture, 'audio-described'), 'ad');
    });
    it('returns sign when it is signed', () => {
      assert.deepEqual(episodeUtil.getAccessibleVersionSlug(episodeFixture, 'signed'), 'sign');
    });
  });

  describe('.getVersionKindFromSlug(kindSlug)', () => {
    it('returns undefined when a match isn\'t found', () => {
      assert.deepEqual(episodeUtil.getVersionKindFromSlug('none'), undefined);
    });
    it('returns audio-described when it is ad', () => {
      assert.deepEqual(episodeUtil.getVersionKindFromSlug('ad'), 'audio-described');
    });
    it('returns signed when it is sign', () => {
      assert.deepEqual(episodeUtil.getVersionKindFromSlug('sign'), 'signed');
    });
  });

  describe('.buildCompleteTitle(episodeFixture)', () => {
    it('builds the title on its own when there is no subtitle', () => {
      const episode = { title: 'This is a title' };

      assert.equal(episodeUtil.getCompleteTitle(episode), episode.title);
    });

    it('builds the title with a subtitle when one exists', () => {
      const episode = {
        title: 'This is a title',
        subtitle: 'This is now the subtitle'
      };

      assert.equal(episodeUtil.getCompleteTitle(episode), `${episode.title} - ${episode.subtitle}`);
    });
  });

  describe('.getdownloadURIs(episodeFixture)', () => {
    it('builds the downloadURIs without the HD option', () => {
      const episodeWithoutHD = _.merge(
        {},
        episodeFixture,
        {
          versions: [{ hd: false }]
        }
      );
      const downloadURIs = episodeUtil.getdownloadURIs(episodeWithoutHD);

      assert.equal(Object.keys(downloadURIs).length, 3);
    });

    it('builds the downloadURIs with the HD option', () => {
      const downloadURIs = episodeUtil.getdownloadURIs(episodeFixture);

      assert.equal(Object.keys(downloadURIs).length, 4);
    });

    it('orders the downloadURIs as SD, HD, AD, SL', () => {
      const downloadURIs = episodeUtil.getdownloadURIs(episodeFixture);
      const downloadOrder = ['SD', 'HD', 'AD', 'SL'];
      assert.deepEqual(Object.keys(downloadURIs), downloadOrder);
    });

    it('builds only available downloadURIs', () => {
      const episodeWith2downloadURIs = _.merge(
        {},
        episodeFixture,
        {
          versions: [
            {},
            {
              kind: 'audio-described',
              download: false
            }, {
              kind: 'signed',
              download: false
            }
          ]
        }
      );
      const downloadURIs = episodeUtil.getdownloadURIs(episodeWith2downloadURIs);

      assert.equal(Object.keys(downloadURIs).length, 2);
    });

    it('sd episode', () => {
      const actual = episodeUtil.getdownloadURIs(episodeFixture);
      const expected = 'bbc-ipd:download/b084ftll/b084ft6s/sd/standard/UGFub3JhbWEgLSBUZWVuYWdlIFByaXNvbiBBYnVzZSBFeHBvc2Vk/p02544td/UGFub3JhbWE=';

      assert.equal(actual.SD, expected);
    });

    it('hd episode', () => {
      const actual = episodeUtil.getdownloadURIs(episodeFixture);
      const expected = 'bbc-ipd:download/b084ftll/b084ft6s/hd/standard/UGFub3JhbWEgLSBUZWVuYWdlIFByaXNvbiBBYnVzZSBFeHBvc2Vk/p02544td/UGFub3JhbWE=';

      assert.equal(actual.HD, expected);
    });

    it('audio-described episode', () => {
      const actual = episodeUtil.getdownloadURIs(episodeFixture);
      const expected = 'bbc-ipd:download/b084ftll/p04j4xsf/sd/dubbedaudiodescribed/UGFub3JhbWEgLSBUZWVuYWdlIFByaXNvbiBBYnVzZSBFeHBvc2Vk/p02544td/UGFub3JhbWE=';

      assert.equal(actual.AD, expected);
    });

    it('signed episode', () => {
      const actual = episodeUtil.getdownloadURIs(episodeFixture);
      const expected = 'bbc-ipd:download/b084ftll/p04j4xs3/sd/signed/UGFub3JhbWEgLSBUZWVuYWdlIFByaXNvbiBBYnVzZSBFeHBvc2Vk/p02544td/UGFub3JhbWE=';

      assert.equal(actual.SL, expected);
    });

    it('replaces "/" with "-" in the title and complete titles', () => {
      const episodeWithEncodedSlashes = Object.assign(
        {},
        episodeFixture,
        {
          title: 'Horizon',
          subtitle: '2014-2015: 10. Dancing in the Dark - The End of Physics?'
        }
      );
      const actual = episodeUtil.getdownloadURIs(episodeWithEncodedSlashes);
      const expected = 'bbc-ipd:download/b084ftll/b084ft6s/sd/standard/SG9yaXpvbiAtIDIwMTQtMjAxNTogMTAuIERhbmNpbmcgaW4gdGhlIERhcmsgLSBUaGUgRW5kIG9mIFBoeXNpY3M-/p02544td/SG9yaXpvbg==';

      assert.equal(actual.SD, expected);
    });

    it('legal episode', () => {
      const episodeLegalKind = _.merge(
        {},
        episodeFixture,
        {
          versions: [{ kind: 'legal' }]
        }
      );
      const actual = episodeUtil.getdownloadURIs(episodeLegalKind);
      const expected = 'bbc-ipd:download/b084ftll/b084ft6s/sd/standard/UGFub3JhbWEgLSBUZWVuYWdlIFByaXNvbiBBYnVzZSBFeHBvc2Vk/p02544td/UGFub3JhbWE=';

      assert.equal(actual.SD, expected);
    });
  });
});
