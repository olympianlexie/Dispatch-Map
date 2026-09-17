// Netlify Identity gate. Requires Identity to be enabled on the Netlify
// site (Site settings > Identity > Enable Identity) and dispatchers/
// supervisors invited as users — that part is a dashboard setting, not
// something this code can turn on.

window.DispatchAuth = (function () {
  let onReadyCallback = null;

  function init(onReady) {
    onReadyCallback = onReady;

    if (!window.netlifyIdentity) {
      console.error('Netlify Identity widget failed to load.');
      return;
    }

    window.netlifyIdentity.on('init', (user) => {
      if (user) {
        onReadyCallback();
      } else {
        window.netlifyIdentity.open('login');
      }
    });

    window.netlifyIdentity.on('login', () => {
      window.netlifyIdentity.close();
      onReadyCallback();
    });

    window.netlifyIdentity.on('logout', () => {
      window.location.reload();
    });

    window.netlifyIdentity.init();
  }

  async function getToken() {
    const user = window.netlifyIdentity && window.netlifyIdentity.currentUser();
    if (!user) return null;
    // jwt() refreshes the token if it's close to expiring.
    return user.jwt();
  }

  return { init, getToken };
})();
