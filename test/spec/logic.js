/*jshint sub:true */

var pzero = require('pzero');

var sinon = require('sinon');
var expect = require('expect.js');

var logic = require('../../');

describe('logic', function() {


    beforeEach(function() {
        var that = this;

        logic._list = {};
        logic._providers.splice(1);

        logic.define('test', {});

        this.logic = logic._create('test');

        this.log = [];
        this.ctor = function(to) {
            var promise = pzero();
            setTimeout(function() {
                that.log.push('log' + to);
                promise.fulfill('res' + to);
            }, to);
            return promise;
        };
        this.provider = function(to) {
            return !!parseInt(to, 10) && that.ctor;
        };

        this.paramProvider = function(name) {
            if (name.indexOf('param') === 0) {
                return function(name, params) {
                    var promise = pzero();
                    var result = params.res;
                    setTimeout(function() {
                        promise.fulfill(result);
                    }, params.to);
                    return promise;
                };
            }
        };

        sinon.spy(this, 'ctor');
        sinon.spy(this, 'provider');

        logic.provider(this.provider);
        logic.provider(this.paramProvider);
    });

    describe('define', function() {

        it('should save logic to a list', function() {
            expect( logic._list['test'] ).to.be.an(Object);
        });

        it('should create logic with prototype', function() {
            expect( Object.getPrototypeOf(logic._list['test']) ).to.eql(logic.prototype);
        });

        it('should extend logic', function() {
            logic.define('test', {a: 1});

            expect( logic._list['test'].a ).to.eql(1);
        });

        it('should not affect original object', function() {
            logic._list['test']._ensure = 1;

            expect( logic.prototype._ensure ).to.be.a( Function );
        });
    });

    describe('_create', function() {

        it('should call error when no definition found', function() {
            sinon.stub(logic, 'error');
            logic._create('none');

            expect( logic.error.called ).to.be.ok();

            logic.error.restore();
        });

    });

    describe('_provider', function() {

        it('should call error, when no provider found', function() {
            sinon.stub(logic, 'error');
            logic._provider('none');

            expect(logic.error.calledOnce).to.be.ok();

            logic.error.restore();
        });

    });

    describe('_run', function() {

        it('should return promise', function() {
            logic.define('test', {});
            this.logic = logic._list['test'];

            expect(pzero.is( this.logic._run() )).to.be.ok();
        });

    });

    describe('_ensure', function() {

        it('should guarantee array to be passed in _exec', function(done) {
            sinon.spy(this.logic, '_exec');
            var that = this;
            this.logic.deps = [10, [20, 30], 40];
            this.logic._ensure()
                .then(function() {
                    expect( that.logic._exec.getCall(0).args[0]).to.eql([10]);
                    expect( that.logic._exec.getCall(1).args[0]).to.eql([20, 30]);
                    expect( that.logic._exec.getCall(2).args[0]).to.eql([40]);
                    done();
                });

        });

        it('should path arguments to exec', function(done) {
            sinon.spy(this.logic, '_exec');
            var that = this;
            this.logic.deps = [10];
            this.logic._ensure({a: 1}, {b: 2})
                .then(function() {
                    expect( that.logic._exec.getCall(0).args)
                        .to.eql([[10], {a: 1}, {b: 2}]);
                    done();
                });
        });

        var mock_execution_order = {
            'set0': { deps: [], log: [] },
            'set1': { deps: ['10'], log: ['log10'] },
            'set2': { deps: ['20', '10'], log: ['log20', 'log10'] },
            'set3': { deps: ['20', '10', '15'], log: ['log20', 'log10', 'log15'] },
            'set4': { deps: ['40', ['30', '20'], '10'], log: ['log40', 'log20', 'log30', 'log10'] }
        };

        Object.keys(mock_execution_order).forEach(function(key) {

            it('should guarantee right execution order for set ' + key, function(done) {
                var that = this;
                this.logic.deps = mock_execution_order[key].deps;
                this.logic._ensure()
                    .then(function() {
                        expect( that.log ).to.eql( mock_execution_order[key].log );
                        done();
                    });
            });
        });

        var mock_results_order = {
            'set0': { deps: [], res: [] },
            'set1': { deps: ['10'], res: ['res10'] },
            'set2': { deps: ['20', '10'], res: ['res20', 'res10'] },
            'set3': { deps: ['20', '10', '15'], res: ['res20', 'res10', 'res15'] },
            'set4': { deps: ['40', ['30', '20'], '10'], res: ['res40', 'res30', 'res20', 'res10'] }
        };

        Object.keys(mock_results_order).forEach(function(key) {

            it('should guarantee right results order for set ' + key, function(done) {
                var that = this;
                this.logic.deps = mock_results_order[key].deps;
                this.logic._ensure()
                    .then(function(results) {
                        expect( results ).to.eql( mock_results_order[key].res );
                        done();
                    });
            });
        });
    });

    describe('_event', function() {

        it('should create event', function() {
            var evt = this.logic._event('name', [1, 2], {a: 1}, {b: 2});

            expect( evt.name ).to.eql('name');
            expect( evt.params ).to.eql( {a: 1} );
            expect( evt.options ).to.eql( {b: 2} );
            expect( evt.results ).to.eql( [1, 2] );
            expect( evt.preventDefault ).to.be.a( Function );
        });

        it('should set flag on default prevention', function() {
            var evt = this.logic._event();
            evt.preventDefault();

            expect( evt._isPrevented ).to.eql( true );
        });

    });

    describe('_exec', function() {

        it('should call provider getter once on each name', function() {
            this.logic._exec(['10']);

            expect(this.provider.calledOnce).to.be.ok();
        });

        it('should pass arguments to provider', function() {
            this.logic.deps = ['10'];
            this.logic._exec(['10'], {a: 1}, {b: 2});

            expect( this.provider.getCall(0).args )
                .to.eql( ['10', {a: 1}, {b: 2}] );
        });

        it('should call event if logic has handler', function(done) {
            var that = this;
            sinon.spy(this.logic, '_event');
            this.logic['10'] = function() {};
            this.logic._exec(['10'])([])
                .then(function() {
                    expect( that.logic._event.calledOnce ).to.be.ok();
                    done();
                });
        });

        it('should pass argumetns to _event call', function(done) {
            var that = this;
            sinon.spy(this.logic, '_event');
            this.logic['10'] = function() {};
            this.logic._exec(['10'], {a: 1}, {b: 2})([1, 2]).then(function() { done(); });

            expect( that.logic._event.getCall(0).args )
                .to.eql( ['10', [1, 2], {a: 1}, {b: 2}] );

        });

        it('should not call event if logic hasn\'t corresponding handler', function(done) {
            var that = this;
            sinon.spy(this.logic, '_event');
            this.logic['20'] = function() {};
            this.logic._exec(['10'])([])
                .then(function() {
                    expect( that.logic._event.called ).not.to.be.ok();
                    done();
                });
        });

        it('should call event handler', function(done) {
            var that = this;
            this.logic['10'] = sinon.spy();
            this.logic._exec(['10'])([])
                .then(function() {
                    expect( that.logic['10'].calledOnce ).to.be.ok();
                    done();
                });
        });

        it('should pass event to event handler', function(done) {
            var that = this;
            sinon.spy(this.logic, '_event');
            this.logic['10'] = sinon.spy();
            this.logic._exec(['10'], {a: 1}, {b: 2})([1, 2])
                .then(function() {
                    expect( that.logic['10'].getCall(0).args[0] )
                        .to.eql( that.logic._event.returnValues[0] );
                    done();
                });

        });

        it('should prevent provider from event', function(done) {
            var that = this;
            this.logic['10'] = function(evt) { evt.preventDefault(); };
            this.logic._exec(['10'], {a: 1}, {b: 2})([1, 2])
                .then(function() {
                    expect( that.ctor.called ).not.to.be.ok();
                    done();
                });

        });

        it('should fulfill logic with value returned by prevented handler', function(done) {
            this.logic['10'] = function(evt) { evt.preventDefault(); };
            this.logic['20'] = function(evt) { evt.preventDefault(); return 'prev20'; };
            this.logic._exec(['10', '20'])([])
                .then(function(results) {
                    expect( results ).to.eql( [undefined, 'prev20'] );
                    done();
                });
        });

        it('should be able to update params for next logic', function(done) {
            this.logic['param1'] = function(evt) { evt.params.res = 'b'; };
            this.logic._exec(['param0', 'param1', 'param2'], {to: 10, res: 'a'})([])
                .then(function(results) {
                    expect( results ).to.eql( ['a', 'b', 'b'] );
                    done();
                });
        });

        it('should overwrite params for whole group of logics', function(done) {
            this.logic['param1'] = function(evt) { evt.params = {to: 20, res: 'b'}; };
            this.logic._exec(['param1', 'param2'], {to: 10, res: 'a'})([])
                .then(function(results) {
                    expect( results ).to.eql( ['b', 'b'] );
                    done();
                });
        });

    });

});
