#!/usr/bin/env php
<?php
/**
 * Solar Realms Elite - Database Migration Runner
 *
 * This script handles database migrations for both:
 * - System tables (system_tb_*)
 * - Dynamic game tables (game{id}_tb_*)
 *
 * Usage:
 *   php database/migrate.php              # Run all pending migrations
 *   php database/migrate.php --status     # Show migration status
 *   php database/migrate.php --help       # Show help
 *
 * Can be run from Docker:
 *   docker-compose exec web php database/migrate.php
 */

// Change to project root
chdir(__DIR__ . '/..');

// Check if config exists
if (!file_exists('include/config.php')) {
    die("Error: Configuration file not found. Please run the installer first.\n");
}

require_once('include/config.php');

// Parse command line arguments
$showStatus = in_array('--status', $argv);
$showHelp = in_array('--help', $argv) || in_array('-h', $argv);

if ($showHelp) {
    echo <<<HELP
Solar Realms Elite - Database Migration Tool

Usage:
  php database/migrate.php              Run all pending migrations
  php database/migrate.php --status     Show migration status
  php database/migrate.php --help       Show this help message

Migrations are stored in database/migrations/ directory.

HELP;
    exit(0);
}

echo "Solar Realms Elite - Database Migration Tool\n";
echo "=============================================\n\n";

// Connect to database using PDO
try {
    $dsn = sprintf(
        "mysql:host=%s;dbname=%s;charset=utf8mb4",
        CONF_DATABASE_HOSTNAME,
        CONF_DATABASE_NAME
    );
    $pdo = new PDO($dsn, CONF_DATABASE_USERNAME, CONF_DATABASE_PASSWORD, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    echo "[OK] Connected to database: " . CONF_DATABASE_NAME . "\n\n";
} catch (PDOException $e) {
    die("[ERROR] Database connection failed: " . $e->getMessage() . "\n");
}

// Create migrations tracking table if it doesn't exist
$pdo->exec("
    CREATE TABLE IF NOT EXISTS system_tb_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
");

// Get list of executed migrations
$executed = $pdo->query("SELECT migration FROM system_tb_migrations ORDER BY id")
    ->fetchAll(PDO::FETCH_COLUMN);

if ($showStatus) {
    echo "Migration Status:\n";
    echo "-----------------\n";

    $migrations = glob(__DIR__ . '/migrations/*.sql');
    sort($migrations);

    foreach ($migrations as $file) {
        $name = basename($file);
        $status = in_array($name, $executed) ? '[DONE]' : '[PENDING]';
        echo "$status $name\n";
    }

    echo "\nPassword field status:\n";

    // Check password field size in system_tb_players
    $stmt = $pdo->query("SHOW COLUMNS FROM system_tb_players LIKE 'password'");
    $column = $stmt->fetch();
    if ($column) {
        $type = $column['Type'];
        $isExpanded = (strpos($type, '255') !== false || strpos($type, 'TEXT') !== false);
        $status = $isExpanded ? '[OK]' : '[NEEDS MIGRATION]';
        echo "$status system_tb_players.password: $type\n";
    }

    // Check game tables
    $games = $pdo->query("SELECT id, name FROM system_tb_games")->fetchAll();
    foreach ($games as $game) {
        $tableName = "game{$game['id']}_tb_empire";
        try {
            $stmt = $pdo->query("SHOW COLUMNS FROM $tableName LIKE 'password'");
            $column = $stmt->fetch();
            if ($column) {
                $type = $column['Type'];
                $isExpanded = (strpos($type, '255') !== false || strpos($type, 'TEXT') !== false);
                $status = $isExpanded ? '[OK]' : '[NEEDS MIGRATION]';
                echo "$status $tableName.password: $type (Game: {$game['name']})\n";
            }
        } catch (PDOException $e) {
            echo "[SKIP] $tableName: Table not found\n";
        }
    }

    exit(0);
}

// Run pending migrations
echo "Running migrations...\n\n";

$migrations = glob(__DIR__ . '/migrations/*.sql');
sort($migrations);

$count = 0;

foreach ($migrations as $file) {
    $name = basename($file);

    if (in_array($name, $executed)) {
        echo "[SKIP] $name (already executed)\n";
        continue;
    }

    echo "[RUN]  $name\n";

    try {
        $sql = file_get_contents($file);

        // Split by semicolon and execute each statement
        $statements = array_filter(array_map('trim', explode(';', $sql)));

        foreach ($statements as $statement) {
            if (empty($statement) || strpos($statement, '--') === 0) {
                continue;
            }
            $pdo->exec($statement);
        }

        // Record migration
        $pdo->prepare("INSERT INTO system_tb_migrations (migration) VALUES (?)")
            ->execute([$name]);

        echo "       [OK] Migration completed\n";
        $count++;
    } catch (PDOException $e) {
        echo "       [ERROR] " . $e->getMessage() . "\n";
        exit(1);
    }
}

// Always run game table migrations (for dynamic tables)
echo "\nUpdating game empire tables...\n";

try {
    $games = $pdo->query("SELECT id, name FROM system_tb_games")->fetchAll();

    foreach ($games as $game) {
        $tableName = "game{$game['id']}_tb_empire";

        try {
            // Check current column type
            $stmt = $pdo->query("SHOW COLUMNS FROM $tableName LIKE 'password'");
            $column = $stmt->fetch();

            if ($column) {
                $type = $column['Type'];
                if (strpos($type, '255') === false && strpos($type, 'TEXT') === false) {
                    $pdo->exec("ALTER TABLE $tableName MODIFY COLUMN password VARCHAR(255) NOT NULL");
                    echo "[OK]   Expanded password field in $tableName\n";
                } else {
                    echo "[SKIP] $tableName already has expanded password field\n";
                }
            }
        } catch (PDOException $e) {
            echo "[WARN] Could not update $tableName: " . $e->getMessage() . "\n";
        }
    }
} catch (PDOException $e) {
    echo "[WARN] Could not fetch games: " . $e->getMessage() . "\n";
}

echo "\n=============================================\n";
echo "Migrations complete. $count migration(s) executed.\n";

// Provide summary
echo "\nSecurity Status:\n";
echo "- Password hashing: Argon2id (with MD5 auto-upgrade on login)\n";
echo "- Password field: VARCHAR(255) (supports modern hashes)\n";
echo "\nExisting users with MD5 passwords will be automatically\n";
echo "upgraded to Argon2id on their next successful login.\n";
