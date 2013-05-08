/*jshint sub:true */

var pzero = require('pzero');

var sinon = require('sinon');
var expect = require('expect.js');

var logic = require('../../');

describe('logic', function() {


    beforeEach(function() {
        logic._list = {};
    });

    describe('define', function() {

        it('should save logic to a list', function() {
            logic.define('test');

            expect( logic._list['test'] ).to.be.an(Object);
        });

        it('should create logic with prototype', function() {
            logic.define('test');

            expect( Object.getPrototypeOf(logic._list['test']) ).to.eql(logic.prototype);
        });

        it('should extend logic', function() {
            logic.define('test', {a: 1});

            expect( logic._list['test'].a ).to.eql(1);
        });

        it('should not affect original object', function() {
            logic.define('test');
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

    describe('_run', function() {

        it('should return promise', function() {
            logic.define('test', {});
            this.logic = logic._list['test'];

            expect(pzero.is( this.logic._run() )).to.be.ok();
        });

    });

    describe('_ensure', function() {

        beforeEach(function() {
            logic.define('test', {});

            this.logic = logic._list['test'];

            this.provider = function(to) {
                return function() {
                    var promise = pzero();
                    setTimeout(function() { promise.resolve('res' + to); }, to);
                    return promise;
                };
            };
        });

        it('should call error when no provider found', function() {
            sinon.stub(logic, 'error');
            this.logic.deps = ['123'];
            this.logic._ensure();

            expect(logic.error.called).to.be.ok();

            logic.error.restore();
        });

        it('should return promise on no deps', function(done) {
            this.logic._ensure()
                .then(function(res) {
                    expect( res ).to.eql( [] );
                    done();
                });
        });

        it('should wait for dep', function(done) {
            logic.provider(this.provider);
            this.logic.deps = ['10'];

            this.logic._ensure()
                .then(function(res) {
                    expect( res ).to.eql( ['res10'] );
                    done();
                });
        });

        it('should wait for multiple deps', function(done) {
            logic.provider(this.provider);
            this.logic.deps = ['10', '20'];

            this.logic._ensure()
                .then(function(res) {
                    expect( res ).to.eql( ['res10', 'res20'] );
                    done();
                });
        });
    });

});
