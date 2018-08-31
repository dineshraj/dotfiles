import { Link } from 'react-router-dom';

import { PlayCta, ContentItem } from '@bbc/iplayer-web-components';

interface Props {
  title: string,
  subtitle: string
}

export default function ProgrammeInfo({
  title,
  subtitle
}: Props) {
  return (
    <div className="playback-gradient playback-gradient--content gel-wrap">
      <div className="playback-content">
        <PlayCta
          loading={true}
          episode={{ title, subtitle }}
        />
        <ContentItem href="#" />
        <Link to='/iplayer/episode/p00wg3f8/cuckoo-series-1-1-the-homecoming'>ANTHONY...WHY?!?!?</Link>
      </div>
    </div>
  );
}
