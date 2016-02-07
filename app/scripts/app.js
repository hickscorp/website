(function(document) {
  'use strict';
  var   app     = document.querySelector('#app');
  app.baseUrl   = '/';
  // When in production, set app.baseUrl correctly.
  if (window.location.port === '') {
    app.baseUrl   = '/';
  }

  app.displayInstalledToast = function() {
    if (!Polymer.dom(document).querySelector('platinum-sw-cache').disabled) {
      Polymer.dom(document).querySelector('#caching-complete').show();
    }
  };

  app.addEventListener('dom-change', function() {
    console.log('Our app is ready to rock!');
  });
  window.addEventListener('WebComponentsReady', function() {
  });
})(document);
