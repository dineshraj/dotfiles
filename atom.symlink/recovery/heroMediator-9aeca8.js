'use strict';

define([
  'jquery',
  'lodash',
  'bump-3',
  'reduxStore',
  'jRespond',
  'web-app/config',
  'heroMediator',
  'components/heroPlayer/modules/onwardJourney',
  'components/heroPlayer/modules/guidance/banner',
  'components/heroPlayer/modules/guidance/player',
  'components/heroPlayer/modules/synopsis',
  'components/heroPlayer/modules/msi',
  'components/heroPlayer/modules/config',
  'components/heroPlayer/mediator',
  'components/heroPlayer/modules/playCta',
  'components/heroPlayer/modules/outsideUKBanner',
  'components/heroPlayer/modules/carousel',
  'components/heroPlayer/modules/programmeEpisodes',
  'components/heroPlayer/modules/stats/accessibleLinks',
  'components/heroPlayer/modules/stats/relatedLinks',
  'components/heroPlayer/modules/stats/uas',
  'components/heroPlayer/modules/stats/performance',
  'components/heroPlayer/modules/breakpoints',
  'components/heroPlayer/modules/continuousPlay',
  'components/player/modules/istats',
  'components/rrcPopup/mediator',
  'components/addedButton/mediator',
  'components/downloadButton/mediator',
  'actions/user',
  'actions/api',
  'actions/rrc',
  'actions/nextEpisode',
  'actions/episode',
  'actions/download',
  'actions/page',
  'actions/player',
  'utils/walledGarden',
  'utils/url',
  'utils/page',
  'utils/episode',
  'utils/istats',
  'utils/id',
  'utils/mvt'
], function (
  $,
  _,
  Bump,
  reduxStore,
  jRespond,
  config,
  heroMediator,
  onwardJourney,
  guidanceBanner,
  guidancePlayer,
  synopsis,
  msi,
  heroConfig,
  heroPlayer,
  playCta,
  outsideUKBanner,
  carousel,
  programmeEpisodes,
  accessibleLinksStats,
  relatedLinksStats,
  uasStats,
  performance,
  breakpoints,
  continuousPlay,
  istats,
  rrcPopup,
  addedButton,
  downloadButton,
  userActions,
  apiActions,
  rrcActions,
  nextEpisodeActions,
  episodeActions,
  downloadActions,
  pageActions,
  playerActions,
  walledGardenUtil,
  urlUtils,
  pageUtils,
  episodeUtils,
  istatsUtil,
  idUtil,
  mvtUtil
) {

  function waitForOptimizelyEvent(optimizelyClient, event) {
    return new Promise(function (resolve, reject) {
      var count = 0;
      var interval = setInterval(function () {
        var calls = optimizelyClient.track.calls.all();

        _.forEach(calls, function (call) {
          var calledEvent = call.args[0];

          if (calledEvent === event) {
            clearInterval(interval);
            return resolve(call.args);
          }
        });
        count++;
        if (count > 10) {
          clearInterval(interval);
          return reject();
        }
      }, 10);
    });
  }

  describe('Hero Mediator', function () {
    var optimizelyClientStub;
    var fakePlayer = Bump();
    var container = document.createElement('div');
    var defaultConfig = {
      nextEpisode: {
        id: 'next-episode'
      },
      episode: {
        id: '123456',
        versions: [{
          id: 'vid123456'
        }]
      },
      prerolls: [{
        id: 'test'
      }],
      page: {
        walledGarden: false
      },
      stats: {
        counterName: 'episode.an-episode-title',
        labels: {
          stats_label: 'a-stats-label'
        }
      }
    };

    function bindHeroMediator(config) {
      return heroMediator.bind(_.merge({}, defaultConfig, config), container);
    }

    beforeEach(function () {
      optimizelyClientStub = {
        track: jasmine.createSpy('track'),
        isValidEventKey: jasmine.createSpy().and.returnValue(true)
      };
      spyOn(heroPlayer, 'bind').and.returnValue($.Deferred().resolve(fakePlayer));
      spyOn(urlUtils, 'getWindowLocation').and.returnValue({
        pathname: '/iplayer/epsisode/vid123456/a-page-slug'
      });
      spyOn(mvtUtil, 'getClient').and.returnValue(Promise.resolve(optimizelyClientStub));
      spyOn(mvtUtil, 'getVariant').and.returnValue(Promise.resolve(undefined));
      spyOn(istats, 'bind');
      spyOn(istatsUtil, 'labelsSentWith').and.returnValue(Promise.resolve());
      reduxStore.reset();
      reduxStore.dispatch(pageActions.setBreakpoint(5));
      reduxStore.dispatch(playerActions.setPlayerName('smphtml5'));
      window.bbccookies = {
        get: jasmine.createSpy().and.returnValue('yo'),
        readPolicy: jasmine.createSpy().and.returnValue({ personalisation: true })
      };
    });

    afterEach(function () {
      config.reset();
      delete window.bbccookies;
    });

    it('sets the counter name and common labels on bind', function (done) {
      spyOn(reduxStore, 'dispatch').and.returnValue($.Deferred().resolve());
      spyOn(istatsUtil, 'setCountername');
      spyOn(istatsUtil, 'setCommonLabels');

      bindHeroMediator().then(function () {
        expect(istatsUtil.setCountername).toHaveBeenCalledWith('episode.an-episode-title');
        expect(istatsUtil.setCommonLabels).toHaveBeenCalledWith(defaultConfig.stats.labels);
        done();
      });
    });

    it('checks the user location on bind', function (done) {
      spyOn(reduxStore, 'dispatch').and.returnValue($.Deferred().resolve());
      spyOn(userActions, 'checkLocationAllowed').and.returnValue('checkLocationAllowedReturnedValue');

      bindHeroMediator().then(function () {
        expect(userActions.checkLocationAllowed).toHaveBeenCalled();
        expect(reduxStore.dispatch).toHaveBeenCalledWith('checkLocationAllowedReturnedValue');
        done();
      });
    });

    it('sets the prerolls on bind', function (done) {
      spyOn(reduxStore, 'dispatch').and.returnValue($.Deferred().resolve());
      spyOn(apiActions, 'setPrerolls').and.returnValue('prerollReturnData');

      bindHeroMediator().then(function () {
        expect(apiActions.setPrerolls).toHaveBeenCalledWith(defaultConfig.prerolls);
        expect(reduxStore.dispatch).toHaveBeenCalledWith('prerollReturnData');
        done();
      });
    });

    it('sets the next episode on bind', function (done) {
      spyOn(reduxStore, 'dispatch').and.returnValue($.Deferred().resolve());
      spyOn(nextEpisodeActions, 'setNextEpisode').and.returnValue('nextEpisodeReturnData');

      bindHeroMediator().then(function () {
        expect(nextEpisodeActions.setNextEpisode).toHaveBeenCalledWith(defaultConfig.nextEpisode);
        expect(reduxStore.dispatch).toHaveBeenCalledWith('nextEpisodeReturnData');
        done();
      });
    });

    it('sets the episode on bind', function (done) {
      spyOn(reduxStore, 'dispatch').and.returnValue($.Deferred().resolve());
      spyOn(apiActions, 'setEpisode').and.returnValue('episodeReturnData');

      bindHeroMediator().then(function () {
        expect(apiActions.setEpisode).toHaveBeenCalledWith(defaultConfig.episode);
        expect(reduxStore.dispatch).toHaveBeenCalledWith('episodeReturnData');
        done();
      });

    });

    it('sets the walledGarden state on bind', function (done) {
      spyOn(walledGardenUtil, 'isWalledGarden').and.returnValue('this is value');
      spyOn(reduxStore, 'dispatch').and.returnValue($.Deferred().resolve());
      spyOn(userActions, 'setIsInWalledGarden').and.callThrough();

      bindHeroMediator().then(function () {
        expect(userActions.setIsInWalledGarden).toHaveBeenCalledWith('this is value');
        expect(reduxStore.dispatch).toHaveBeenCalledWith(jasmine.objectContaining({
          payload: 'this is value'
        }));
        done();
      });

    });

    describe('check relevant components are bound', function () {
      beforeEach(function () {
        spyOn(reduxStore, 'dispatch').and.returnValue($.Deferred().resolve());
      });

      it('initialises accessibility link stats on bind', function (done) {
        spyOn(accessibleLinksStats, 'bind');
        bindHeroMediator().then(function () {
          expect(accessibleLinksStats.bind).toHaveBeenCalledWith(container);
          done();
        });
      });

      it('initialises the uas stats module on bind', function (done) {
        spyOn(uasStats, 'bind');
        bindHeroMediator().then(function () {
          expect(uasStats.bind).toHaveBeenCalled();
          done();
        });
      });

      it('initialises related link stats on bind', function (done) {
        spyOn(relatedLinksStats, 'bind');
        bindHeroMediator().then(function () {
          expect(relatedLinksStats.bind).toHaveBeenCalledWith(container);
          done();
        });
      });

      it('initialises breakpoints on bind', function (done) {
        spyOn(breakpoints, 'bind');
        bindHeroMediator().then(function () {
          expect(breakpoints.bind).toHaveBeenCalledWith(fakePlayer);
          done();
        });

      });

      it('initialises continuousPlay on bind', function (done) {
        spyOn(continuousPlay, 'bind');
        bindHeroMediator().then(function () {
          expect(continuousPlay.bind).toHaveBeenCalledWith(fakePlayer);
          done();
        });
      });

      it('initialises istats on bind', function (done) {
        bindHeroMediator().then(function () {
          expect(istats.bind).toHaveBeenCalled();
          done();
        });
      });

      it('initialises onwardJourney on bind', function (done) {
        spyOn(onwardJourney, 'bind').and.returnValue();
        bindHeroMediator().then(function () {
          expect(onwardJourney.bind).toHaveBeenCalledWith(container);
          done();
        });
      });

      it('initialises heroPlayer on bind', function (done) {
        bindHeroMediator().then(function () {
          expect(heroPlayer.bind).toHaveBeenCalledWith(container);
          done();
        });

      });

      it('initialises msi on bind', function (done) {
        spyOn(msi, 'bind');
        bindHeroMediator().then(function () {
          expect(msi.bind).toHaveBeenCalledWith(container);
          done();
        });
      });

      it('initialises playCta on bind', function (done) {
        mvtUtil.getVariant.and.returnValue(Promise.resolve('chris-sidebottom-4eva'));
        spyOn(playCta, 'bind');
        bindHeroMediator().then(function () {
          expect(playCta.bind).toHaveBeenCalledWith(container, 'chris-sidebottom-4eva');
          done();
        });
      });

      it('initialises outsideUkBanner on bind', function (done) {
        spyOn(outsideUKBanner, 'bind');
        bindHeroMediator().then(function () {
          expect(outsideUKBanner.bind).toHaveBeenCalledWith(container);
          done();
        });
      });

      it('initialises guidanceBanner on bind with the container', function (done) {
        spyOn(guidanceBanner, 'bind');
        bindHeroMediator().then(function () {
          expect(guidanceBanner.bind).toHaveBeenCalledWith(container);
          done();
        });
      });

      it('initialises the jRespond function to update state when the breakpoint changes', function (done) {
        spyOn(jRespond, 'addFunc');
        bindHeroMediator().then(function () {
          expect(jRespond.addFunc).toHaveBeenCalledWith({
            breakpoint: [1, 2, 3, 4, 5],
            enter: jasmine.any(Function)
          });
          done();
        });
      });

      it('initialises rrcPopup on bind', function (done) {
        spyOn(rrcPopup, 'bind');
        bindHeroMediator().then(function () {
          expect(rrcPopup.bind).toHaveBeenCalledWith(container);
          done();
        });
      });

      it('dispatches downloadURIs on bind', function (done) {
        var downloadURIs = {
          foo: 'bar',
          bar: 'foo'
        };
        spyOn(downloadActions, 'setUris');
        bindHeroMediator({
          downloadURIs: downloadURIs
        }).then(function () {
          expect(downloadActions.setUris).toHaveBeenCalledWith(downloadURIs);
          done();
        });
      });

      it('dispatches a version id for accessible versions', function (done) {
        var config = {
          episode: {
            versions: [{
              id: 'vid123456'
            }, {
              id: 'vid654321',
              kind: 'audio-described',
              rrc: {
                description: {
                  large: 'A large RRC description',
                  small: 'A small RRC description'
                },
                url: '/an/rrc/url'
              }
            }]
          }
        };
        spyOn(episodeUtils, 'getAccessibleVersion').and.returnValue('ad');
        spyOn(episodeActions, 'setCurrentVersionId');

        bindHeroMediator(config).then(function () {
          expect(episodeActions.setCurrentVersionId).toHaveBeenCalledWith('vid654321');
          done();
        });
      });

      it('initialises the heroSynopsis on bind', function (done) {
        spyOn(synopsis, 'bind');
        bindHeroMediator().then(function () {
          expect(synopsis.bind).toHaveBeenCalledWith(container);
          done();
        });
      });

      describe('added button', function () {

        beforeEach(function () {
          spyOn(addedButton, 'bind');
          spyOn(idUtil, 'isIDAvailable').and.returnValue(true);
          spyOn(idUtil, 'isIDCtaAvailable').and.returnValue(true);
        });

        it('initialises the addedButton on bind', function (done) {
          bindHeroMediator().then(function () {
            expect(addedButton.bind).toHaveBeenCalledWith(container);
            done();
          });
        });

        it('does not initialise the addedButton if in a walled garden', function (done) {
          var config = {
            page: {
              walledGarden: true
            }
          };
          bindHeroMediator(config).then(function () {
            expect(addedButton.bind).not.toHaveBeenCalled();
            done();
          });
        });

        it('does not initialise the addedButton if iD is not available', function (done) {
          idUtil.isIDAvailable.and.returnValue(false);
          bindHeroMediator().then(function () {
            expect(addedButton.bind).not.toHaveBeenCalled();
            done();
          });
        });

        it('does not initialise the addedButton if iD CTA is not available', function (done) {
          idUtil.isIDCtaAvailable.and.returnValue(false);
          bindHeroMediator().then(function () {
            expect(addedButton.bind).not.toHaveBeenCalled();
            done();
          });
        });

        it('does not initialise the addedButton if "enablePersonalisation" config is not set to "true"', function (done) {
          config.set('enablePersonalisation', 'not-true');
          bindHeroMediator().then(function () {
            expect(addedButton.bind).not.toHaveBeenCalled();
            done();
          });
        });

      });

      it('binds the download button with the container and our player wrapper', function (done) {
        spyOn(guidancePlayer, 'create').and.returnValue('I_AM_A_PLAYER');
        spyOn(downloadButton, 'bind');
        bindHeroMediator().then(function () {
          expect(guidancePlayer.create).toHaveBeenCalledWith(fakePlayer, 'download');
          expect(downloadButton.bind).toHaveBeenCalledWith(container, 'I_AM_A_PLAYER');
          done();
        });

      });

      it('initialises the performance stats on bind', function (done) {
        spyOn(performance, 'bind');
        bindHeroMediator().then(function () {
          expect(performance.bind).toHaveBeenCalledWith(container);
          done();
        });
      });
    });

    describe('Pulse CTA experiment', function () {

      beforeEach(function () {
        spyOn(reduxStore, 'dispatch').and.returnValue($.Deferred().resolve());
      });

      it('buckets the user into the iplrw_pb10_play_cta_pulse experiment', function (done) {
        spyOn(mvtUtil, 'getAttributes').and.returnValue({
          player_type: 'smphtml5',
          breakpoint: '5'
        });
        mvtUtil.getVariant.and.returnValue(Promise.resolve('test'));
        bindHeroMediator().then(function () {
          expect(mvtUtil.getVariant).toHaveBeenCalledWith('iplrw_pb10_play_cta_pulse', {
            player_type: 'smphtml5',
            breakpoint: '5'
          });
          done();
        });
      });

      it('passes the variant to the playCta mediator', function (done) {
        spyOn(playCta, 'bind');
        mvtUtil.getVariant.and.returnValue(Promise.resolve('matt-burrows-4eva'));
        bindHeroMediator().then(function () {
          expect(playCta.bind).toHaveBeenCalledWith(container, 'matt-burrows-4eva');
          done();
        });
      });
    });

    describe('Feature item layout experiment', function () {
      beforeEach(function () {
        spyOn(reduxStore, 'dispatch').and.returnValue($.Deferred().resolve());
      });

      it('buckets the user into the iplrw_pb12_paws experiment', function (done) {
        // spyOn(mvtUtil, 'getAttributes').and.returnValue({
        //   player_type: 'smphtml5',
        //   breakpoint: '5'
        // });
        // mvtUtil.getVariant.and.returnValue(Promise.resolve('test'));
        // bindHeroMediator().then(function () {
        //   expect(mvtUtil.getVariant).toHaveBeenCalledWith('iplrw_pb12_paws', {
        //     player_type: 'smphtml5',
        //     breakpoint: '5'
        //   });
        //   done();
        // });
      });
    });

    describe('OJ on pause experiment', function () {

      beforeEach(function () {
        spyOn(reduxStore, 'dispatch').and.returnValue($.Deferred().resolve());
      });

      it('buckets the user into the iplrw_pb12_paws experiment', function (done) {
        spyOn(mvtUtil, 'getAttributes').and.returnValue({
          player_type: 'smphtml5',
          breakpoint: '5'
        });
        mvtUtil.getVariant.and.returnValue(Promise.resolve('test'));
        bindHeroMediator().then(function () {
          expect(mvtUtil.getVariant).toHaveBeenCalledWith('iplrw_pb12_paws', {
            player_type: 'smphtml5',
            breakpoint: '5'
          });
          done();
        });
      });

      it('puts the variant inside the store', function (done) {
        spyOn(mvtUtil, 'getAttributes').and.returnValue({
          player_type: 'smphtml5',
          breakpoint: '5'
        });
        mvtUtil.getVariant.and.returnValue(Promise.resolve('some-variant'));
        bindHeroMediator().then(function () {
          expect(reduxStore.dispatch).toHaveBeenCalledWith({
            type: 'EXPERIMENTS_SET_EXPERIMENT',
            payload: {
              name: 'iplrw_pb12_paws',
              variant: 'some-variant'
            }
          });
          done();
        });
      });

    });

    describe('Countdown duration experiment', function () {

      beforeEach(function () {
        spyOn(reduxStore, 'dispatch').and.returnValue($.Deferred().resolve());
      });

      it('buckets the user into the "iplrw_pb13_countdown" experiment', function (done) {
        spyOn(mvtUtil, 'getAttributes').and.returnValue({
          player_type: 'smphtml5',
          breakpoint: '5'
        });
        mvtUtil.getVariant.and.returnValue(Promise.resolve('test'));
        bindHeroMediator().then(function () {
          expect(mvtUtil.getVariant).toHaveBeenCalledWith('iplrw_pb13_countdown', {
            player_type: 'smphtml5',
            breakpoint: '5'
          });
          done();
        });
      });

      it('puts the "iplrw_pb13_countdown" experiment variant inside the store', function (done) {
        spyOn(mvtUtil, 'getAttributes').and.returnValue({
          player_type: 'smphtml5',
          breakpoint: '5'
        });
        mvtUtil.getVariant.and.returnValue(Promise.resolve('some-variant'));
        bindHeroMediator().then(function () {
          expect(reduxStore.dispatch).toHaveBeenCalledWith({
            type: 'EXPERIMENTS_SET_EXPERIMENT',
            payload: {
              name: 'iplrw_pb13_countdown',
              variant: 'some-variant'
            }
          });
          done();
        });
      });

    });

    describe('optimizely stats', function () {

      it('sends episode-view event with attributes', function (done) {
        spyOn(reduxStore, 'dispatch').and.returnValue($.Deferred().resolve());
        istatsUtil.labelsSentWith.and.returnValue(Promise.resolve([
          {
            prev_page_type: 'some_page',
            do_not: 'include_me'
          }
        ]));

        bindHeroMediator().then(function () {
          waitForOptimizelyEvent(optimizelyClientStub, 'episode-view')
            .then(function () {
              expect(optimizelyClientStub.track).toHaveBeenCalledWith('episode-view', {
                player_type: 'smphtml5',
                breakpoint: '5',
                region: 'yo',
                prev_page_type: 'some_page'
              });
              done();
            });
        });
      });

      it('sends null prev_page_type attribute on episode-view event when no previous labels sent', function (done) {
        spyOn(reduxStore, 'dispatch').and.returnValue($.Deferred().resolve());
        istatsUtil.labelsSentWith.and.returnValue(Promise.resolve([]));

        bindHeroMediator().then(function () {
          waitForOptimizelyEvent(optimizelyClientStub, 'episode-view')
            .then(function () {
              expect(optimizelyClientStub.track).toHaveBeenCalledWith('episode-view', jasmine.objectContaining({
                prev_page_type: null
              }));
              done();
            });
        });
      });

      it('sends episode-click-{pid} event with attributes when the event key is valid', function (done) {
        spyOn(reduxStore, 'dispatch').and.returnValue($.Deferred().resolve());
        istatsUtil.labelsSentWith.and.returnValue(Promise.resolve([
          {
            prev_page_type: 'some_page',
            do_not: 'include_me'
          }
        ]));

        bindHeroMediator().then(function () {
          waitForOptimizelyEvent(optimizelyClientStub, 'episode-click-123456')
            .then(function () {
              expect(optimizelyClientStub.track).toHaveBeenCalledWith('episode-click-123456', {
                player_type: 'smphtml5',
                breakpoint: '5',
                region: 'yo',
                prev_page_type: 'some_page'
              });
              done();
            });
        });
      });

      it('sends null prev_page_type attribute on episode-click-{pid} event when no previous labels sent', function (done) {
        spyOn(reduxStore, 'dispatch').and.returnValue($.Deferred().resolve());
        istatsUtil.labelsSentWith.and.returnValue(Promise.resolve([]));

        bindHeroMediator().then(function () {
          waitForOptimizelyEvent(optimizelyClientStub, 'episode-click-123456')
            .then(function () {
              expect(optimizelyClientStub.track).toHaveBeenCalledWith('episode-click-123456', jasmine.objectContaining({
                prev_page_type: null
              }));
              done();
            });
        });
      });

      it('does not send episode-click-{pid} event when event key is invalid', function (done) {
        spyOn(reduxStore, 'dispatch').and.returnValue($.Deferred().resolve());
        optimizelyClientStub.isValidEventKey.and.returnValue(false);

        bindHeroMediator().then(function () {
          waitForOptimizelyEvent(optimizelyClientStub, 'episode-click-123456')
            .catch(function () {
              expect(optimizelyClientStub.track).not.toHaveBeenCalledWith('episode-click-123456');
              done();
            });
        });
      });

    });

  });

});
