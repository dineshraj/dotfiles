const assert = require('assert');

const getComponents = require('../../../getComponents');

const sandbox = require('sinon').sandbox.create();

describe('<FeatureItem />', () => {

  const props = {
    title: 'a title',
    recipe: 'https://ichef.bbci.co.uk/images/ic/{recipe}/p0581wgt.jpg',
    href: 'an href'
  };

  beforeEach(() => {
    sandbox.restore();
  });

  it('renders the component as a div', () => {
    const { FeatureItem, mount } = getComponents(['FeatureItem']);
    const { element: featureItem } = mount(<FeatureItem {...props} />);

    assert(featureItem);
    assert.equal(featureItem.tagName, 'DIV');
  });

  it('renders a link inside the main element', () => {
    const { FeatureItem, mount } = getComponents(['FeatureItem']);
    const { element: featureItem } = mount(<FeatureItem {...props} />);

    const linkElement = featureItem.querySelector('.feature-item__link');

    assert(linkElement);
    assert.equal(linkElement.tagName, 'A');
    assert.equal(linkElement.getAttribute('href'), 'an href');
  });

  it('wraps the image inside a div with correct gel classes', () => {
    const { FeatureItem, mount } = getComponents(['FeatureItem']);
    const { element: featureItem } = mount(<FeatureItem {...props} />);
    const imageElement = featureItem.querySelector('.feature-item__image');

    assert(imageElement.classList.contains('gel-layout__item'));
    assert(imageElement.classList.contains('gel-1/3'));
  });

  it('wraps the metadata inside a div with correct gel classes', () => {
    const { FeatureItem, mount } = getComponents(['FeatureItem']);
    const { element: featureItem } = mount(<FeatureItem {...props} />);
    const imageElement = featureItem.querySelector('.feature-item__metadata');

    assert(imageElement.classList.contains('gel-layout__item'));
    assert(imageElement.classList.contains('gel-1/2'));
    assert(imageElement.classList.contains('gel-5/12@l'));
    assert(imageElement.classList.contains('gel-1/3@xl'));
  });

  it('calls onClick when clicked', () => {
    const spy = sandbox.spy();
    const { FeatureItem, mount } = getComponents(['FeatureItem']);
    const { element: featureItem } = mount(<FeatureItem {...props} onClick={spy} />);

    featureItem.querySelector('.feature-item__link').click();
    sandbox.assert.calledOnce(spy);
  });

  it('renders an image inside a placeholder', () => {
    const { FeatureItem, mount } = getComponents(['FeatureItem']);
    const { element: featureItem } = mount(<FeatureItem {...props} recipe="some-recipe" />);
    const placeHolderElement = featureItem.querySelector('.placeholder');
    assert(placeHolderElement.querySelector('.feature-item .rs-image'));
  });

  it('correctly renders the responsive image', () => {
    const { FeatureItem, ResponsiveImage, mount } = getComponents(['FeatureItem', 'ResponsiveImage']);
    const recipe = 'https://ichef.bbci.co.uk/images/ic/{recipe}/p0581wgt.jpg';
    const { element: featureItem } = mount(<FeatureItem {...props} recipe={recipe} />);
    const sources = [{
      srcset: 'https://ichef.bbci.co.uk/images/ic/416x234/p0581wgt.jpg 416w, https://ichef.bbci.co.uk/images/ic/608x342/p0581wgt.jpg 608w',
      sizes: '416px'
    }];
    const { element: expectedImage } = mount(<ResponsiveImage sources={sources} />);

    const renderedImage = featureItem.querySelectorAll('.rs-image');

    assert.equal(renderedImage.length, 1, 'incorrect image length');
    assert.equal(renderedImage[0].outerHTML, expectedImage.outerHTML, 'incorrect image markup');
  });

  it('renders a title', () => {
    const { FeatureItem, mount } = getComponents(['FeatureItem']);
    const { element: featureItem } = mount(<FeatureItem {...props} title="westworld" />);
    assert(featureItem.querySelector('.feature-item__title').textContent, 'westworld');
  });

  it('renders a subtitle', () => {
    const { FeatureItem, mount } = getComponents(['FeatureItem']);
    const { element: featureItem } = mount(<FeatureItem {...props} subtitle="season 2" />);
    assert(featureItem.querySelector('.feature-item__subtitle').textContent, 'season 2');
  });

  it('renders a synopsis', () => {
    const { FeatureItem, mount } = getComponents(['FeatureItem']);
    const { element: featureItem } = mount(<FeatureItem {...props} synopsis="is really good" />);
    assert(featureItem.querySelector('.feature-item__synopsis').textContent, 'is really good');
  });

  it.only('renders a genre label', () => {
    const { FeatureItem, mount } = getComponents(['FeatureItem']);
    const { element: featureItem } = mount(<FeatureItem {...props} label="ultra violence" />);
    console.log(featureItem.outerHTML());
    assert(featureItem.querySelector('.feature-item__labels').length, 1);
    assert(featureItem.querySelector('.feature-item__label').textContent, 'ultra violence');
  });

  it.only('renders a primary label when passed in', () => {
    const { FeatureItem, mount } = getComponents(['FeatureItem']);
    const { element: featureItem } = mount(<FeatureItem {...props} primaryLabel="Yo momma" />);
    assert(featureItem.querySelector('.feature-item__label--primary').textContent, 'Yo momma');
  });

  it.only('does not renders a primary label when not passed in', () => {
    const { FeatureItem, mount } = getComponents(['FeatureItem']);
    const { element: featureItem } = mount(<FeatureItem {...props} />);
    assert(featureItem.querySelector('.feature-item__label--primary').length, 0);
  });

  it('renders a link Icon inside the Responsive Image', () => {
    const { FeatureItem, mount } = getComponents(['FeatureItem']);
    const { element: featureItem } = mount(<FeatureItem {...props} recipe="{recipe}" />);

    const placeHolderElement = featureItem.querySelector('.placeholder');
    const playLinkIcon = placeHolderElement.querySelector('use[href="#gel-icon-iplayer"]');

    assert(playLinkIcon);
  });
});
