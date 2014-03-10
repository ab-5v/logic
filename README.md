logic [![build status](https://secure.travis-ci.org/artjock/logic.png)](http://travis-ci.org/artjock/logic)
=====

Data aggregation framework.

### Usage

    npm install logic
    
then

    var logic = require('logic');
    
### Test

Clone repository, then

    npm install
    npm test
    
### Overview

Logic helps you to define relationships between different data sources and combine it into the one solid responce. It knows nothing about how this data sources work.

There are two types of logics:
- provider based logic, which leads to some data
- abstract logic, which is used to organise other logics (abstract or provider based)


### Abstract logic declaration

```js
logic.define('logic-name', {

  /**
   * `logic-name` depends on this three,
   * where 1 level of array will be ran in series
   * and 2 level of array will be ran in parallel
   *
   * If any of this logics will be failed
   * the root one also will be failed
   */
  deps: ['logic-name-1', ['logic-name-2', 'logic-name-3']],
  
  /**
   * List of params `logic-name` depends on
   */
  params: {
    id: Array,
    name: String
  },
  
  /**
   * `logic-name-1` hook,
   * will be called before its execution
   * @param {Object} evt
   */
  'logic-name-1': function(evt) {
    evt.name;     // 'logic-name-1'
    evt.params;   // params this logic will be requested with,
                  // inherited from the root logic `logic-name`
                  // can be overwritten, then will go with it's own params
    evt.options;  // logic options
    evt.results;  // array of already requested logics
    evt.preventDefault();   // if called logic will be fullfiled
                            // with returned value immediately
    return { status: 'prevented' };
  },
  
  /**
   * Callback to be called when all logic are fullfiled
   * @param {Array} results
   * @param {Object} params
   * @param {Object} options
   */
  ready: function(results, params, options) {
    results; // array of results
             // in the order you declare it in `deps`
    params;  // params root logic was called with
    
    return {
        'logic-name-1': results[0],
        'logic-name-2': results[1],
        'logic-name-3': results[2]
    };
  }

});
```

### Logic provider

Provider must decide if it will process logic with a given name, params and options or not. If so it should return function, or anything else otherwice (undefined or null is better). You can add as many providers, as you want, but only first match will be executed. `logic` knows nothing about how provider works, it can be HTTP request, DB query, memory cache, etc. The only rule: provider function **should return A+ promise**.

```js
logic.provider(function(name, params, options) {
    if (name === 'accepted-logic') {
        return function(name, params, options) {
            return promise( name + JSON.stringify(params) );
        }
    }
});
```

### Logic execution

Now in your API you can use just a single call, and `logic` will take care about all the dependencies.

```js
logic('logic-name', params, options)
    .then(function(result) {});
```
