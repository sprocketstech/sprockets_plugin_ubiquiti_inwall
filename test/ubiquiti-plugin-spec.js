var rewire = require('rewire');
var util = require('util');

describe('ubiquiti-plugin', function() {

    beforeEach(function() {
    });

    afterEach(function() {
    });

    it('validate should return error if invalid credentials from device', function(done) {
        var plugin = rewire('../index.js');
        //mock out requestify
        var mock = {
            post: function(url, data, options) {
                var promise = new Promise(function(resolve, reject) {
                    resolve({
                        getCode: function() {
                            return 200;
                        },
                        getBody: function() {
                            return "Bad, Invalid credentials.";
                        }
                    });
                });
                return promise;
            }
        };
        
        plugin.__set__("requestify", mock);
        plugin.validate({}, function(validation) {
            expect(validation.valid).toBe(false);
            expect(validation.errors.length).toBe(1);
            expect(validation.errors[0]).toBe("Invalid credentials.");
            done();
        });
    });


    it('validate should return error if could not contact device', function(done) {
        var plugin = rewire('../index.js');
        //mock out requestify
        var mock = {
            post: function(url, data, options) {
                var promise = new Promise(function(resolve, reject) {
                    reject({
                        code: 500,
                        message: "Could not contact server"
                    });
                });
                return promise;
            }
        };

        plugin.__set__("requestify", mock);
        plugin.validate({}, function(validation) {
            expect(validation.valid).toBe(false);
            expect(validation.errors.length).toBe(1);
            expect(validation.errors[0]).toBe("Could not contact server");
            done();
        });
    });

    it('validate should succeed if error is thrown, but code is 302', function(done) {
        var plugin = rewire('../index.js');
        //mock out requestify
        var mock = {
            post: function(url, data, options) {
                var promise = new Promise(function(resolve, reject) {
                    reject({
                        code: 302,
                        headers: {
                            'set-cookie': 'jjjjj'
                        }
                    });
                });
                return promise;
            }
        };

        plugin.__set__("requestify", mock);
        plugin.validate({}, function(validation) {
            expect(validation.valid).toBe(true);
            expect(validation.errors.length).toBe(0);
            done();
        });
    });

    it('validate should return error if could not contact', function(done) {
        var plugin = rewire('../index.js');
        //mock out requestify
        var mock = {
            post: function(url, data, options) {
                var promise = new Promise(function(resolve, reject) {
                    resolve({
                        getCode: function() {
                            return 500;
                        },
                        getBody: function() {
                            return "Bad, Invalid credentials.";
                        }
                    });
                });
                return promise;
            }
        };

        plugin.__set__("requestify", mock);
        plugin.validate({}, function(validation) {
            expect(validation.valid).toBe(false);
            expect(validation.errors.length).toBe(1);
            expect(validation.errors[0]).toBe("Could not contact server");
            done();
        });
    });


    it('validate should return valid if all is well', function(done) {
        var plugin = rewire('../index.js');
        //mock out requestify
        var mock = {
            post: function(url, data, options) {
                var promise = new Promise(function(resolve, reject) {
                    resolve({
                        getCode: function() {
                            return 200;
                        },
                        getBody: function() {
                            return "All good";
                        },
                        headers: {
                            'set-cookie': 'jjjjj'
                        }
                    });
                });
                return promise;
            }
        };

        plugin.__set__("requestify", mock);
        plugin.validate({}, function(validation) {
            expect(validation.valid).toBe(true);
            expect(validation.errors.length).toBe(0);
            done();
        });
    });

    it('validate should return valid if response is 302', function(done) {
        var plugin = rewire('../index.js');
        //mock out requestify
        var mock = {
            post: function(url, data, options) {
                var promise = new Promise(function(resolve, reject) {
                    resolve({
                        getCode: function() {
                            return 302;
                        },
                        getBody: function() {
                            return "All good";
                        },
                        headers: {
                            'set-cookie': 'jjjjj'
                        }
                    });
                });
                return promise;
            }
        };

        plugin.__set__("requestify", mock);
        plugin.validate({}, function(validation) {
            expect(validation.valid).toBe(true);
            expect(validation.errors.length).toBe(0);
            done();
        });
    });


    it('createInstance should return an instance', function(done) {
        var plugin = rewire('../index.js');
        var instance = plugin.createInstance(123, {}, {
            resolve: function() {
                return {};
            }
        });
        expect(instance).not.toBe(null);
        done();
    });

    it('createInstance should set the id', function(done) {
        var plugin = rewire('../index.js');
        var instance = plugin.createInstance(123, {}, {
            resolve: function() {
                return {};
            }
        });
        expect(instance.id).toBe(123);
        done();
    });

    it('createInstance should set create control for outlet 1', function(done) {
        var plugin = rewire('../index.js');

        var instance = plugin.createInstance(123, {}, {
            resolve: function() {
                return {};
            }
        });
        expect(instance._metadata.controls.OUTLET1_OUTPUT.controlType).toBe('boolean');
        expect(instance._metadata.controls.OUTLET1_OUTPUT.deviceType).toBe('outlet');
        expect(instance._metadata.controls.OUTLET1_OUTPUT.monitor).toBe(true);
        done();
    });

    it('createInstance should set create control for outlet 2', function(done) {
        var plugin = rewire('../index.js');

        var instance = plugin.createInstance(123, {}, {
            resolve: function() {
                return {};
            }
        });
        expect(instance._metadata.controls.OUTLET2_OUTPUT.controlType).toBe('boolean');
        expect(instance._metadata.controls.OUTLET2_OUTPUT.deviceType).toBe('outlet');
        expect(instance._metadata.controls.OUTLET2_OUTPUT.monitor).toBe(true);
        done();
    });

    it('createInstance should set create power sensor for outlet 2', function(done) {
        var plugin = rewire('../index.js');

        var instance = plugin.createInstance(123, {}, {
            resolve: function() {
                return {};
            }
        });
        expect(instance._metadata.sensors.OUTLET2_POWER.controlType).toBe('value');
        expect(instance._metadata.sensors.OUTLET2_POWER.deviceType).toBe('other');
        expect(instance._metadata.sensors.OUTLET2_POWER.units).toBe('power');
        expect(instance._metadata.sensors.OUTLET2_POWER.monitor).toBe(true);
        done();
    });

    it('createInstance should set create power sensor for outlet 1', function(done) {
        var plugin = rewire('../index.js');

        var instance = plugin.createInstance(123, {}, {
            resolve: function() {
                return {};
            }
        });
        expect(instance._metadata.sensors.OUTLET1_POWER.controlType).toBe('value');
        expect(instance._metadata.sensors.OUTLET1_POWER.deviceType).toBe('other');
        expect(instance._metadata.sensors.OUTLET1_POWER.units).toBe('power');
        expect(instance._metadata.sensors.OUTLET1_POWER.monitor).toBe(true);
        done();
    });


    it('createInstance should set create current sensor for outlet 2', function(done) {
        var plugin = rewire('../index.js');

        var instance = plugin.createInstance(123, {}, {
            resolve: function() {
                return {};
            }
        });
        expect(instance._metadata.sensors.OUTLET2_CURRENT.controlType).toBe('value');
        expect(instance._metadata.sensors.OUTLET2_CURRENT.deviceType).toBe('other');
        expect(instance._metadata.sensors.OUTLET2_CURRENT.units).toBe('current');
        expect(instance._metadata.sensors.OUTLET2_CURRENT.monitor).toBe(true);
        done();
    });


    it('createInstance should set create current sensor for outlet 1', function(done) {
        var plugin = rewire('../index.js');

        var instance = plugin.createInstance(123, {}, {
            resolve: function() {
                return {};
            }
        });
        expect(instance._metadata.sensors.OUTLET1_CURRENT.controlType).toBe('value');
        expect(instance._metadata.sensors.OUTLET1_CURRENT.deviceType).toBe('other');
        expect(instance._metadata.sensors.OUTLET1_CURRENT.units).toBe('current');
        expect(instance._metadata.sensors.OUTLET1_CURRENT.monitor).toBe(true);
        done();
    });



    it('createInstance should set create voltage sensor for outlet 2', function(done) {
        var plugin = rewire('../index.js');

        var instance = plugin.createInstance(123, {}, {
            resolve: function() {
                return {};
            }
        });
        expect(instance._metadata.sensors.OUTLET2_VOLTAGE.controlType).toBe('value');
        expect(instance._metadata.sensors.OUTLET2_VOLTAGE.deviceType).toBe('other');
        expect(instance._metadata.sensors.OUTLET2_VOLTAGE.units).toBe('voltage');
        expect(instance._metadata.sensors.OUTLET2_VOLTAGE.monitor).toBe(true);
        done();
    });


    it('createInstance should set create voltage sensor for outlet 1', function(done) {
        var plugin = rewire('../index.js');

        var instance = plugin.createInstance(123, {}, {
            resolve: function() {
                return {};
            }
        });
        expect(instance._metadata.sensors.OUTLET1_VOLTAGE.controlType).toBe('value');
        expect(instance._metadata.sensors.OUTLET1_VOLTAGE.deviceType).toBe('other');
        expect(instance._metadata.sensors.OUTLET1_VOLTAGE.units).toBe('voltage');
        expect(instance._metadata.sensors.OUTLET1_VOLTAGE.monitor).toBe(true);
        done();
    });
});
