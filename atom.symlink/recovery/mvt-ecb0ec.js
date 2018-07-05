'use strict';

define([
  'reduxStore',
  'utils/mvt',
  'utils/id',
  'utils/istats'
], function (
  reduxStore,
  mvt,
  id,
  istats
) {
  describe('mvt utils', function () {

    beforeEach(function () {
      spyOn(istats, 'labelsSentWith').and.returnValue(Promise.resolve([]));
    });

    describe('Cross platform optimisely client', function () {

      it('calls the activate method on the optimizely client with the passed in experimentKey and custom attributes', function (done) {
        var activateSpy = jasmine.createSpy();
        spyOn(mvt, 'getClient').and.returnValue(Promise.resolve({ activate: activateSpy }));

        mvt.getVariant('donkeys', { food: 'vegetarian' }).then(function () {
          expect(activateSpy).toHaveBeenCalledWith('donkeys', { food: 'vegetarian' });
          done();
        });
      });

    });

    it('calls the activate method on the optimizely client with the passed in experimentKey and custom attributes', function (done) {
      var activateSpy = jasmine.createSpy();
      spyOn(mvt, 'getCrossPlatformClient').and.returnValue(Promise.resolve({ activate: activateSpy }));

      mvt.getVariant('donkeys', { food: 'vegetarian' }).then(function () {
        expect(activateSpy).toHaveBeenCalledWith('some-scope', { food: 'vegetarian' });
        done();
      });
    });

    it('calls the track method on the optimizely client with the passed in trackingKey and custom attributes', function (done) {
      var trackingSpy = jasmine.createSpy();
      spyOn(mvt, 'getClient').and.returnValue(Promise.resolve({ track: trackingSpy }));

      mvt.track('donkeys', { food: 'vegetarian' }).then(function () {
        expect(trackingSpy).toHaveBeenCalledWith('donkeys', { food: 'vegetarian' });
        done();
      });
    });

    describe('.isValidEventKey', function () {

      it('calls isValidEventKey on the optimizely client', function (done) {
        var isValidEventKey = jasmine.createSpy();
        spyOn(mvt, 'getClient').and.returnValue(Promise.resolve({ isValidEventKey: isValidEventKey }));

        mvt.isValidEventKey('donkeys').then(function () {
          expect(isValidEventKey).toHaveBeenCalledWith('donkeys');
          done();
        });
      });

    });

    describe('.getAttributes()', function () {

      beforeEach(function () {
        spyOn(reduxStore, 'getState').and.returnValue({
          player: { name: 'smphtml5' },
          page: { breakpoint: 4 },
          user: { personalisationEnabled: true }
        });
        window.bbccookies = {
          readPolicy: jasmine.createSpy().and.returnValue({ personalisation: true }),
          get: jasmine.createSpy().and.returnValue('boooo')
        };
      });

      afterEach(function () {
        delete window.bbccookies;
      });

      it('returns a breakpoint key', function () {
        expect(mvt.getAttributes()).toEqual(jasmine.objectContaining({
          breakpoint: '4'
        }));
      });

      it('returns a player_type key', function () {
        expect(mvt.getAttributes()).toEqual(jasmine.objectContaining({
          player_type: 'smphtml5'
        }));
      });

      it('returns a region key', function () {
        expect(mvt.getAttributes()).toEqual(jasmine.objectContaining({
          region: 'boooo'
        }));
        expect(window.bbccookies.get).toHaveBeenCalledWith('ckps_tviplayer_region');
      });

      it('returns a personalisation key', function () {
        spyOn(id, 'signedIn').and.returnValue(true);

        expect(mvt.getAttributes()).toEqual(jasmine.objectContaining({
          personalisation: 'on'
        }));
      });

      it('does not return a personalisation key if the user is not signed in', function () {
        spyOn(id, 'signedIn').and.returnValue(false);

        expect(mvt.getAttributes().hasOwnProperty('personalisation')).toEqual(false);
      });
    });

    describe('.getAttributesWithPrevPage()', function () {

      beforeEach(function () {
        spyOn(reduxStore, 'getState').and.returnValue({
          player: { name: 'smphtml5' },
          page: { breakpoint: 4 },
          user: { personalisationEnabled: true }
        });
        window.bbccookies = {
          readPolicy: jasmine.createSpy().and.returnValue({ personalisation: true }),
          get: jasmine.createSpy().and.returnValue('boooo')
        };
      });

      afterEach(function () {
        delete window.bbccookies;
      });

      it('contains the correct keys', function (done) {
        spyOn(id, 'signedIn').and.returnValue(true);

        mvt.getAttributesWithPrevPage()
          .then(function (attributes) {
            expect(Object.keys(attributes)).toEqual(['player_type', 'breakpoint', 'region', 'personalisation', 'prev_page_type']);
            done();
          });
      });

      it('returns a prev_page_type key when stat was previously fired', function (done) {
        istats.labelsSentWith.and.returnValue(Promise.resolve([
          {
            prev_page_type: 'some_page'
          }
        ]));

        mvt.getAttributesWithPrevPage()
          .then(function (attributes) {
            expect(attributes).toEqual(jasmine.objectContaining({
              prev_page_type: 'some_page'
            }));
            done();
          });
      });

      it('returns a prev_page_type of null when stat was not previously fire', function (done) {
        istats.labelsSentWith.and.returnValue(Promise.resolve([]));

        mvt.getAttributesWithPrevPage()
          .then(function (attributes) {
            expect(attributes).toEqual(jasmine.objectContaining({
              prev_page_type: null
            }));
            done();
          });
      });

    });

  });
});
