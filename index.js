'use strict';

var lifx = require('ya-lifx');

class LifxDriver {
    constructor(driverSettingsObj, interfaces) {
        var self = this;
        this.driverSettingsObj = driverSettingsObj;

        this.driverSettings = {};
        this.driverSettingsObj.get().then(function(settings) {
            self.driverSettings = settings;
            lifx.init(self.driverSettings.token);
        });

        this.interface = interfaces[this.getInterface()];
    }

    getName() {
        return 'lifx';
    }

    getType() {
        return 'light';
    }

    getInterface() {
        return 'http';
    }

    getEventEmitter() {
        return this.eventEmitter;
    }

    setEventEmitter(eventEmitter) {
        this.eventEmitter = eventEmitter;
        //when something happens with this bulb you can emit an event to let the thinglator platform know:
        //it should only emit events which are valid types (see documentation on lights for more info)
        //this.eventEmitter.emit('eventType','driverId','deviceId')

        //E.g:
        //this.eventEmitter.emit('on','lifx','abc123');
    }

    initDevices(devices) {

    }

    _buildColourString(hue, sat, bri) {
        return 'hue:' + hue + ' saturation:' + sat + ' brightness:' + bri;
    }

    _getStatus(device,delay) {
        var self = this;
        setTimeout(function() {
            lifx.listLights(device.specs.deviceId).then(function(response) {
                const resp = {
                    on: response[0].power === 'on',
                    colour: {
                        hue: parseInt(response[0].color.hue),
                        saturation: response[0].color.saturation,
                        brightness: response[0].brightness
                    }
                };
                self.eventEmitter.emit('state', 'lifx', device._id, resp);
            });
        }, delay);
    }

    getAuthenticationProcess() {
        return [{
            type: 'RequestData',
            message: 'In order to use LIFX bulbs you must provide an access token. This can be obtained from your LIFX account settings',
            button: {
                url: 'https://cloud.lifx.com/settings',
                label: 'Get access token'
            },
            dataLabel: 'Access token',
            next: {
                http: '/authenticate/light/lifx/0',
                socket: {
                    event: 'authenticationStep',
                    step: 0
                }
            }
        }];
    }

    setAuthenticationStep0(props) {
        var self = this;
        var newSettings = {
            token: props.data
        };
        return this.driverSettingsObj.set(newSettings).then(function() {
            self.driverSettings = newSettings;
            lifx.init(self.driverSettings.token);

            //check if the token is valid by calling discover
            return self.discover();
        }).then(function() {
            return {
                "success": true
            };
        }).catch(function(err) {
            return {
                "success": false,
                "message": err.error
            };
        })
    }

    discover() {
        return lifx.listLights()
            .then(function(response) {
                var devices = [];
                for (var i in response) {
                    var device = {
                        deviceId: response[i].id,
                        name: response[i].label,
                        capabilities: {
                            setHSBState: true,
                            setBrightnessState: true,
                            toggle: true,
                            setBooleanState: true,
                            breatheEffect: true,
                            pulseEffect: true
                        }
                    };
                    devices.push(device);
                }
                return devices;
            })
            .catch(function(err) {
                err.type = 'Authentication';
                throw err;
            });
    }

    capability_setHSBState(device, props) {
        var self = this;

        return lifx.setState('id:' + device.specs.deviceId, {
                power: 'on',
                color: self._buildColourString(props.colour.hue, props.colour.saturation, props.colour.brightness),
                duration: props.duration
            })
            .then(function(result) {
                if (result.results[0].status === 'ok') {

                } else if (result.results[0].status === 'offline') {
                    var e = new Error('Unable to connect to bulb');
                    e.type = 'Connection';
                    throw e;
                } else {
                    var e = new Error(result);
                    e.type = 'Driver';
                    throw e;
                }

                return lifx.listLights(device.specs.deviceId);
            })
            .then(function(response) {
               const resp = {
                    on: response[0].power === 'on',
                    colour: {
                        hue: parseInt(response[0].color.hue),
                        saturation: response[0].color.saturation,
                        brightness: response[0].brightness
                    }
                };
                self._getStatus(device,(props.duration*1000)+1000);
                return resp;
            })
            .catch(function(e) {
                if (!e.type) {
                    if (e.error === 'Invalid token') {
                        var err = new Error('Not authenticated');
                        err.type = 'Authentication';
                    } else if (e.error === 'Token required') {
                        var err = new Error('Not authenticated');
                        err.type = 'Authentication';
                    } else if (e.error.startsWith('Unable to parse color')) {
                        var err = new Error('Unable to parse colour');
                        err.type = 'BadRequest';
                    } else {
                        var err = new Error(e.error);
                        err.type = 'Device';
                    }
                } else {
                    var err = e;
                }
                throw err;
            });
    }

