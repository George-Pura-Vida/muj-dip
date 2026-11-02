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
