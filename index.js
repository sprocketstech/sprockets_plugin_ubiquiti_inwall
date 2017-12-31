"use strict";

var requestify = require('requestify');
var uuid = require('uuid');
var util = require('util');
var SDK = require('sprockets-sdk');

var OUTLET1_VOLTAGE_ID = 'OUTLET1_VOLTAGE';
var OUTLET1_CURRENT_ID = 'OUTLET1_CURRENT';
var OUTLET1_POWER_ID = 'OUTLET1_POWER';
var OUTLET1_OUTPUT_ID = 'OUTLET1_OUTPUT';
var OUTLET2_VOLTAGE_ID = 'OUTLET2_VOLTAGE';
var OUTLET2_CURRENT_ID = 'OUTLET2_CURRENT';
var OUTLET2_POWER_ID = 'OUTLET2_POWER';
var OUTLET2_OUTPUT_ID = 'OUTLET2_OUTPUT';

var OutletInstance = function(id, config, scheduler, loggingService) {
    SDK.Devices.DeviceInstance.call(this, id);
    this.scheduler = scheduler;
    this.config = config;
    this.job = null;
    this.loggingService = loggingService;
    //add the metadata
    this.addSensor(new SDK.Devices.DeviceValueComponent(OUTLET1_VOLTAGE_ID, config.port1Name + ' Voltage', SDK.ValueType.VOLTAGE, SDK.DeviceType.OTHER));
    this.addSensor(new SDK.Devices.DeviceValueComponent(OUTLET1_CURRENT_ID, config.port1Name + ' Current', SDK.ValueType.CURRENT, SDK.DeviceType.OTHER));
    this.addSensor(new SDK.Devices.DeviceValueComponent(OUTLET1_POWER_ID, config.port1Name + ' Power', SDK.ValueType.POWER, SDK.DeviceType.OTHER));
    this.addControl(new SDK.Devices.DeviceBooleanComponent(OUTLET1_OUTPUT_ID, config.port1Name + ' Output', SDK.DeviceType.OUTLET));
    this.addSensor(new SDK.Devices.DeviceValueComponent(OUTLET2_VOLTAGE_ID, config.port2Name + ' Voltage', SDK.ValueType.VOLTAGE, SDK.DeviceType.OTHER));
    this.addSensor(new SDK.Devices.DeviceValueComponent(OUTLET2_CURRENT_ID, config.port2Name + ' Current', SDK.ValueType.CURRENT, SDK.DeviceType.OTHER));
    this.addSensor(new SDK.Devices.DeviceValueComponent(OUTLET2_POWER_ID, config.port2Name + ' Power', SDK.ValueType.POWER, SDK.DeviceType.OTHER));
    this.addControl(new SDK.Devices.DeviceBooleanComponent(OUTLET2_OUTPUT_ID, config.port2Name + ' Output', SDK.DeviceType.OUTLET));
};

util.inherits(OutletInstance, SDK.Devices.DeviceInstance);

/*Overrides of Device Instance */

OutletInstance.prototype.start = function() {
    //generate a session id
    this.session = "01234567890123456789012345678901";
    //create a scheduled job to poll the device every 5 minutes
    var schedule = {seconds: 60};
    this.job = this.scheduler.scheduleJob("PollUbiquiti_" + this.id, schedule, function(time, obj) {
        obj._updateValues();
    }, this);
    //grab the current values
    this._updateValues();
};

OutletInstance.prototype.shutdown = function() {
    //on shutdown, cancel the scheduled job
    if (this.job) {
        this.scheduler.cancel(this.job);
    }
};


OutletInstance.prototype.setComponentValues = function(newVals) {
    if (newVals.controls.hasOwnProperty(OUTLET1_OUTPUT_ID)) {
        var o1 = newVals.controls[OUTLET1_OUTPUT_ID].value;
        //set the val
        this.loggingService.info('Setting outlet 1 to ' + o1);
        this.updateControlValue(OUTLET1_OUTPUT_ID, o1);
        this.setOutletValue(1, o1);
    } else if (newVals.controls.hasOwnProperty(OUTLET2_OUTPUT_ID)) {
        var o2 = newVals.controls[OUTLET2_OUTPUT_ID].value;
        //set the val
        this.loggingService.info('Setting outlet 2 to ' + o2);
        this.updateControlValue(OUTLET2_OUTPUT_ID, o2);
        this.setOutletValue(2, o2);
    }
};

/* Internal methods for control of the device */

