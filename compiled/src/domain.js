(function() {
  var CategoricalDomain, DateDomain, NumericDomain, aesthetics, domainMerge, flattenGeoms, makeDomain, makeDomainSet, mergeDomainSets, mergeDomains, poly, typeOf;

  poly = this.poly || {};

  /*
  # CONSTANTS
  */

  aesthetics = poly["const"].aes;

  /*
  # GLOBALS
  */

  poly.domain = {};

  /*
  Produce a domain set for each layer based on both the information in each
  layer and the specification of the guides, then merge them into one domain
  set.
  */

  poly.domain.make = function(layers, guideSpec, strictmode) {
    var domainSets;
    domainSets = [];
    _.each(layers, function(layerObj) {
      return domainSets.push(makeDomainSet(layerObj, guideSpec, strictmode));
    });
    return mergeDomainSets(domainSets);
  };

  /*
  # CLASSES & HELPER
  */

  /*
  Domain classes
  */

  NumericDomain = (function() {

    function NumericDomain(params) {
      this.type = params.type, this.min = params.min, this.max = params.max, this.bw = params.bw;
    }

    return NumericDomain;

  })();

  DateDomain = (function() {

    function DateDomain(params) {
      this.type = params.type, this.min = params.min, this.max = params.max, this.bw = params.bw;
    }

    return DateDomain;

  })();

  CategoricalDomain = (function() {

    function CategoricalDomain(params) {
      this.type = params.type, this.levels = params.levels, this.sorted = params.sorted;
    }

    return CategoricalDomain;

  })();

  /*
  Public-ish interface for making different domain types
  */

  makeDomain = function(params) {
    switch (params.type) {
      case 'num':
        return new NumericDomain(params);
      case 'date':
        return new DateDomain(params);
      case 'cat':
        return new CategoricalDomain(params);
    }
  };

  /*
  Make a domain set. A domain set is an associate array of domains, with the
  keys being aesthetics
  */

  makeDomainSet = function(layerObj, guideSpec, strictmode) {
    var domain;
    domain = {};
    _.each(_.keys(layerObj.mapping), function(aes) {
      var fromspec, values, _ref, _ref2, _ref3;
      if (strictmode) {
        return domain[aes] = makeDomain(guideSpec[aes]);
      } else {
        values = flattenGeoms(layerObj.geoms, aes);
        fromspec = function(item) {
          if (guideSpec[aes] != null) {
            return guideSpec[aes][item];
          } else {
            return null;
          }
        };
        if (typeOf(values) === 'num') {
          return domain[aes] = makeDomain({
            type: 'num',
            min: (_ref = fromspec('min')) != null ? _ref : _.min(values),
            max: (_ref2 = fromspec('max')) != null ? _ref2 : _.max(values),
            bw: fromspec('bw')
          });
        } else {
          return domain[aes] = makeDomain({
            type: 'cat',
            levels: (_ref3 = fromspec('levels')) != null ? _ref3 : _.uniq(values),
            sorted: fromspec('levels') != null
          });
        }
      }
    });
    return domain;
  };

  /*
  VERY preliminary flatten function. Need to optimize
  */

  flattenGeoms = function(geoms, aes) {
    var values;
    values = [];
    _.each(geoms, function(geom) {
      return _.each(geom.marks, function(mark) {
        return values = values.concat(poly.flatten(mark[aes]));
      });
    });
    return values;
  };

  /*
  VERY preliminary TYPEOF function. We need some serious optimization here
  */

  typeOf = function(values) {
    if (_.all(values, _.isNumber)) return 'num';
    return 'cat';
  };

  /*
  Merge an array of domain sets: i.e. merge all the domains that shares the
  same aesthetics.
  */

  mergeDomainSets = function(domainSets) {
    var merged;
    merged = {};
    _.each(aesthetics, function(aes) {
      var domains;
      domains = _.without(_.pluck(domainSets, aes), void 0);
      if (domains.length > 0) return merged[aes] = mergeDomains(domains);
    });
    return merged;
  };

  /*
  Helper for merging domains of the same type. Two domains of the same type
  can be merged if they share the same properties:
   - For numeric/date variables all domains must have the same binwidth parameter
   - For categorial variables, sorted domains must have any categories in common
  */

  domainMerge = {
    'num': function(domains) {
      var bw, max, min, _ref;
      bw = _.uniq(_.map(domains, function(d) {
        return d.bw;
      }));
      if (bw.length > 1) {
        throw new poly.LengthError("All binwidths are not of the same length");
      }
      bw = (_ref = bw[0]) != null ? _ref : void 0;
      min = _.min(_.map(domains, function(d) {
        return d.min;
      }));
      max = _.max(_.map(domains, function(d) {
        return d.max;
      }));
      return makeDomain({
        type: 'num',
        min: min,
        max: max,
        bw: bw
      });
    },
    'cat': function(domains) {
      var levels, sortedLevels, unsortedLevels;
      sortedLevels = _.chain(domains).filter(function(d) {
        return d.sorted;
      }).map(function(d) {
        return d.levels;
      }).value();
      unsortedLevels = _.chain(domains).filter(function(d) {
        return !d.sorted;
      }).map(function(d) {
        return d.levels;
      }).value();
      if (sortedLevels.length > 0 && _.intersection.apply(this, sortedLevels)) {
        throw new poly.UnknownError();
      }
      sortedLevels = [_.flatten(sortedLevels, true)];
      levels = _.union.apply(this, sortedLevels.concat(unsortedLevels));
      if (sortedLevels[0].length === 0) levels = levels.sort();
      return makeDomain({
        type: 'cat',
        levels: levels,
        sorted: true
      });
    }
  };

  /*
  Merge an array of domains: Two domains can be merged if they are of the
  same type, and they share certain properties.
  */

  mergeDomains = function(domains) {
    var types;
    types = _.uniq(_.map(domains, function(d) {
      return d.type;
    }));
    if (types.length > 1) {
      throw new poly.TypeError("Not all domains are of the same type");
    }
    return domainMerge[types[0]](domains);
  };

  /*
  # EXPORT
  */

  this.poly = poly;

}).call(this);
