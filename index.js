!function(root) {

var pzero = root.pzero || require('pzero');

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
     * Creates logic instance and calls ready, when all deps are fulfilled
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
        var that = this;
        var execs, orig;
        var promise = pzero([]);

        this.deps.forEach(function(dep) {
            // ensure array of names
            if (!Array.isArray(dep)) { dep = [dep]; }
            // crete executera and add to line
            promise = promise.then( that._exec(dep, params, options) );
        });

        return promise;
    },

    /**
     * Creates event object for logic's event handlers
     *
     * @param {String} name
     * @param {Object} params
     * @param {Object} options
     *
     * @returns Object
     */
    _event: function(name, results, params, options) {
        return {
            name: name,
            params: params,
            options: options,
            results: results,
            preventDefault: function() {
                this._isPrevented = true;
            }
        };
    },

    /**
     * Creates executer for each logic
     * and cares about event handling before execution
     *
     * @param {String} name
     * @param {Object} params
     * @param {Object} options
     *
     * @returns Function
     */
    _exec: function(names, params, options) {
        var that = this;
        var provs = names.map(function(name) {
            return logic._provider(name, params, options);
        });

        return function logic_exec(results) {

            var execs = provs.map(function(prov, i) {
                var event, reply, name = names[i];

                if (typeof that[name] === 'function') {
                    event = that._event(name, results, params, options);
                    reply = that[name](event);
                    if (event._isPrevented) {
                        return pzero(reply);
                    } else {
                        params = event.params;
                        options = event.options;
                        results = event.results;
                    }
                }

                return prov(name, params, options);
            });

            return pzero.when(execs).then(function(local) {
                results.push.apply(results, local);
                return results;
            });
        };
    }

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

if (typeof module != 'undefined' && module.exports) {
    module.exports = logic;
} else {
    root.logic = logic;
}

}(this);