OutletInstance.login = function(config, sessionId, callback) {
    //The url we want is: 'http://192.168.55.120/login.cgi?username=admin&password=admin'
    var url = 'http://' + config.ipAddress + '/login.cgi';
    requestify.post(url, {username: config.username, password: config.password}, {
            cookies: {
                'AIROS_SESSIONID': sessionId
            },
            dataType: 'form-url-encoded',
            cache: {
                cache: false, // Will set caching to true for this request.
                expires: 3600 // Time for cache to expire in milliseconds
            }
    }).then(function(response) {
        // we expect a 200 here
        var code = response.getCode();
        if (code === 302) {
            callback({code: 200});
            return;
        }
        if (code === 200) {
            //see if invalid credentials, will see 'Invalid credentials.' in body
            var invalidCreds =  response.getBody().indexOf('Invalid credentials.') >= 0;
            if (invalidCreds) {
                callback({code: 401, error: 'Invalid credentials.'});
            } else {
                callback({ code: 200, cookies: response.headers['set-cookie'] });
            }
        } else {
            callback({code: -1, error: 'Could not contact server'});
        }
    }).catch(function (err) {
        if (err.code === 302) {
            callback({code: 200, cookies: err.headers['set-cookie']});
        } else {
            callback({code: -1, error: err.message});
        }

    });
};

OutletInstance.validate = function(config, callback) {
    //generate a session id
    var session = uuid();
    //check that we can login
    OutletInstance.login(config, session, function(result) {
        var validation = {
            valid: true,
            errors: []
        };

        if (result.code !== 200) {
            validation.valid = false;
            validation.errors.push(result.error);
        }
        callback(validation);
    });
};

OutletInstance.prototype._updateValues = function() {
    var that = this;
    OutletInstance.login(this.config, this.session, function(result) {
        //poll the service
        //The url we want is: 'http://192.168.55.120/login.cgi?username=admin&password=admin'
        var url = 'http://' + that.config.ipAddress + '/sensors';
        requestify.get(url, {
            dataType: 'json',
            cookies: {
                'AIROS_SESSIONID': that.session
            },
        }).then(function (response) {
            // we expect a 200 here
            var code = response.getCode();
            if (code === 200) {
                var sensors = response.getBody();
                //get the current values
                var voltage = sensors.sensors[0].voltage;
                var power = sensors.sensors[0].power;
                var current = sensors.sensors[0].current;
                var on = sensors.sensors[0].output === 1;
                
                //update the current values
                that.updateSensorValue(OUTLET1_VOLTAGE_ID, voltage);
                that.updateSensorValue(OUTLET1_CURRENT_ID, current);
                that.updateSensorValue(OUTLET1_POWER_ID, power);
                that.updateControlValue(OUTLET1_OUTPUT_ID, on);

                voltage = sensors.sensors[1].voltage;
                power = sensors.sensors[1].power;
                current = sensors.sensors[1].current;
                on = sensors.sensors[1].output  === 1;
                //update the current values
                that.updateSensorValue(OUTLET2_VOLTAGE_ID, voltage);
                that.updateSensorValue(OUTLET2_CURRENT_ID, current);
                that.updateSensorValue(OUTLET2_POWER_ID, power);
                that.updateControlValue(OUTLET2_OUTPUT_ID, on);

            } else {
                this.loggingService.error('Could not query ubiquity socket ' + this.id() + ', response code was ' + code);
            }
        }).catch(function (err) {
            this.loggingService.error('Error querying ubiquity socket ' + this.id() + ': ' + err.message, err.stack);
        });
    });
};


OutletInstance.prototype.setOutletValue = function(which, val) {
    var that = this;
    //e.g. curl -X PUT -d output=0 -b "AIROS_SESSIONID=01234567890123456789012345678901" 10.0.0.1/sensors/1
    OutletInstance.login(this.config, this.session, function(result) {
        //poll the service
        //The url we want is: 'http://192.168.55.120/sensors/1'
        var url = 'http://' + that.config.ipAddress + '/sensors/' + which;
        var newVal;
        newVal = (val === 'true' || val === true) ? 1 : 0;
        requestify.put(url, {output:  newVal }, {
            dataType: 'form-url-encoded',
            cookies: {
                'AIROS_SESSIONID': that.session
            }
        }).then(function (response) {
            switch (which) {
                case 1:
                    that.updateControlValue(OUTLET1_OUTPUT_ID, val);
                    break;
                case 2:
                    that.updateControlValue(OUTLET2_OUTPUT_ID, val);
                    break;
            }
        });
    });

};


var UbiquitiPlugin = function() {
    SDK.Devices.DevicePlugin.call(this, 'mFi® In-Wall Outlet');
    this.addSetupParameter('ipAddress', 'IP Address', true, SDK.ValueType.IP_ADDRESS);
    this.addSetupParameter('username', 'Username', true, SDK.ValueType.TEXT);
    this.addSetupParameter('password', 'Password', true, SDK.ValueType.PASSWORD);
    this.addSetupParameter('port1Name', 'Port 1 Name', true, SDK.ValueType.TEXT);
    this.addSetupParameter('port2Name', 'Port 2 Name', true, SDK.ValueType.TEXT);
};

util.inherits(UbiquitiPlugin, SDK.Devices.DevicePlugin);

UbiquitiPlugin.prototype.validate = function(config, callback) {
    return OutletInstance.validate(config, callback);
};

UbiquitiPlugin.prototype.createInstance = function(id, config, services) {
    return new OutletInstance(id, config,
        services.resolve('scheduler'),
        services.resolve('loggingService'));
};



module.exports = new UbiquitiPlugin();