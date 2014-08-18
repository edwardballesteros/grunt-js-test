/* global chai:true, document:true, mocha:true, mochaPhantomJS: true */

(function (window) {
  'use strict';

  // function sendMessage() {
  //  var args = [].slice.call(arguments);
  //  if (window.PHANTOMJS) {
  //    alert(JSON.stringify(args));
  //  } else {
  //    console.log.call(console.log, args);
  //  }
  // }

  function debounce(func, threshold) {
    var timeout;
    return function debounced() {
      var obj = this;
      var args = arguments;

      function delayed() {
        func.apply(obj, args);
        timeout = null;
      }

      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(delayed, threshold || 100);
    };
  }

  function Reporter(runner) {
    // Setup HTML reporter to output data on the screen
    Mocha.reporters.HTML.apply(this, arguments);

    function fixHeight() { // test, err
      try {
        window.parent.fixIframe(window);
      } catch (ex) {}
    }

    // Create a Grunt listener for each Mocha events
    // start, test, test end, suite, suite end, fail, pass, pending, end

    // if this test is within a frame, then listen for test results
    // and resize as data is added to make the parent page usable.
    if (window.parent !== window) {
      runner.on('test end', debounce(fixHeight, 200));
      runner.on('fail', window.parent.reportFailure);
      runner.on('pass', window.parent.reportSuccess);
      runner.on('end', fixHeight);
    }

    // if we are generating coverage reprot data, then we need to
    // save the results after tests have completed
    if ('coverage' in document.body.dataset) {
      runner.on('end', function () {
        saveCoverageDataToServer();
      });
    }
  }

  for (var prop in Mocha.reporters.HTML.prototype) {
    Reporter.prototype[prop] = Mocha.reporters.HTML.prototype[prop];
  }

  // we need to call setup before page load,
  // this is what exposes describe() to the global
  // window object to allow the unit tests to 
  // register themselves to the test runner.
  mocha.setup({
    ui: 'bdd',
    ignoreLeaks: true,
    reporter: Reporter
  });

  // mocha.checkLeaks();

  window.addEventListener('load', function () {
    window.assert = chai.assert;
    window.expect = chai.expect;

    // if this is not a require.js test, then run mocha on page load
    if (document.body.getAttribute('data-modules') == '') {
      if (window.mochaPhantomJS) {
        mochaPhantomJS.run();
      } else {
        mocha.run();
      }
    }
  }, false);

  // sometimes the localStorage gets into an odd state
  if (window.location.search.indexOf('clear=1') > -1) {
    delete window.localStorage.jscover;
  }

  function saveCoverageDataToServer(onComplete) {
    if (!window._$jscoverage) {
      return;
    }

    var url = document.location.origin + '/jscoverage.json?' + (+(new Date()));

    var request = new XMLHttpRequest();
    request.open('POST', url, true);
    request.onload = function () {
      if (request.status >= 200 && request.status < 400) {
        // request.responseText;
        if (onComplete) {
          onComplete();
        }
      }
    };
    request.onerror = function () {
      alert('There was an error saving the coverage report data. Verify server is up?');
    };

    request.setRequestHeader('Content-Type', 'text/plain');
    request.send(window.saveCoverageData(window._$jscoverage));
  }

  window.jscoverage_report = saveCoverageDataToServer;
})(this);