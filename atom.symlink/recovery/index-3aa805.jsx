import {
  Placeholder,
  ResponsiveImage,
  Icon
} from '../../../';

function renderLabel(label) {
  if (label) {
    return <span className="feature-item__label typo typo--bullfinch typo--bold">{label}</span>;
  }
}

function renderTitle(title) {
  return <p className="feature-item__title typo typo--heron typo--bold">{title}</p>;
}

function renderSubtitle(subtitle) {
  if (subtitle) {
    return <p className="feature-item__subtitle typo typo--skylark">{subtitle}</p>;
  }
}

function renderSynopsis(synopsis) {
  if (synopsis) {
    return <p className="feature-item__synopsis typo typo--skylark">{synopsis}</p>;
  }
}

function renderResponsiveImage(recipe) {
  const sources = [{
    srcset: `${recipe.replace('{recipe}', '416x234')} 416w, ${recipe.replace('{recipe}', '608x342')} 608w`,
    sizes: '416px'
  }];

  return (
    <Placeholder>
      <ResponsiveImage sources={sources} />
      <div className="feature-item__play-button">
        <Icon icon="iplayer" classes="feature-item__play-icon" />
      </div>
    </Placeholder>
  );
}

export default function FeatureItem({
  recipe,
  onClick,
  label,
  title,
  subtitle,
  synopsis,
  href
}) {
  return (
    <div className="gel-layout feature-item">
      <a href={href} className="feature-item__link" onClick={onClick}>
        <div className="feature-item__image gel-layout__item gel-1/3">
          {renderResponsiveImage(recipe)}
        </div>
        <div className="feature-item__metadata gel-layout__item gel-1/2 gel-5/12@l gel-1/3@xl">
          {renderLabel(label)}
          {renderTitle(title)}
          {renderSubtitle(subtitle)}
          {renderSynopsis(synopsis)}
        </div>
      </a>
    </div>
  );
}
