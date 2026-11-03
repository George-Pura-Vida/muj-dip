# MŮJ-DIP accounts

Requires PHP 8.1+ with PDO SQLite, sessions and a working mail() transport.
Production document root must be the repository's dist/ directory with Apache .htaccess enabled.
The users database, recovery tokens and short-lived rate limits are stored under var/accounts/ outside dist/.
Never publish or commit var/, server backups or session files. Include the private database in encrypted hosting backups with restricted access.

Registration requires email verification. Registration verification links (including resent links) last 24 hours and can be used once; password reset and email-change links remain valid for 30 minutes. Email is the login. Profile email changes require the current password and confirmation of the new address. Password recovery tokens last 30 minutes, are stored hashed and are consumed atomically. Reset and password/email changes invalidate previous sessions. Idle timeout: 30 minutes, absolute timeout: 12 hours.

Passwords and secrets must not be sent to the operator in chat. There is no default or hard-coded administrator account.
Mail sender: info@jirijanousek.cz. Confirm actual delivery and SPF/DKIM at the host before promoting registration.
PHP mail() acceptance does not guarantee delivery. Recovery responses deliberately do not disclose whether an email is registered.

The account stores profile data only. Investment plans remain browser-local, namespaced per account; existing exports can be imported manually. No automatic cloud plan synchronization is implemented.

Local integration tests run PHP's development server bound to 127.0.0.1 with MUJDIP_TEST_MODE=1. This enables a local test outbox only when PHP_SAPI is cli-server and the peer is loopback. Production Apache cannot enable that path through an HTTP request.


## Owner approval
Only the verified jgjanousek@gmail.com account can open /admin.php. It can list paginated registered users, inspect their profile fields, approve, reject or revoke access. New registrations are pre-approved and gain access immediately after email verification. Phone is required for subsequent operator contact verification; no SMS verification is implemented. The administrator email cannot be changed through the profile form.

Previously waiting accounts with no administrator decision migrate to approved; explicit administrator restrictions are preserved. The verified owner account remains able to administer them. Every approval decision is recorded in the private SQLite audit table, and increments the target account session version. Revoked sessions fail their next authenticated request. Exported files and a page already loaded in a browser cannot be remotely erased. Investment calculation code is client-side and public static assets are not DRM.

Hosting remains PHP on Webkitty. GitHub Pages must not publish dist/ because it cannot execute the PHP login gate. CI verifies source and isolated authentication only.

Public legal pages are at legal.php?view=terms/privacy/cookies/legal. Account pages and calculator expose the same footer. privacy.js is an informational notice for necessary storage only, not an analytics-consent manager. Its 180-day acknowledgement can be reopened in the footer. Do not add optional tracking without a real opt-in and withdrawal implementation. Legal text reflects the current app; operator processor contracts, retention practice and legal review must be verified separately.

## Registration notification
Each successfully created new account triggers one plain-text notification to AUTH_APPROVER_EMAIL (jgjanousek@gmail.com), after the user's verification email is accepted by the mail transport. It includes name, email, required phone, optional company and a link to the authenticated approvals panel. Duplicate registration attempts do not send another alert. Only email verification is required for automatic activation; no owner action is needed. Notification failures are logged without rolling back registration. As with verification mail, PHP mail() acceptance is not proof of inbox delivery; confirm delivery on the host.


## Process mail templates
Seven UTF-8 plain-text templates live in dist/auth/mail-templates.json. See docs/procesni-emaily.md for previews. Single-use verification, reset and email-change links retain token fragments. Access changes notify verified users; mail failure does not roll back security decisions. Subjects use RFC 2047 encoding, and messages share greeting, readable action URL, expiry, support contact and footer.

## Admin table and permanent deletion
/admin.php is restricted to the verified configured owner. It offers a paginated, searchable user table. The legacy approvals URL redirects after checking authorization. Permanent deletion requires CSRF, same-origin POST, exact target email and explicit confirmation. It protects the owner and current account, deletes profile and access history, and cascades all one-time tokens. Every subsequent authenticated request rejects the removed user. Browser-local plans, user exports and hosting backups are not erased by account deletion. No production user is deleted during automated tests.

Verification links now automatically submit the verification POST in the browser and log the verified permitted user into a fresh session, redirecting to /. A plain GET without the fragment does not consume the token. Reset and email-change forms do not auto-submit. Expired/replayed tokens and administrator restrictions cannot create a login. A no-JavaScript fallback button remains available.

## Voluntary support
/support.php is a public optional contribution page with locally generated SPAYD QR payments to the operator-provided account 223366333/2010. Successful verification logs the user in and redirects to /support.php?welcome=1; the calculator remains available without paying. The welcome banner is only shown to authenticated users. No donor profile, order, payment record or paid status is created, and no bank API or external QR service is used. Users confirm payments in their banking app. QR generation is based on Project Nayuki (MIT), transpiled from typescript-javascript/qrcodegen.ts, with its license preserved.
