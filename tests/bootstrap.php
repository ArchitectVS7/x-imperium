<?php
/**
 * PHPUnit Bootstrap File
 *
 * Sets up the testing environment for X Imperium
 */

declare(strict_types=1);

// Prevent session from being started during tests
define('TESTING_MODE', true);

// Load composer autoloader
require_once __DIR__ . '/../vendor/autoload.php';

// Define minimal constants needed for testing
if (!defined('CONF_DB_HOST')) {
    define('CONF_DB_HOST', getenv('DB_HOST') ?: 'localhost');
}
if (!defined('CONF_DB_NAME')) {
    define('CONF_DB_NAME', getenv('DB_NAME') ?: 'ximperium_test');
}
if (!defined('CONF_DB_USER')) {
    define('CONF_DB_USER', getenv('DB_USER') ?: 'root');
}
if (!defined('CONF_DB_PASSWORD')) {
    define('CONF_DB_PASSWORD', getenv('DB_PASS') ?: '');
}

// Load security classes directly for unit testing
require_once __DIR__ . '/../include/security/PasswordHandler.php';
require_once __DIR__ . '/../include/security/InputSanitizer.php';
