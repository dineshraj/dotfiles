import sinon from 'sinon';
import { bundlePage, getStubs } from '../bundlePage';
import { fetchEpisodes } from '../../src/clients/clientIbl';

const sandbox = sinon.createSandbox();
const bundleRunner = bundlePage(sandbox);

describe('Client IBL', () => {

  it('fetches the episode from IBL when fetchEpisodes is called', async () {
    const { window } = await bundleRunner();
    await fetchEpisodes();
    sinon.assert.calledOnce(window.fetch)
  });

})
