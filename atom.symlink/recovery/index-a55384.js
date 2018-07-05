'use strict';

const pkg = require('../package.json');
const fs = require('fs');
const assert = require('assert');
const sandbox = require('sinon').createSandbox();
const optimizely = require('@optimizely/optimizely-sdk');
const experimentation = require('../');

const fixtures = {
  experimentsContext: require('./fixtures/experimentsContext')
};

const TEN_MINUTES = (1000 * 60) * 10;

function getFakeIblClient(fixture = { some: 'data' }) {
  return {
    getExperimentsContext: sandbox.stub().resolves(fixture)
  };
}

function buildOptimizely() {
  const getVariation = sandbox.stub().returns('some-variant');
  const createInstance = sandbox.stub(optimizely, 'createInstance').returns({
    getVariation
  });
  return {
    createInstance,
    getVariation
  };
}

function tickWithPromise(duration) {
  sandbox.clock.tick(duration);
  return Promise.resolve();
}

function getIdentityHeader(opts = {}) {
  const data = Object.assign({
    ep: true
  }, opts);
  return new Buffer(JSON.stringify(data), 'utf8').toString('base64');
}

function getResponseObject() {
  return {
    vary: sandbox.stub(),
    setHeader: sandbox.stub()
  };
}

function getFixtureScriptCode(filename) {
  return fs.readFileSync(`${__dirname}/fixtures/${filename}`, 'utf8').replace('%version%', pkg.version);
}

