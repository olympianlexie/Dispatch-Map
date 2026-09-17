// Stands in for public/js/auth.js in the demo — same interface
// (init/getToken), no Netlify Identity, no login screen. app.js and
// vehicles.js don't know the difference.

window.DispatchAuth = (function () {
  function init(onReady) {
    setTimeout(onReady, 0);
  }

  function getToken() {
    return Promise.resolve('demo-token');
  }

  return { init, getToken };
})();
