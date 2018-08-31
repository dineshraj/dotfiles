import assert from 'assert';
import sinon from 'sinon';
import { bundlePage } from '../bundlePage';
import iblEpisodesResponse from '../fixtures/bar.json';
import iblRelatedEpisodesResponseFixture from '../fixtures/foo.json';

const sandbox = sinon.createSandbox();
const bundleRunner = bundlePage(sandbox);

describe.only('Onward Journeys', () => {

  it('calls fetch with the correct arguments when fetching episode when clicking a related episode', async () => {
    const { document, window } = await bundleRunner();
    const expectedIblUrl = 'https://ibl.api.bbci.co.uk/ibl/v1/episodes/b00jd8gp?rights=web&availability=available&mixin=live';
    const expectedIblOptions = { method: 'GET', headers: { 'Content-Type': 'application/json; charset=utf-8' } };
    window.fetch.resolves({
      json: sandbox.stub().resolves(iblEpisodesResponse)
    });

    document.querySelectorAll('.content-item .content-item__link')[0].click();

    const fetchArgsForFirstCall = window.fetch.args[0];

    assert.deepEqual(fetchArgsForFirstCall, [expectedIblUrl, expectedIblOptions]);
  });

  it.only('calls fetch with correct arguments when fetching related episodes when clicking a related episode', async () => {
    const { document, window } = await bundleRunner();
    const jsonStub = sandbox.stub();

    jsonStub.onCall(0).returns(() => {
      return new Promise((resolve, reject) => {
        resolve(iblEpisodesResponse);
      });
    });

    jsonStub.onCall(1).returns(() => {
      return new Promise((resolve, reject) => {
        resolve(iblRelatedEpisodesResponseFixture);
      });
    });

    // jsonStub.onCall(1).resolves(iblRelatedEpisodesResponseFixture);
    window.fetch.resolves({ json: jsonStub });

    document.querySelectorAll('.content-item .content-item__link')[0].click();

    const expectedIblUrl = 'https://ibl.api.bbci.co.uk/ibl/v1/programmes/b0b3q4bk/episodes?rights=web&availability=available&per_page=4';
    const expectedIblOptions = { method: 'GET', headers: { 'Content-Type': 'application/json; charset=utf-8' } };
    const fetchArgsForSecondCall = window.fetch.args[1];

    console.log('window.fetch.args', window.fetch.args);

    assert.deepEqual(fetchArgsForSecondCall, [expectedIblUrl, expectedIblOptions]);
  });

});