describe('Experimentation', () => {

  beforeEach(() => {
    sandbox.useFakeTimers();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('exposes a createPrefetcher() method', () => {
    assert.equal(typeof experimentation.createPrefetcher, 'function');
  });

  describe('createPrefetcher()', () => {

    describe('.start()', () => {

      it('fetches the feed from iBL and resolves', async () => {
        const ibl = getFakeIblClient();
        await experimentation.createPrefetcher({ ibl }).start();
        sandbox.assert.calledWith(ibl.getExperimentsContext, sandbox.match({ platform: 'web' }));
      });

      it('fetches the feed every 5 minutes', async () => {
        const ibl = getFakeIblClient();
        await experimentation.createPrefetcher({ ibl }).start();
        sandbox.clock.tick(TEN_MINUTES);
        sandbox.assert.calledThrice(ibl.getExperimentsContext);
      });

      it('resolves even if ibl client fails', async () => {
        const ibl = {
          getExperimentsContext: sandbox.stub().rejects(new Error('woops'))
        };
        await experimentation.createPrefetcher({ ibl }).start();
      });

      it('creates an optimizely instance with the experimentDefinitions from iBL', async () => {
        const { createInstance } = buildOptimizely();
        const ibl = getFakeIblClient(fixtures.experimentsContext);
        await experimentation.createPrefetcher({ ibl }).start();
        sandbox.assert.calledWith(createInstance, { datafile: fixtures.experimentsContext.experimentDefinitions });
      });

      it('recreates an optimizely instance with the experimentDefinitions from iBL every 5 minutes', async () => {
        const { createInstance } = buildOptimizely();
        const ibl = {
          getExperimentsContext: sandbox.stub()
            .onCall(0).resolves({ experimentDefinitions: 1 })
            .onCall(1).resolves({ experimentDefinitions: 2 })
            .onCall(2).resolves({ experimentDefinitions: 3 })
        };
        await experimentation.createPrefetcher({ ibl }).start();
        sandbox.assert.calledWith(createInstance, { datafile: 1 });
        await tickWithPromise(TEN_MINUTES);
        sandbox.assert.calledWith(createInstance, { datafile: 2 });
        sandbox.assert.calledWith(createInstance, { datafile: 3 });
      });

    });

    describe('getMiddleware()', () => {

      it('returns a middleware function', async () => {
        const ibl = getFakeIblClient();
        const prefetcher = experimentation.createPrefetcher({ ibl });
        const middlewareFunction = prefetcher.getMiddleware({ scope: 'some-scope' });
        const next = sandbox.stub();
        const req = {
          header: sandbox.stub()
        };

        middlewareFunction(req, {}, next);

        sandbox.assert.calledOnce(next);
      });

      it('creates a default experimentation object on the request when nothing in the iBL cache', async () => {
        const ibl = getFakeIblClient();
        const prefetcher = experimentation.createPrefetcher({ ibl });
        const middlewareFunction = prefetcher.getMiddleware({ scope: 'some-scope' });
        const req = {
          header: sandbox.stub()
        };
        const next = sandbox.stub();

        middlewareFunction(req, {}, next);

        sandbox.assert.calledOnce(next);
        assert.deepEqual(req.experimentation, {
          context: null,
          variants: {},
          scope: 'some-scope'
        });
      });

      it('creates a default experimentation object on the request when there is no cookiePolicy on the request', async () => {
        const { getVariation } = buildOptimizely();
        getVariation.withArgs('iplxp_pb01_pikachu').returns('pikachu_variant');
        const ibl = getFakeIblClient(fixtures.experimentsContext);
        const prefetcher = experimentation.createPrefetcher({ ibl });
        await prefetcher.start();
        const middlewareFunction = prefetcher.getMiddleware({ scope: 'home' });
        const req = {
          header: sandbox.stub()
        };
        const next = sandbox.stub();

        middlewareFunction(req, getResponseObject(), next);

        sandbox.assert.neverCalledWith(req.header, 'x-hashed-id');
        sandbox.assert.neverCalledWith(req.header, 'x-identity');
        sandbox.assert.neverCalledWith(getVariation, 'iplxp_pb01_pikachu', 'x-hashed-id-value');
        sandbox.assert.calledOnce(next);
        assert.deepEqual(req.experimentation, {
          context: fixtures.experimentsContext,
          variants: {},
          scope: 'home'
        });
      });

      it('creates a default experimentation object on the request when iBL data exists but an optimizely instance cannot be created', async () => {
        const { createInstance, getVariation } = buildOptimizely();
        getVariation.returns('some-variant');
        createInstance.throws(new Error('no'));
        const ibl = getFakeIblClient(fixtures.experimentsContext);
        const prefetcher = experimentation.createPrefetcher({ ibl });
        const middlewareFunction = prefetcher.getMiddleware({ scope: 'home' });
        const req = {
          header: sandbox.stub(),
          cookiePolicy: {
            performance: true
          }
        };
        req.header.withArgs('x-hashed-id').returns('x-hashed-id-value');
        req.header.withArgs('x-identity').returns(getIdentityHeader());
        const next = sandbox.stub();
        await prefetcher.start();

        middlewareFunction(req, {}, next);

        sandbox.assert.calledOnce(next);
        assert.deepEqual(req.experimentation, {
          context: fixtures.experimentsContext,
          variants: {},
          scope: 'home'
        });
      });

      it('creates a default experimentation object on the request when cookiePolicy has performance disabled', async () => {
        const { getVariation } = buildOptimizely();
        getVariation.withArgs('iplxp_pb01_pikachu').returns('pikachu_variant');
        const ibl = getFakeIblClient(fixtures.experimentsContext);
        const prefetcher = experimentation.createPrefetcher({ ibl });
        await prefetcher.start();
        const middlewareFunction = prefetcher.getMiddleware({ scope: 'home' });
        const req = {
          header: sandbox.stub(),
          cookiePolicy: {
            performance: false
          }
        };
        const next = sandbox.stub();

        middlewareFunction(req, getResponseObject(), next);

        sandbox.assert.neverCalledWith(req.header, 'x-hashed-id');
        sandbox.assert.neverCalledWith(req.header, 'x-identity');
        sandbox.assert.neverCalledWith(getVariation, 'iplxp_pb01_pikachu', 'x-hashed-id-value');
        sandbox.assert.calledOnce(next);
        assert.deepEqual(req.experimentation, {
          context: fixtures.experimentsContext,
          variants: {},
          scope: 'home'
        });
      });

      it('creates a default experimentation object on the request and does not get any variations when user does not allow personalisation', async () => {
        const { getVariation } = buildOptimizely();
        const ibl = getFakeIblClient(fixtures.experimentsContext);
        const prefetcher = experimentation.createPrefetcher({ ibl });
        await prefetcher.start();
        const middlewareFunction = prefetcher.getMiddleware({ scope: 'home' });
        const req = {
          header: sandbox.stub().withArgs('x-identity').returns(getIdentityHeader({ ep: false }))
        };
        const next = sandbox.stub();

        middlewareFunction(req, getResponseObject(), next);

        sandbox.assert.notCalled(getVariation);
        sandbox.assert.calledOnce(next);
        assert.deepEqual(req.experimentation, {
          context: fixtures.experimentsContext,
          variants: {},
          scope: 'home'
        });
      });

      it('creates the correct experimentation object for experiments using the user ID', async () => {
        const { getVariation } = buildOptimizely();
        getVariation.withArgs('iplxp_pb01_pikachu').returns('pikachu_variant');
        const ibl = getFakeIblClient(fixtures.experimentsContext);
        const prefetcher = experimentation.createPrefetcher({ ibl });
        await prefetcher.start();
        const middlewareFunction = prefetcher.getMiddleware({ scope: 'home' });
        const req = {
          header: sandbox.stub(),
          cookiePolicy: {
            performance: true
          }
        };
        req.header.withArgs('x-hashed-id').returns('x-hashed-id-value');
        req.header.withArgs('x-identity').returns(getIdentityHeader());
        const next = sandbox.stub();

        middlewareFunction(req, getResponseObject(), next);

        sandbox.assert.calledWith(req.header, 'x-hashed-id');
        sandbox.assert.calledWith(getVariation, 'iplxp_pb01_pikachu', 'x-hashed-id-value');
        sandbox.assert.calledOnce(next);
        assert.deepEqual(req.experimentation.variants, {
          iplxp_pb01_pikachu: 'pikachu_variant'
        });
      });

      it('creates the correct experimentation object for experiments using the device ID', async () => {
        const { getVariation } = buildOptimizely();
        getVariation.withArgs('iplxp_pb03_raichu').returns('raichu_variant');
        const ibl = getFakeIblClient(fixtures.experimentsContext);
        const prefetcher = experimentation.createPrefetcher({ ibl });
        await prefetcher.start();
        const middlewareFunction = prefetcher.getMiddleware({ scope: 'playback' });
        const req = {
          header: sandbox.stub(),
          cookiePolicy: {
            performance: true
          }
        };
        req.uniqueId.returns('some-awesome-id');
        const next = sandbox.stub();

        middlewareFunction(req, getResponseObject(), (next));

        sandbox.assert.calledWith(req.header, 'x-unique-id');
        sandbox.assert.calledWith(getVariation, 'iplxp_pb03_raichu', 'some-awesome-id');
        sandbox.assert.neverCalledWith(req.header, 'x-hashed-id');
        sandbox.assert.calledOnce(next);
        assert.deepEqual(req.experimentation.variants, {
          iplxp_pb03_raichu: 'raichu_variant'
        });
      });

      it('creates the correct experimentation object for experiments that already have a variation', async () => {
        const { getVariation } = buildOptimizely();
        const ibl = getFakeIblClient(fixtures.experimentsContext);
        const prefetcher = experimentation.createPrefetcher({ ibl });
        await prefetcher.start();
        const middlewareFunction = prefetcher.getMiddleware({ scope: 'playback' });
        const req = {
          header: sandbox.stub(),
          cookiePolicy: {
            performance: true
          }
        };
        req.header.withArgs('x-experiment-iplxp_pb03_raichu').returns('existing-variation');
        const next = sandbox.stub();

        middlewareFunction(req, getResponseObject(), (next));

        sandbox.assert.notCalled(getVariation);
        sandbox.assert.calledOnce(next);
        assert.deepEqual(req.experimentation.variants, {
          iplxp_pb03_raichu: 'existing-variation'
        });
      });

      describe('Response headers', () => {

        it('adds vary headers for each experiment in the scope', async () => {
          const { getVariation } = buildOptimizely();
          getVariation.returns('variant');
          const ibl = getFakeIblClient(fixtures.experimentsContext);
          const prefetcher = experimentation.createPrefetcher({ ibl });
          await prefetcher.start();
          const middlewareFunction = prefetcher.getMiddleware({ scope: 'vary' });
          const req = {
            header: sandbox.stub().returns('header')
          };
          const res = getResponseObject();
          const next = sandbox.stub();

          middlewareFunction(req, res, next);

          sandbox.assert.calledWith(res.vary, 'x-experiment-iplxp_pb01_pikachu');
          sandbox.assert.calledWith(res.vary, 'x-experiment-iplxp_pb02_other');
        });

        it('adds a vary header for x-signed-in if there is an experiment in scope requiring user_id', async () => {
          const { getVariation } = buildOptimizely();
          getVariation.returns('variant');
          const ibl = getFakeIblClient(fixtures.experimentsContext);
          const prefetcher = experimentation.createPrefetcher({ ibl });
          await prefetcher.start();
          const middlewareFunction = prefetcher.getMiddleware({ scope: 'home' });
          const req = {
            header: sandbox.stub(),
            cookiePolicy: {
              performance: true
            }
          };
          req.header.withArgs('x-identity').returns(getIdentityHeader({ ep: false }));
          req.header.withArgs('x-hashed-id').returns('some-awesome-id');
          const res = getResponseObject();
          const next = sandbox.stub();

          middlewareFunction(req, res, next);

          sandbox.assert.calledWith(res.vary, 'x-signed-in');
        });

        it('does not add a vary header for x-signed-in if there is no experiment in scope requiring user_id', async () => {
          const { getVariation } = buildOptimizely();
          getVariation.returns('variant');
          const ibl = getFakeIblClient(fixtures.experimentsContext);
          const prefetcher = experimentation.createPrefetcher({ ibl });
          await prefetcher.start();
          const middlewareFunction = prefetcher.getMiddleware({ scope: 'playback' });
          const req = {
            header: sandbox.stub(),
            cookiePolicy: {
              performance: true
            }
          };
          req.header.withArgs('x-unique-id').returns('some-awesome-id');
          const res = getResponseObject();
          const next = sandbox.stub();

          middlewareFunction(req, res, next);

          sandbox.assert.neverCalledWith(res.vary, 'x-signed-in');
        });

        it('does not add vary headers or do anything experimentation related when CDN header is set', async () => {
          const { getVariation } = buildOptimizely();
          getVariation.returns('variant');
          const ibl = getFakeIblClient(fixtures.experimentsContext);
          const prefetcher = experimentation.createPrefetcher({ ibl });
          await prefetcher.start();
          const middlewareFunction = prefetcher.getMiddleware({ scope: 'vary' });
          const req = {
            header: sandbox.stub().withArgs('x-cdn').returns('1')
          };
          const res = getResponseObject();
          const next = sandbox.stub();

          middlewareFunction(req, res, next);

          sandbox.assert.neverCalledWith(res.vary, 'x-experiment-iplxp_pb01_pikachu');
          sandbox.assert.neverCalledWith(res.vary, 'x-experiment-iplxp_pb02_other');
          sandbox.assert.neverCalledWith(req.header, 'x-hashed-id');
          sandbox.assert.neverCalledWith(req.header, 'x-identity');
          sandbox.assert.neverCalledWith(req.header, 'x-unique-id');
          sandbox.assert.notCalled(getVariation);
        });

        it('adds a no-cache header if user is not already activated into an experiment that is in scope', async () => {
          const { getVariation } = buildOptimizely();
          getVariation.withArgs('iplxp_pb03_raichu').returns('raichu_variant');
          const ibl = getFakeIblClient(fixtures.experimentsContext);
          const prefetcher = experimentation.createPrefetcher({ ibl });
          await prefetcher.start();
          const middlewareFunction = prefetcher.getMiddleware({ scope: 'playback' });
          const req = {
            header: sandbox.stub(),
            cookiePolicy: {
              performance: true
            }
          };
          const res = getResponseObject();
          req.header.withArgs('x-unique-id').returns('some-awesome-id');
          const next = sandbox.stub();

          middlewareFunction(req, res, (next));

          sandbox.assert.calledWith(res.setHeader, 'Cache-Control', 'private,no-store,no-cache,must-revalidate,max-age=0');
        });

        it('does not add a no-cache header if user is already activated into all experiments that are in scope', async () => {
          const { getVariation } = buildOptimizely();
          getVariation.withArgs('iplxp_pb03_raichu').returns('raichu_variant');
          const ibl = getFakeIblClient(fixtures.experimentsContext);
          const prefetcher = experimentation.createPrefetcher({ ibl });
          await prefetcher.start();
          const middlewareFunction = prefetcher.getMiddleware({ scope: 'playback' });
          const req = {
            header: sandbox.stub(),
            cookiePolicy: {
              performance: true
            }
          };
          const res = getResponseObject();
          req.header.withArgs('x-unique-id').returns('some-awesome-id');
          req.header.withArgs('x-experiment-iplxp_pb03_raichu').returns('some-variant');
          const next = sandbox.stub();

          middlewareFunction(req, res, (next));

          sandbox.assert.neverCalledWith(res.setHeader, 'Cache-Control', 'private,no-store,no-cache,must-revalidate,max-age=0');
        });

        it('adds a no-cache header and does not get variant if user has personalisation turned off and an experiment in scope uses the user id', async () => {
          const { getVariation } = buildOptimizely();
          getVariation.returns('raichu_variant');
          const ibl = getFakeIblClient(fixtures.experimentsContext);
          const prefetcher = experimentation.createPrefetcher({ ibl });
          await prefetcher.start();
          const middlewareFunction = prefetcher.getMiddleware({ scope: 'home' });
          const req = {
            header: sandbox.stub(),
            cookiePolicy: {
              performance: true
            }
          };
          const res = getResponseObject();
          req.header.withArgs('x-identity').returns(getIdentityHeader({ ep: false }));
          req.header.withArgs('x-hashed-id').returns('some-awesome-id');
          const next = sandbox.stub();

          middlewareFunction(req, res, (next));

          sandbox.assert.notCalled(getVariation);
          sandbox.assert.calledWith(res.setHeader, 'Cache-Control', 'private,no-store,no-cache,must-revalidate,max-age=0');
        });

        it('does not a no-cache header and does not get variant if user is not signed in but an experiment in scope uses the user id', async () => {
          const { getVariation } = buildOptimizely();
          getVariation.returns('raichu_variant');
          const ibl = getFakeIblClient(fixtures.experimentsContext);
          const prefetcher = experimentation.createPrefetcher({ ibl });
          await prefetcher.start();
          const middlewareFunction = prefetcher.getMiddleware({ scope: 'home' });
          const req = {
            header: sandbox.stub(),
            cookiePolicy: {
              performance: true
            }
          };
          const res = getResponseObject();
          const next = sandbox.stub();

          middlewareFunction(req, res, (next));

          sandbox.assert.notCalled(getVariation);
          sandbox.assert.neverCalledWith(res.setHeader, 'Cache-Control', 'private,no-store,no-cache,must-revalidate,max-age=0');
        });

      });

    });

  });

  describe('getScript()', () => {

    it('returns an empty string if no experimentation data is found on the request', () => {
      const scriptData = experimentation.getScript({});
      assert.equal(scriptData, '');
    });

    it('returns just the require config if exprimentation has missing context', () => {
      const scriptCodeWithoutActivation = getFixtureScriptCode('scriptCodeWithoutActivation.txt');
      const scriptData = experimentation.getScript({
        experimentation: {
          context: null,
          variants: {
            some: 'variant'
          },
          scope: 'some-scope'
        }
      });
      assert.equal(scriptData, scriptCodeWithoutActivation);
    });

    it('requires and calls the activate method with the correct scope and context', () => {
      const scriptCodeWithActivation = getFixtureScriptCode('scriptCodeWithActivation.txt');
      const scriptData = experimentation.getScript({
        experimentation: {
          context: {
            some: 'data'
          },
          variants: {
            some: 'variant'
          },
          scope: 'some-scope'
        }
      });
      assert.equal(scriptData, scriptCodeWithActivation);
    });

  });

});
