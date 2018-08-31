import assert from 'assert';
import sinon from 'sinon';
import { bundlePage } from '../bundlePage';

const sandbox = sinon.createSandbox();
const bundleRunner = bundlePage(sandbox);

describe('Onward Journeys', () => {

  it('updates the episode when clicking on a related episode', async () => {
    const { document } = await bundleRunner();
    document.querySelector('content-item:').click();
  });

});
