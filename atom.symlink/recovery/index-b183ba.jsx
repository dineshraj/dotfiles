import React from 'react';
import classnames from 'classnames';
import truncation from '@bbc/iplayer-web-truncation';
import buildDataAttributes from '../../../lib/buildDataAttributes';
import sanitiseForScreenreaders from '../../../lib/buildAriaLabel';
import { Progress, Icon, LiveLabel } from '../../../';
import Image from './Image';

const TITLE_LINE_LENGTH = 24;
const SUBTITLE_LINE_LENGTH = 30;

function hasProgress(progressPercent) {
  return progressPercent >= 0;
}

function hideSynopsis(title, subtitle) {
  return title && !subtitle && title.length > (TITLE_LINE_LENGTH * 2);
}

function buildAriaLabel({ title, primaryLabel, secondaryLabel, subtitle, synopsis, durationSubLabel, secondarySubLabel, liveLabel }) {
  const duration = durationSubLabel ? `Duration: ${durationSubLabel}` : '';
  const sanitisedTitleAndLiveLabel = sanitiseForScreenreaders(title, liveLabel);
  const sanitisedDescription = sanitiseForScreenreaders(primaryLabel, secondaryLabel, subtitle, synopsis, duration, secondarySubLabel);

  return `${sanitisedTitleAndLiveLabel} Description: ${sanitisedDescription}`;
}

function buildComponentClassList({ itemsPerRow, shouldHideSynopsis, synopsis, listWhenSmall, showPlayIcon, progressPercent, secondaryCta, background, dimmed, disableOverlay }) {
  const providedBreakpoints = Object.keys(itemsPerRow);
  const filteredBreakpoints = providedBreakpoints.filter((breakpoint) => {
    return breakpoint !== 'xxl';
  });
  const numberOfItemsForLastBreakpoint = itemsPerRow[filteredBreakpoints.pop()];
  const {
    xl = numberOfItemsForLastBreakpoint,
    xxl = numberOfItemsForLastBreakpoint
  } = itemsPerRow;
  const breakpointsWithModifiers = { xl, xxl };
  const alwaysShowPlayIcon = showPlayIcon === 'always';

  const modifiers = Object.keys(breakpointsWithModifiers).map((breakpointKey) => {
    return `content-item--${breakpointsWithModifiers[breakpointKey]}@${breakpointKey}`;
  });

  return classnames('content-item', modifiers, {
    'content-item--always-icon': alwaysShowPlayIcon,
    'content-item--no-synopsis': !synopsis || shouldHideSynopsis,
    'content-item--list-when-small': listWhenSmall,
    'content-item--with-progress': hasProgress(progressPercent),
    'content-item--with-secondary-cta': secondaryCta,
    'content-item--with-background': background,
    'content-item--dimmed': dimmed,
    'content-item--has-overlay': !dimmed && !disableOverlay
  });
}

function buildListLayoutClassList(listWhenSmall) {
  return classnames('gel-layout__item', {
    'gel-1/2 gel-1/1@m': listWhenSmall
  });
}

function renderLabel(label, {
  isPrimary = false,
  showSeparator = false,
  isUppercase = false,
  isBold = true,
  wrap = false,
  liveLabel
} = {}) {
  if (isPrimary && liveLabel) {
    return;
  }

  if (label) {
    const classList = classnames(
      'typo',
      'typo--bullfinch',
      'content-item__label',
      {
        'typo--bold': isBold,
        'content-item__label--primary': isPrimary,
        'content-item__label--uppercase': isUppercase,
        'content-item__label--with-separator': showSeparator,
        'content-item__label--wrap': wrap
      }
    );

    return <span className={classList}>{label}</span>;
  }
}

function renderLabels(primaryLabel, secondaryLabel, { liveLabel }) {
  return (
    <div className="content-item__labels">
      {renderLabel(primaryLabel, { isPrimary: true, wrap: true, showSeparator: !!secondaryLabel, liveLabel })}
      {renderLabel(secondaryLabel, { liveLabel, wrap: true })}
    </div>
  );
}

function renderSubLabels(durationSubLabel, secondarySubLabel, { liveLabel }) {
  if (!liveLabel && (durationSubLabel || secondarySubLabel)) {
    return (
      <div className="content-item__sublabels">
        {renderLabel(durationSubLabel, { showSeparator: !!secondarySubLabel, isUppercase: true })}
        {renderLabel(secondarySubLabel, { isBold: false })}
      </div>
    );
  }
}

function renderSynopsis(synopsis, hideSynopsis) {
  if (synopsis && !hideSynopsis) {
    return (
      <div className="content-item__description typo typo--bullfinch">{synopsis}</div>
    );
  }
}

