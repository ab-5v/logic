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

        this.logic = logic._list['test'];

        this.log = [];
        this.ctor = function(to) {
            var promise = pzero();
            setTimeout(function() {
                that.log.push('log' + to);
                promise.resolve('res' + to);
            }, to);
            return promise;
        };
        this.provider = function(to) {
            return !!parseInt(to, 10) && that.ctor;
        };

        sinon.spy(this, 'ctor');
        sinon.spy(this, 'provider');

        logic.provider(this.provider);
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
    });

});
