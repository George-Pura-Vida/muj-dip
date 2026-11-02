# MŮJ-DIP accounts

Requires PHP 8.1+ with PDO SQLite, sessions and a working mail() transport.
Production document root must be the repository's dist/ directory with Apache .htaccess enabled.
The users database, recovery tokens and short-lived rate limits are stored under var/accounts/ outside dist/.
Never publish or commit var/, server backups or session files. Include the private database in encrypted hosting backups with restricted access.

Registration requires email verification. Email is the login. Profile email changes require the current password and confirmation of the new address. Password recovery tokens last 30 minutes, are stored hashed and are consumed atomically. Reset and password/email changes invalidate previous sessions. Idle timeout: 30 minutes, absolute timeout: 12 hours.

Passwords and secrets must not be sent to the operator in chat. There is no default or hard-coded administrator account.
Mail sender: info@jirijanousek.cz. Confirm actual delivery and SPF/DKIM at the host before promoting registration.
PHP mail() acceptance does not guarantee delivery. Recovery responses deliberately do not disclose whether an email is registered.

The account stores profile data only. Investment plans remain browser-local, namespaced per account; existing exports can be imported manually. No automatic cloud plan synchronization is implemented.

Local integration tests run PHP's development server bound to 127.0.0.1 with MUJDIP_TEST_MODE=1. This enables a local test outbox only when PHP_SAPI is cli-server and the peer is loopback. Production Apache cannot enable that path through an HTTP request.


## Owner approval
Only the verified jgjjanousek@gmail.com account can open /account.php?view=approvals. It can list paginated registered users, inspect their profile fields, approve, reject or revoke access. Email verification alone never grants normal users access. The administrator email cannot be changed through the profile form.

On the first deployment of approval support, existing accounts migrate to pending. The verified owner account remains able to administer them. Every approval decision is recorded in the private SQLite audit table, and increments the target account session version. Revoked sessions fail their next authenticated request. Exported files and a page already loaded in a browser cannot be remotely erased. Investment calculation code is client-side and public static assets are not DRM.

Hosting remains PHP on Webkitty. GitHub Pages must not publish dist/ because it cannot execute the PHP login gate. CI verifies source and isolated authentication only.

Public legal pages are at legal.php?view=terms/privacy/cookies/legal. Account pages and calculator expose the same footer. privacy.js is an informational notice for necessary storage only, not an analytics-consent manager. Its 180-day acknowledgement can be reopened in the footer. Do not add optional tracking without a real opt-in and withdrawal implementation. Legal text reflects the current app; operator processor contracts, retention practice and legal review must be verified separately.
