'use strict';

const assert = require('assert');
const sinon = require('sinon');
const request = require('supertest');
const cheerio = require('cheerio');
const nock = require('nock');

const server = require('../../../index');
const translate = require('../../../lib/translate');
const navigationPresenter = require('../../../lib/presenters/navigation');
const footerPresenter = require('../../../lib/presenters/footer');
const flagpoles = require('../../../lib/clients/flagpoles');
const idcta = require('../../../lib/clients/idcta');
const iblGraph = require('../../../lib/clients/iblGraph');
const iblVariantsClient = require('../../../lib/clients/iblVariants');
const iblVariants = require('../../../lib/mvt/variants');
const stubOptimizely = require('../../stubOptimizely');

const sandbox = sinon.sandbox.create();

const fixtures = {
  idctaConfig: require('../../fixtures/idctaConfig'),
  homeView: require('../../fixtures/graphQL/home'),
  variants: require('../../fixtures/variants')
};

function requestHomepage() {
  return request(server)
    .get('/iplayer')
    .set('x-unique-id', 'pairing-chri-sand-andy-together4eva');
}

nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');

describe('Variants', () => {

  let translator;
  let stubbedOptimizelyPrefetcher;

  beforeEach(async () => {
    translator = sandbox.spy((key, values = []) => `translated_${[key, ...values].join('|')}`);
    sandbox.stub(translate, 'create').returns(translator);
    sandbox.stub(navigationPresenter, 'present').resolves();
    sandbox.stub(footerPresenter, 'present').resolves();
    sandbox.stub(flagpoles, 'get').returns(null);
    sandbox.stub(idcta, 'getConfig').resolves(fixtures.idctaConfig);
    sandbox.stub(iblGraph, 'graphQLById').resolves(fixtures.homeView);
    sandbox.stub(iblVariantsClient, 'get').resolves(fixtures.variants);
    stubbedOptimizelyPrefetcher = await stubOptimizely();
    sandbox.stub(stubbedOptimizelyPrefetcher, 'getBuckets').callThrough();
    await iblVariants.start();
  });

  afterEach(() => {
    sandbox.restore();
    nock.cleanAll();
  });

  it('shows the correct image for the user for episodes with a test', async () => {
    stubbedOptimizelyPrefetcher.getBuckets.withArgs(['ibl_episode_b09fc77r_MyTestId']).returns({
      ibl_episode_b09fc77r_MyTestId: 'ibl_episode_b09fc77r_MyTestId_alternate_logo'
    });

    const res = await requestHomepage();
    const $ = cheerio.load(res.text);
    const $firstContentItem = $('.content-item').eq(0);
    const $firstContentItemImageSource = $firstContentItem.find('.content-item__image source').eq(0).attr('srcset');
    assert($firstContentItemImageSource.includes('photo2'));
  });

  it('shows the original image when the test is not active', async () => {
    stubbedOptimizelyPrefetcher.getBuckets.withArgs(['ibl_episode_b09fc77r_MyTestId']).returns({});

    const res = await requestHomepage();
    const $ = cheerio.load(res.text);
    const $firstContentItem = $('.content-item').eq(0);
    const $firstContentItemImageSource = $firstContentItem.find('.content-item__image source').eq(0).attr('srcset');
    assert($firstContentItemImageSource.includes('p05nlv6z'));
  });

  it('sets a cookie with the updated set of buckets, including iBL variant tests and sets a no-cache header', async () => {
    sandbox.useFakeTimers();
    stubbedOptimizelyPrefetcher.getBuckets.callsFake(() => {
      return {
        another_experiment_key: 'another-other-variation-key'
      };
    });
    stubbedOptimizelyPrefetcher.getBuckets.withArgs(['ibl_episode_b09fc77r_MyTestId']).returns({
      ibl_episode_b09fc77r_MyTestId: 'ibl_episode_b09fc77r_MyTestId_alternate_logo'
    });
    sandbox.spy(stubbedOptimizelyPrefetcher, 'getBucketsToPersist');

    const expectedCookieContents = encodeURIComponent(JSON.stringify({
      some_experiment_key: 'some-variation-key',
      ibl_episode_b09fc77r_mytestid: 'ibl_episode_b09fc77r_MyTestId_alternate_logo',
      another_experiment_key: 'another-other-variation-key'
    }));

    const res = await requestHomepage()
      .set('x-experiment-some_experiment_key', 'some-variation-key')
      .expect(200);

    sandbox.assert.calledWith(stubbedOptimizelyPrefetcher.getBucketsToPersist, {
      some_experiment_key: 'some-variation-key'
    }, {
      another_experiment_key: 'another-other-variation-key',
      ibl_episode_b09fc77r_MyTestId: 'ibl_episode_b09fc77r_MyTestId_alternate_logo'
    });
    const expectedSetCookie = `ckpf_iplayer_experiments=${expectedCookieContents}; Domain=.bbc.co.uk; Path=/; Expires=Fri, 01 Jan 1971 00:00:00 GMT`;
    assert(res.headers['set-cookie'].includes(expectedSetCookie), `Expected to find this...\n${expectedSetCookie}\nin this...\n${res.headers['set-cookie']}\n`);
    assert(res.headers['cache-control'].includes('no-cache'));
  });

  it('sets a cookie with the updated set of buckets, including iBL variant tests event when not bucketted into a variant', async () => {
    sandbox.useFakeTimers();
    stubbedOptimizelyPrefetcher.getBuckets.callsFake(() => {
      return {
        another_experiment_key: 'another-other-variation-key'
      };
    });
    stubbedOptimizelyPrefetcher.getBuckets.withArgs(['ibl_episode_b09fc77r_MyTestId']).returns({
      ibl_episode_b09fc77r_MyTestId: null
    });
    sandbox.spy(stubbedOptimizelyPrefetcher, 'getBucketsToPersist');

    const expectedCookieContents = encodeURIComponent(JSON.stringify({
      some_experiment_key: 'some-variation-key',
      ibl_episode_b09fc77r_mytestid: null,
      another_experiment_key: 'another-other-variation-key'
    }));

    const res = await requestHomepage()
      .set('x-experiment-some_experiment_key', 'some-variation-key')
      .expect(200);

    sandbox.assert.calledWith(stubbedOptimizelyPrefetcher.getBucketsToPersist, {
      some_experiment_key: 'some-variation-key'
    }, {
      another_experiment_key: 'another-other-variation-key',
      ibl_episode_b09fc77r_MyTestId: null
    });
    const expectedSetCookie = `ckpf_iplayer_experiments=${expectedCookieContents}; Domain=.bbc.co.uk; Path=/; Expires=Fri, 01 Jan 1971 00:00:00 GMT`;
    assert(res.headers['set-cookie'].includes(expectedSetCookie), `Expected to find this...\n${expectedSetCookie}\nin this...\n${res.headers['set-cookie']}\n`);
    assert(res.headers['cache-control'].includes('no-cache'));
  });

  it('sets a cookie with the updated set of buckets, including iBL variant tests when already bucketted', async () => {
    sandbox.useFakeTimers();
    stubbedOptimizelyPrefetcher.getBuckets.callsFake(() => {
      return {
        another_experiment_key: 'another-other-variation-key',
        ibl_episode_b09fc77r_mytestid: 'ibl_episode_b09fc77r_mytestid_another_variant'
      };
    });
    stubbedOptimizelyPrefetcher.getBuckets.withArgs(['ibl_episode_b09fc77r_MyTestId']).returns({
      ibl_episode_b09fc77r_mytestid: 'ibl_episode_b09fc77r_mytestid_another_variant'
    });
    sandbox.spy(stubbedOptimizelyPrefetcher, 'getBucketsToPersist');

    const expectedCookieContents = encodeURIComponent(JSON.stringify({
      ibl_episode_b09fc77r_mytestid: 'ibl_episode_b09fc77r_mytestid_another_variant',
      some_experiment_key: 'some-variation-key',
      another_experiment_key: 'another-other-variation-key'
    }));

    const res = await requestHomepage()
      .set('x-experiment-some_experiment_key', 'some-variation-key')
      .set('x-experiment-ibl_episode_b09fc77r_mytestid', 'ibl_episode_b09fc77r_mytestid_another_variant')
      .expect(200);

    sandbox.assert.calledWith(stubbedOptimizelyPrefetcher.getBucketsToPersist, {
      ibl_episode_b09fc77r_mytestid: 'ibl_episode_b09fc77r_mytestid_another_variant',
      some_experiment_key: 'some-variation-key'
    }, {
      another_experiment_key: 'another-other-variation-key',
      ibl_episode_b09fc77r_mytestid: 'ibl_episode_b09fc77r_mytestid_another_variant'
    });
    const expectedSetCookie = `ckpf_iplayer_experiments=${expectedCookieContents}; Domain=.bbc.co.uk; Path=/; Expires=Fri, 01 Jan 1971 00:00:00 GMT`;
    assert(res.headers['set-cookie'].includes(expectedSetCookie), `Expected to find this...\n${expectedSetCookie}\nin this...\n${res.headers['set-cookie']}\n`);
    assert(res.headers['cache-control'].includes('no-cache'));
  });

  describe('getStatsLabels', () => {

    it('is called with the correct existing buckets, and combination of page and ibl buckets', async () => {
      stubbedOptimizelyPrefetcher.getBuckets.callsFake(() => {
        return {
          another_experiment_key: 'another-other-variation-key'
        };
      });
      stubbedOptimizelyPrefetcher.getBuckets.withArgs(['ibl_episode_b09fc77r_MyTestId']).returns({
        ibl_episode_b09fc77r_MyTestId: 'ibl_episode_b09fc77r_MyTestId_alternate_logo'
      });
      sandbox.spy(stubbedOptimizelyPrefetcher, 'getStatsLabels');

      await requestHomepage()
        .set('x-experiment-not_running_experiment', 'not-running')
        .expect(200);

      sandbox.assert.calledWith(
        stubbedOptimizelyPrefetcher.getStatsLabels,
        {
          not_running_experiment: 'not-running'
        },
        {
          another_experiment_key: 'another-other-variation-key',
          ibl_episode_b09fc77r_MyTestId: 'ibl_episode_b09fc77r_MyTestId_alternate_logo'
        },
        'pairing-chri-sand-andy-together4eva'
      );
    });

    it('is called with the correct existing buckets, and combination of page and ibl variant null buckets', async () => {
      stubbedOptimizelyPrefetcher.getBuckets.callsFake(() => {
        return {
          another_experiment_key: 'another-other-variation-key'
        };
      });
      stubbedOptimizelyPrefetcher.getBuckets.withArgs(['ibl_episode_b09fc77r_MyTestId']).returns({
        ibl_episode_b09fc77r_MyTestId: null
      });
      sandbox.spy(stubbedOptimizelyPrefetcher, 'getStatsLabels');

      await requestHomepage()
        .set('x-experiment-not_running_experiment', 'not-running')
        .expect(200);

      sandbox.assert.calledWith(
        stubbedOptimizelyPrefetcher.getStatsLabels,
        {
          not_running_experiment: 'not-running'
        },
        {
          another_experiment_key: 'another-other-variation-key',
          ibl_episode_b09fc77r_MyTestId: null
        },
        'pairing-chri-sand-andy-together4eva'
      );
    });

    it('is called with the correct existing buckets, and combination of page and ibl variant already bucketted', async () => {
      stubbedOptimizelyPrefetcher.getBuckets.callsFake(() => {
        return {
          another_experiment_key: 'another-other-variation-key',
          ibl_episode_b09fc77r_mytestid: 'ibl_episode_b09fc77r_mytestid_another_variant'
        };
      });
      stubbedOptimizelyPrefetcher.getBuckets.withArgs(['ibl_episode_b09fc77r_MyTestId']).returns({
        ibl_episode_b09fc77r_mytestid: 'ibl_episode_b09fc77r_mytestid_another_variant'
      });
      sandbox.spy(stubbedOptimizelyPrefetcher, 'getStatsLabels');

      await requestHomepage()
        .set('x-experiment-not_running_experiment', 'not-running')
        .set('x-experiment-ibl_episode_b09fc77r_mytestid', 'ibl_episode_b09fc77r_mytestid_another_variant')
        .expect(200);

      sandbox.assert.calledWith(
        stubbedOptimizelyPrefetcher.getStatsLabels,
        {
          not_running_experiment: 'not-running',
          ibl_episode_b09fc77r_mytestid: 'ibl_episode_b09fc77r_mytestid_another_variant'
        },
        {
          another_experiment_key: 'another-other-variation-key',
          ibl_episode_b09fc77r_mytestid: 'ibl_episode_b09fc77r_mytestid_another_variant'
        },
        'pairing-chri-sand-andy-together4eva'
      );
    });

    it('passes the correct variant to ibl', () => {
      const expectedExperimentVariant = {
        iplxp_pb01_pikachu: 'thunderbolt'
      };

      
    });

  });

});