function renderTitleAndSubtitle(title, subtitle) {
  const truncated = truncation.titleSubtitle(title, subtitle, TITLE_LINE_LENGTH, SUBTITLE_LINE_LENGTH);

  return [
    <div key="title" className="content-item__title typo typo--skylark typo--bold" dangerouslySetInnerHTML={{ __html: truncated.title }} />,
    <div key="subtitle" className="content-item__info__primary">
      <div className="content-item__description typo typo--bullfinch" dangerouslySetInnerHTML={{ __html: truncated.subtitle }} />
    </div>
  ];
}

function renderPlayIcon(showPlayIcon, location) {
  if (showPlayIcon === 'always' || showPlayIcon === 'hover') {
    return (
      <div className={`content-item__icon-wrapper content-item__icon-wrapper--${location}`}>
        <div className="content-item__icon">
          <Icon icon="iplayer" classes="content-item__icon__play" focusable="false" />
        </div>
      </div>
    );
  }
}

function renderLiveLabel(liveLabel, location) {
  if (liveLabel) {
    return (
      <div className={`content-item__live content-item__live--${location}`}>
        <LiveLabel>{liveLabel}</LiveLabel>
      </div>
    );
  }
}

function renderProgress(progressPercent, location) {
  if (hasProgress(progressPercent)) {
    return (
      <div className={`content-item__progress content-item__progress--${location}`}>
        <Progress progress={progressPercent} />
      </div>
    );
  }
}

function renderSecondaryCta(secondaryCta) {
  if (secondaryCta) {
    const classList = classnames('content-item__secondary-cta', secondaryCta.props.classes);

    return React.cloneElement(secondaryCta, { classes: classList });
  }
}

function getTagName(href, component) {
  if (href && !component) {
    return 'a';
  }

  if (component) {
    return component;
  }

  return 'span';
}

export default function ContentItem(
  {
    href,
    title,
    subtitle,
    primaryLabel,
    secondaryLabel,
    durationSubLabel,
    secondarySubLabel,
    synopsis,
    imageTemplate,
    itemsPerRow,
    dataAttributes,
    progressPercent,
    showPlayIcon,
    liveLabel,
    secondaryCta,
    listWhenSmall = false,
    background = false,
    dimmed = false,
    disableOverlay = false,
    onClick,
    setRef,
    component
  }
) {
  const shouldHideSynopsis = hideSynopsis(title, subtitle);
  const componentClassList = buildComponentClassList({
    itemsPerRow,
    shouldHideSynopsis,
    synopsis,
    listWhenSmall,
    showPlayIcon,
    progressPercent,
    secondaryCta,
    background,
    dimmed,
    disableOverlay
  });
  const ariaLabel = buildAriaLabel({ title, primaryLabel, secondaryLabel, subtitle, synopsis, durationSubLabel, secondarySubLabel, liveLabel });
  const listLayoutClassList = buildListLayoutClassList(listWhenSmall);
  const linkDataAttributes = buildDataAttributes(dataAttributes);
  const TagName = getTagName(href);
  const Component = component;

  return (
    <div className={componentClassList} ref={setRef}>
      {
        component ?
        <Component to={href}> :
        <TagName
          href={href}
          className="content-item__link gel-layout gel-layout--flush"
          aria-label={ariaLabel}
          onClick={onClick}
          {...linkDataAttributes}
          >
      }

        <div className={listLayoutClassList}>
          <div className="content-item__image-wrapper">
            <Image imageTemplate={imageTemplate} itemsPerRow={itemsPerRow} />
            {renderLiveLabel(liveLabel, 'over-image')}
            {renderPlayIcon(showPlayIcon, 'over-image')}
            {renderProgress(progressPercent, 'over-image')}
          </div>
        </div>
        <div className={listLayoutClassList}>
          <div className="content-item__inner">
            <div className="content-item__info">
              <div className="content-item__info__above-text">
                {renderPlayIcon(showPlayIcon, 'above-text')}
                {renderProgress(progressPercent, 'above-text')}
              </div>
              <div className="content-item__info__text">
                {renderLabels(primaryLabel, secondaryLabel, { liveLabel })}
                {renderTitleAndSubtitle(title, subtitle)}
                <div className="content-item__info__secondary">
                  {renderSynopsis(synopsis, shouldHideSynopsis)}
                  {renderLiveLabel(liveLabel, 'under-text')}
                  {renderSubLabels(durationSubLabel, secondarySubLabel, { liveLabel })}
                </div>
              </div>
            </div>
          </div>
        </div>
        {component ? </Component> : </TagName>}
      {renderSecondaryCta(secondaryCta)}
    </div>
  );
}
