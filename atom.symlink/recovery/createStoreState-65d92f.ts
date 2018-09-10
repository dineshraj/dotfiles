import _ from 'lodash';
import baseStore from './fixtures/baseStore';

function customizer(objValue, srcValue) {
  if (Array.isArray(srcValue)) {
    return srcValue;
  }
  if (srcValue instanceof Object && Object.keys(srcValue).length === 0) {
    return srcValue;
  }
}

export default function createStoreState(overrides) {
  return _.mergeWith({}, baseStore, overrides, customizer);
}
