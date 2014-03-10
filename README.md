logic [![build status](https://secure.travis-ci.org/artjock/logic.png)](http://travis-ci.org/artjock/logic)
=====

Data aggregation framework.

## Usage

    npm install logic
    
then

    var logic = require('logic');
    
    
### Logic declaration

```js
logic.define('logic-name', {

  /**
   * `logic-name` depends on this three,
   * where 1 level of array will be ran in series
   * and 2 level of array will be ran in parallel
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
   */
  ready: function(results, params) {
    results; // array of results
             // in the order you declare it in `deps`
    params;  // params root logic was called with
  }

});
```

### Logic provider

Registers a callback to fullfil specified logic

```js
logic.provider(function(name) {
    return function(name, params) {
        return name + JSON.stringify(params);
    }
});
```
