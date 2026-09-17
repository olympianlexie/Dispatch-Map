// Gates a function on Netlify Identity being enabled + the caller being
// logged in. Netlify populates context.clientContext.user itself once
// Identity is enabled on the site and the browser sends the user's
// Identity JWT as a Bearer token — nothing else to configure here.
//
// Subscriber-related data must never be served to an unauthenticated
// caller, per the Data Privacy Act requirement in the project brief.

function requireUser(context) {
  return (context && context.clientContext && context.clientContext.user) || null;
}

module.exports = { requireUser };
