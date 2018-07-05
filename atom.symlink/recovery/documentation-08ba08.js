module.exports = component('FeatureItem', () => {

  description('The feature item helps users understanding about a specific programme’s episode. It serves a similar purpose as the content item, but is less tall.');

  property('recipe')
    .description('the recipe for the episode image')
    .type('string')
    .required(true)
    .done();

  property('label')
    .description('genre label')
    .type('string')
    .required(false)
    .done();

  property('title')
    .description('The programme title')
    .type('string')
    .required(true)
    .done();

  property('subtitle')
    .description('The programme subtitle')
    .type('string')
    .required(false)
    .done();

  property('synopsis')
    .description('The programme synopsis')
    .type('string')
    .required(false)
    .done();

  property('onClick')
    .description('Called when component is clicked')
    .type('function')
    .required(false)
    .done();

  property('href')
    .description('href to place in the link tag')
    .type('string')
    .required(false)
    .done();

  example('Recommended for you feature item')
    .description('A feature item')
    .layout(['1/1'])
    .prop('href', '#')
    .prop('recipe', 'https://ichef.bbci.co.uk/images/ic/{recipe}/p05mgs11.jpg')
    .prop('label', 'Crime Drama')
    .prop('title', 'Peaky Blinders')
    .prop('subtitle', 'Series 4: Episode 1')
    .prop('synopsis', 'An epic gangster drama set in the lawless streets if 1920s Birmingham  ')
    .default()
    .done();

  example('Next episode feature item')
    .description('A feature item')
    .layout(['1/1'])
    .prop('recipe', 'https://ichef.bbci.co.uk/images/ic/{recipe}/p0581wgt.jpg')
    .prop('title', 'Series 1: Episode 2')
    .prop('synopsis', 'This extended special journeys to new worlds and reveals new animal behaviours.')
    .done();

    example('Next episode feature item')
      .description('A feature item')
      .layout(['1/1'])
      .prop('recipe', 'https://ichef.bbci.co.uk/images/ic/{recipe}/p0581wgt.jpg')
      .prop('primaryLabel', 'Series 1: Episode 2')
      .prop('secondaryLabel', 'Series 1: Episode 2')
      .prop('title', 'Series 1: Episode 2')
      .prop('synopsis', 'This extended special journeys to new worlds and reveals new animal behaviours.')
      .done();

  example('Next episode feature item with click handler')
    .description('A feature item')
    .layout(['1/1'])
    .prop('recipe', 'https://ichef.bbci.co.uk/images/ic/{recipe}/p065jssh.jpg')
    .prop('title', 'Series 1: Episode 2')
    .prop('synopsis', 'This extended special journeys to new worlds and reveals new animal behaviours.')
    .prop('onClick', () => alert('hello'))
    .done();

});