    capability_setBrightnessState(device, props) {
        var self = this;
  
        return lifx.setState('id:' + device.specs.deviceId, {
                power: 'on',
                brightness: props.colour.brightness,
                duration: props.duration
            })
            .then(function(result) {
                if (result.results[0].status === 'ok') {

                } else if (result.results[0].status === 'offline') {
                    var e = new Error('Unable to connect to bulb');
                    e.type = 'Connection';
                    throw e;
                } else {
                    var e = new Error(result);
                    e.type = 'Driver';
                    throw e;
                }

                return lifx.listLights(device.specs.deviceId);
            })
            .then(function(response) {
               const resp = {
                    on: response[0].power === 'on',
                    colour: {
                        hue: parseInt(response[0].color.hue),
                        saturation: response[0].color.saturation,
                        brightness: response[0].brightness
                    }
                };
                self._getStatus(device,(props.duration*1000)+1000);
                return resp;
            })
            .catch(function(e) {
                if (!e.type) {
                    if (e.error === 'Invalid token') {
                        var err = new Error('Not authenticated');
                        err.type = 'Authentication';
                    } else if (e.error === 'Token required') {
                        var err = new Error('Not authenticated');
                        err.type = 'Authentication';
                    } else if (e.error.startsWith('Unable to parse color')) {
                        var err = new Error('Unable to parse colour');
                        err.type = 'BadRequest';
                    } else {
                        var err = new Error(e.error);
                        err.type = 'Device';
                    }
                } else {
                    var err = e;
                }
                throw err;
            });
    }

    capability_toggle(device, props) {
        var self = this;

        return lifx.toggle('id:' + device.specs.deviceId, {

            })
            .then(function(result) {
                if (result.results[0].status === 'ok') {

                } else if (result.results[0].status === 'offline') {
                    var e = new Error('Unable to connect to bulb');
                    e.type = 'Connection';
                    throw e;
                } else {
                    var e = new Error(result);
                    e.type = 'Driver';
                    throw e;
                }
                return lifx.listLights(device.specs.deviceId);
            })
            .then(function(response) {
                const resp = {
                    on: response[0].power === 'on',
                    colour: {
                        hue: parseInt(response[0].color.hue),
                        saturation: response[0].color.saturation,
                        brightness: response[0].brightness
                    }
                };
                self._getStatus(device,3000);
                return resp;
            })
            .catch(function(e) {
                if (!e.type) {
                    if (e.error === 'Invalid token') {
                        var err = new Error('Not authenticated');
                        err.type = 'Authentication';
                    } else if (e.error === 'Token required') {
                        var err = new Error('Not authenticated');
                        err.type = 'Authentication';
                    } else if (e.error.startsWith('Unable to parse color')) {
                        var err = new Error('Unable to parse colour');
                        err.type = 'BadRequest';
                    } else {
                        var err = new Error(e.error);
                        err.type = 'Device';
                    }
                } else {
                    var err = e;
                }
                throw err;
            });
    }

