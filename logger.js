(function (exports) {
  'use strict';

  var ErrorLogger = function () {
    var self = this;

    /**
     * Current time in milliseconds
     *
     * @type {Number}
     */
    this.startTime = null;

    /**
     * Default configuration.
     *
     * @type {Object}
     */
    this.config = {
      // Whenever to show the parsed error
      detailedErrors: true,

      // Configure remote logging
      remoteLogging: {

        // Whenever to send the error to a remote URL.
        enable: false,

        // Remote URL.
        url: null,

        // A callback function that will be executed after the request.
        successCallback: function () {},

        // A callback function that will be executed after the request.
        errorCallback: function () {}
      }
    };

    /**
     * Initialize error logging.
     *
     * @param {Object} options
     */
    this.init = function (options) {
      // Override the default configuration options with the one provided.
      if (options && (typeof options === 'object')) {
        this.config = Object.assign(this.config, options);
      }

      // Start logging visitor's time on the site.
      this.startTime = Date.now();

      // Remove current listener
      window.removeEventListener('error', this._errorListener);

      // Listen to errors
      window.addEventListener('error', this._errorListener);
    };

    /**
     *
     * @param {Object} e Error object.
     * @private
     */
    this._errorListener = function (e) {
      e = self._parseError(e);

      if (self.config.detailedErrors) {
        self._showError(e);
      }

      if (self.config.remoteLogging.enable) {
        self._remoteLogging(e);
      }
    };

    /**
     *
     * @param {Object} e Error object.
     * @private
     */
    this._showError = function (e) {
      window.console.log([
        'Type: ' + e.type,
        'Error: ' + e.message,
        'StackTrace: ' + e.stackTrace,
        'Path: ' + e.path,
        'Line: ' + e.line,
        'Column: ' + e.column,
        'Debug: ' + e.path + ':' + e.line,
        'Viewport: ' + e.viewport,
        'Visitor time on page: ' + self._parseVisitorTime(e.timeSpend),
        'Date: ' + e.datetime
      ].join('\n'));
    };

    /**
     * Retrieve user's viewport.
     *
     * @returns {String}
     * @private
     */
    this._getViewport = function () {
      var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

      return w + 'x' + h;
    };

    /**
     * Send a POST request to remote URL with the error in the payload.
     *
     * @param {Object} e Error object.
     * @private
     */
    this._remoteLogging = function (e) {
      if (!self.config.remoteLogging.url) {
        throw new Error('Provide remote URL to log errors.');
      }

      // Convert the stack trace to a valid JSON object and stringify it
      e.stackTrace = JSON.stringify(e.stackTrace.split('\n'));

      var url = self.config.remoteLogging.url;
      var xhr = new XMLHttpRequest();

      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
      xhr.send(JSON.stringify(e));

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 && self.config.remoteLogging.successCallback) {
            self.config.remoteLogging.successCallback();
          } else if (self.config.remoteLogging.errorCallback) {
            self.config.remoteLogging.errorCallback();
          }
        }
      };
    };

    /**
     * Parse the error object and append viewport and current date.
     *
     * @param {Object} e Error object.
     * @returns {Object}
     * @private
     */
    this._parseError = function (e) {
      var datetime = new Date().toString();
      var viewport = self._getViewport();
      var visitorTimeOnPage = self._getTimeOnPage();
      var error = '';

      if (e.error) {
        error = e.error.stack.toString();
      }

      return {
        type: e.type,
        message: e.message,
        path: e.filename,
        line: e.lineno,
        column: e.colno,
        stackTrace: error,
        viewport: viewport,
        timeSpend: visitorTimeOnPage,
        datetime: datetime
      };
    };

    /**
     * Returns the time visitor has spent on the site.
     *
     * @returns {Number} Time in milliseconds.
     * @private
     */
    this._getTimeOnPage = function () {
      return Date.now() - self.startTime;
    };

    /**
     * Parse visitor's time on page into human-readable format.
     *
     * @param {Number} ms Time in milliseconds.
     * @returns {String}
     * @private
     */
    this._parseVisitorTime = function (ms) {
      var duration = {};
      var units = [
        {
          label: 'ms',
          mod: 1000
        },
        {
          label: 'seconds',
          mod: 60
        },
        {
          label: 'minutes',
          mod: 60
        },
        {
          label: 'hours',
          mod: 24
        },
        {
          label: 'days',
          mod: 31
        }
      ];

      // Calculate the individual unit values.
      units.forEach(function (u) {
        ms = (ms - (duration[u.label] = (ms % u.mod))) / u.mod;
      });

      var nonZero = function (u) {
        return duration[u.label];
      };

      // Convert object to a string representation
      duration.toString = function () {
        return units
          .reverse()
          .filter(nonZero)
          .map(function (u) {
            return duration[u.label] + ' ' + (duration[u.label] == 1 ? u.label.slice(0, -1) : u.label);
          })
          .join(', ');
      };

      return duration;
    };

    // Polyfill for Object.assign()
    if (typeof Object.assign != 'function') {
      Object.assign = function (target) {
        if (target === null) {
          throw new TypeError('Cannot convert undefined or null to object');
        }

        target = Object(target);

        for (var index = 1; index < arguments.length; index++) {
          var source = arguments[index];

          if (source !== null) {
            for (var key in source) {
              if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
              }
            }
          }
        }

        return target;
      };
    }

    return self;
  };

  exports.ErrorLogger = ErrorLogger;

})(typeof exports === 'undefined' ? window : exports);
