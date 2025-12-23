<?php
/**
 * Database initialization script for Railway deployment
 * Run via: php scripts/init-database.php
 *
 * This creates the initial database schema and data.
 */

echo "X Imperium - Database Initialization\n";
echo "====================================\n\n";

// Load config
if (!file_exists(__DIR__ . '/../include/config.php')) {
    die("Error: config.php not found. Make sure environment variables are set.\n");
}

require_once(__DIR__ . '/../include/config.php');
require_once(__DIR__ . '/../include/thirdparty/adodb/adodb.inc.php');

// Connect to database
echo "Connecting to database...\n";
$DB = NewADOConnection(CONF_DATABASE_DRIVER);
if (!$DB->Connect(CONF_DATABASE_HOSTNAME, CONF_DATABASE_USERNAME, CONF_DATABASE_PASSWORD, CONF_DATABASE_NAME)) {
    die("Error: Could not connect to database: " . $DB->ErrorMsg() . "\n");
}
echo "Connected successfully!\n\n";

// Check if tables already exist
$rs = $DB->Execute("SHOW TABLES LIKE 'system_tb_players'");
if (!$rs->EOF) {
    echo "Database already initialized (system_tb_players exists).\n";
    echo "Skipping schema creation.\n";
    exit(0);
}

// Run base schema
echo "Creating database schema...\n";
$sql_file = __DIR__ . '/../include/sql_base.txt';
if (!file_exists($sql_file)) {
    die("Error: sql_base.txt not found.\n");
}

$sql_data = file_get_contents($sql_file);
$sql_statements = explode("/***/", $sql_data);

$success = 0;
$failed = 0;

foreach ($sql_statements as $sql) {
    $sql = trim($sql);
    if (empty($sql)) continue;

    if ($DB->Execute($sql)) {
        $success++;
    } else {
        echo "Warning: Failed query: " . substr($sql, 0, 50) . "...\n";
        echo "Error: " . $DB->ErrorMsg() . "\n";
        $failed++;
    }
}

echo "Schema: $success statements executed, $failed failed.\n\n";

// Run insert data
echo "Inserting initial data...\n";
$sql_file = __DIR__ . '/../include/sql_insert.txt';
if (file_exists($sql_file)) {
    $sql_data = file_get_contents($sql_file);
    $sql_statements = explode("/***/", $sql_data);

    $success = 0;
    $failed = 0;

    foreach ($sql_statements as $sql) {
        $sql = trim($sql);
        if (empty($sql)) continue;

        if ($DB->Execute($sql)) {
            $success++;
        } else {
            echo "Warning: Failed insert: " . substr($sql, 0, 50) . "...\n";
            $failed++;
        }
    }

    echo "Data: $success statements executed, $failed failed.\n\n";
} else {
    echo "No sql_insert.txt found, skipping initial data.\n\n";
}

// Run migrations
echo "Running migrations...\n";
$migrate_file = __DIR__ . '/../database/migrate.php';
if (file_exists($migrate_file)) {
    include($migrate_file);
} else {
    echo "No migration file found.\n";
}

echo "\nDatabase initialization complete!\n";