    capability_setBooleanState(device, props) {
         var self = this;
        var power = 'on';
        if (props.on === false) {
            power = 'off';
        }

        return lifx.setState('id:' + device.specs.deviceId, {
                power: power,
                duration: props.duration
            })
            .then(function(result) {
                if (result.results[0].status === 'ok') {

                } else if (result.results[0].status === 'offline') {
                    var e = new Error('Unable to connect to bulb');
                    e.type = 'Connection';
                    throw e;
                } else {
                    var e = new Error(result);
                    e.type = 'Driver';
                    throw e;
                }

                return lifx.listLights(device.specs.deviceId);
            })
            .then(function(response) {
                const resp = {
                    on: response[0].power === 'on',
                    colour: {
                        hue: parseInt(response[0].color.hue),
                        saturation: response[0].color.saturation,
                        brightness: response[0].brightness
                    }
                };
                self._getStatus(device,(props.duration*1000)+1000);
                return resp;
            })
            .catch(function(e) {
                if (!e.type) {
                    if (e.error === 'Invalid token') {
                        var err = new Error('Not authenticated');
                        err.type = 'Authentication';
                    } else if (e.error === 'Token required') {
                        var err = new Error('Not authenticated');
                        err.type = 'Authentication';
                    } else {
                        var err = new Error(e.error);
                        err.type = 'Device';
                    }
                } else {
                    var err = e;
                }
                throw err;
            });
    }

    capability_breatheEffect(device, props) {

        var newProps = {
            color: this._buildColourString(props.colour.hue, props.colour.saturation, props.colour.brightness),
            period: props.period,
            cycles: props.cycles,
            persist: props.persist,
            peak: props.peak,
            power_on: true
        };
        if (props.fromColour) {
            newProps.from_color = self._buildColourString(props.fromColour.hue, props.fromColour.saturation, props.fromColour.brightness);
        }
        return lifx.breathe('id:' + device.specs.deviceId, newProps)
            .then(function(result) {
                if (result.results[0].status === 'ok') {
                    return {
                        processed: true
                    };
                } else if (result.results[0].status === 'offline') {
                    var e = new Error('Unable to connect to bulb');
                    e.type = 'Connection';
                    throw e;
                } else {
                    var e = new Error(result);
                    e.type = 'Driver';
                    throw e;
                }

            })
            .catch(function(e) {
                if (!e.type) {
                    if (e.error === 'Invalid token') {
                        var err = new Error('Not authenticated');
                        err.type = 'Authentication';
                    } else if (e.error === 'Token required') {
                        var err = new Error('Not authenticated');
                        err.type = 'Authentication';
                    } else if (e.error.startsWith('Unable to parse color')) {
                        var err = new Error('Unable to parse colour');
                        err.type = 'BadRequest';
                    } else {
                        var err = new Error(e.error);
                        err.type = 'Device';
                    }
                } else {
                    var err = e;
                }
                throw err;
            });
    }

    capability_pulseEffect(device, props) {
        var newProps = {
            color: this._buildColourString(props.colour.hue, props.colour.saturation, props.colour.brightness),
            period: props.period,
            cycles: props.cycles,
            persist: props.persist,
            power_on: true
        };
        if (props.fromColour) {
            newProps.from_color = this._buildColourString(props.fromColour.hue, props.fromColour.saturation, props.fromColour.brightness);
        }
        return lifx.breathe('id:' + device.specs.deviceId, newProps)
            .then(function(result) {
                if (result.results[0].status === 'ok') {
                    return {
                        processed: true
                    };
                } else if (result.results[0].status === 'offline') {
                    var e = new Error('Unable to connect to bulb');
                    e.type = 'Connection';
                    throw e;
                } else {
                    var e = new Error(result);
                    e.type = 'Driver';
                    throw e;
                }

            })
            .catch(function(e) {
                if (!e.type) {
                    if (e.error === 'Invalid token') {
                        var err = new Error('Not authenticated');
                        err.type = 'Authentication';
                    } else if (e.error === 'Token required') {
                        var err = new Error('Not authenticated');
                        err.type = 'Authentication';
                    } else if (e.error.startsWith('Unable to parse color')) {
                        var err = new Error('Unable to parse colour');
                        err.type = 'BadRequest';
                    } else {
                        var err = new Error(e.error);
                        err.type = 'Device';
                    }
                } else {
                    var err = e;
                }
                throw err;
            });
    }
}

module.exports = LifxDriver;