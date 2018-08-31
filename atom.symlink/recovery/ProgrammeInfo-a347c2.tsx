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
        <div className="gel-layout">
          <li className="gel-layout__item gel-1/1 gel-1/3@m gel-1/4@xl component__example">
            <ContentItem
              href="#"
              title="Content Item with a href"
              itemsPerRow={{"xs": 1,"m":3,"xl":4}}
              imageTemplate="https://ichef.bbci.co.uk/images/ic/{recipe}/p05h727d.jpg" />
          </li>
          <li className="gel-layout__item gel-1/1 gel-1/3@m gel-1/4@xl component__example">
            <ContentItem
              linkComponent={Link}
              href="/gavin-stacey-series-1-episode-3"
              title="Content Item with a component"
              itemsPerRow={{"xs": 1,"m":3,"xl":4}}
              imageTemplate="https://ichef.bbci.co.uk/images/ic/{recipe}/p05h727d.jpg" />
          </li>
        </div>
      </div>
    </div>
  );
}
