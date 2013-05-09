var pzero = require('pzero');

/**
 * Logic constructor and getter
 *
 * @param {String} name
 * @param {Object} params
 * @param {Object} options
 *
 * @returns pzero
 */
function logic(name, params, options) {
    params = params || {};
    options = options || {};

    return logic._create(name)._run(params, options);
}


logic.prototype = {

    /**
     * Dependencies to be loaded,
     * before logic can provide it's data
     *
     * @example
     *  ['l-1', 'l-2', 'l-3']
     *      – will load `l-1`, then `l-2`, then `l-3`
     *  ['l-1', ['l-2', 'l-3'], 'l-4']
     *      – will load 'l-1', then 'l-2' and 'l-3' at once, then 'l-4'
     *
     * @type Array
     */
    deps: [],

    /**
     * Callback to be called,
     * when all dependencies are loaded
     * to finalize data provided by logic.
     *
     * Should be overwritten.
     *
     * @param {Array} results
     * @param {Object} params
     * @param {Object} options
     *
     * @returns Array
     */
    ready: function(results, params, options) {
        return results;
    },

    /**
     * Creates logic instance and calls ready, when all deps are resolved
     *
     * @private
     * @param {Object} params
     * @param {Object} options
     *
     * @returns pzero
     */
    _run: function(params, options) {
        var that = this;
        return this._ensure(params, options)
            .then(function(results) {
                return that.ready(results, params, options);
            });
    },

    /**
     * Creates promises with all logics this one dependent on
     *
     * @private
     *
     * @param {Object} params
     * @param {Object} options
     *
     * @returns pzero
     */
    _ensure: function(params, options) {
        var promises = [];

        var deps = this.deps || [];

        deps.forEach(function(dep) {
            var provider = logic._provider(dep, params, options);
            if (provider) {
                promises.push( provider(dep, params, options) );
            } else {
                logic.error('No provider found for ' + dep);
            }
        });

        return pzero.when( promises );
    },

    /**
     * Should be overwritten
     * @param {Object} data
     *
     * @return Object
     */
    ready: function() {}
};

/**
 * List of logic definitions, that can be created
 *
 * @private
 * @type Object
 */
logic._list = {};

/**
 * List of logic data providers
 * with default one by logic itself
 *
 * @private
 * @type Object
 */
logic._providers = [
    function(name) { return logic._list[name] && logic; }
];

/**
 * Provider getter
 *
 * @static
 * @private
 *
 * @param {String} name
 * @param {Object} params
 * @param {Object} options
 *
 * @return Function
 */
logic._provider = function(name, params, options) {
    var provider;
    var providers = logic._providers;

    for (var i = 0; i < providers.length; i++ ) {
        provider = providers[i](name, params, options);

        if (typeof provider === 'function') {
            return provider;
        }
    }

    return logic.error('No provider found for ' + name);
};

/**
 * Creates logic copy for given name
 *
 * @static
 * @private
 *
 * @param {String} name
 *
 * @returns logic
 */
logic._create = function(name) {
    if (!logic._list[name]) {
        logic.error('Logic ' + name + ' not defined');
    } else {
        return Object.create(logic._list[name]);
    }
};

/**
 * Provider setter
 * External libs can set their own providers for logic.
 * They should pass function, which can ensure,
 * that lib can provide informations for given logic name
 *
 * This function will recive
 *  - name
 *  – params
 *  – options
 * to provide information
 *
 * @static
 * @public
 *
 * @param {Function} checker
 */
logic.provider = function(func) {
    logic._providers.push(func);
};

/**
 * Defines logic, should provide name and dependencies.
 * This logic will be stored and can be created and filled later
 * with logic constructor
 *
 * @static
 * @public
 *
 * @param {String} name
 * @param {Object} extend
 */
logic.define = function define(name, extend) {
    extend = extend || {};

    var properties = {};
    Object.getOwnPropertyNames(extend).forEach(function(name) {
        properties[name] = Object.getOwnPropertyDescriptor(extend, name);
    });

    logic._list[name] = Object.create(logic.prototype, properties);
};

logic.error = function(msg) {
    throw new Error(msg);
};

module.exports = logic;
