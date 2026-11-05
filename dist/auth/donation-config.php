<?php
declare(strict_types=1);
/**
 * Server-only Fio donation configuration.
 * Private files live in project/var (gitignored), outside public dist/.
 * Never commit the actual token. No web request needs to load the token.
 */
function donation_private_dir(): string {
    return dirname(__DIR__, 2) . '/var';
}

function donation_feature_enabled(): bool {
    if (getenv('DONATIONS_ENABLED') === '1') return true;
    $flag = donation_private_dir() . '/donations-enabled.flag';
    return is_file($flag) && !is_link($flag) && is_readable($flag)
        && trim((string) @file_get_contents($flag)) === '1';
}

function donation_bank_token(): string {
    // The token must never be loaded in the HTTP runtime.
    if (PHP_SAPI !== 'cli') return '';
    $configured = getenv('FIO_TOKEN');
    if (is_string($configured) && $configured !== '') return $configured;

    $path = donation_private_dir() . '/fio-token.txt';
    if (!is_file($path) || is_link($path) || !is_readable($path)) return '';
    $permissions = @fileperms($path);
    if ($permissions === false || ($permissions & 0077) !== 0) {
        error_log('MUJ-DIP: Fio token file permissions are not private; set mode 0600.');
        return '';
    }
    // Read no more than one short token; the caller also validates its format.
    return trim((string) @file_get_contents($path, false, null, 0, 256));
}
