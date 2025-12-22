<?php
// Solar Imperium is licensed under GPL2, Check LICENSE.TXT for mode details //


define("LANGUAGE_DOMAIN","system");

require_once("include/init.php");
require_once("include/security/PasswordHandler.php");

// ******************************************************************************
//  Signup callback (AJAX)
// ******************************************************************************
if (isset($_GET["SIGNUP"])) {

    // CSRF protection
    if (!isset($_POST["csrf_token"]) || !SessionManager::validateCsrfToken($_POST["csrf_token"])) {
        $DB->CompleteTrans();
        dieError(T_("Invalid security token. Please refresh the page and try again."));
    }

    if ((!isset($_POST["agree_checkbox"])) || ($_POST["agree_checkbox"]=="false")) {
        $DB->CompleteTrans();
        die(T_("You must agree with the rules!"));
    }

    if ($_POST["email"] == "") { $DB->CompleteTrans(); dieError(T_("Empty email field!")); }
    if ($_POST["real_name"] == "") { $DB->CompleteTrans(); dieError(T_("Empty real name field!")); }
    if ($_POST["country"] == "") { $DB->CompleteTrans(); dieError(T_("Empty country field!")); }
    if ($_POST["nickname"] == "") { $DB->CompleteTrans(); dieError(T_("Empty nickname field!")); }
    if ($_POST["password1"] == "") { $DB->CompleteTrans(); dieError(T_("Empty password(first) field!")); }
    if ($_POST["password2"] == "") { $DB->CompleteTrans(); dieError(T_("Empty password(second) field!")); }
    if ($_POST["password1"] != $_POST["password2"]) { $DB->CompleteTrans(); dieError(T_("Passwords entered does not matches!")); }

    // SQL Injection fix: Use prepared statements
    $stmtEmail = $DB->Prepare("SELECT * FROM system_tb_players WHERE email=?");
    $rs = $DB->Execute($stmtEmail, array($_POST["email"]));
    if (!$rs->EOF) { $DB->CompleteTrans(); dieError(T_("This email address is already used by someone else!")); }

    // SQL Injection fix: Use prepared statements
    $stmtNick = $DB->Prepare("SELECT * FROM system_tb_players WHERE nickname=?");
    $rs = $DB->Execute($stmtNick, array(utf8_encode($_POST["nickname"])));
    if (!$rs->EOF) { $DB->CompleteTrans(); dieError(T_("This nickname is already used by someone else!")); }

    $_POST["nickname"] = str_replace("<","&lt;",$_POST["nickname"]);
    $_POST["nickname"] = str_replace(">","&gt;",$_POST["nickname"]);
    $_POST["real_name"] = str_replace("<","&lt;",$_POST["real_name"]);
    $_POST["real_name"] = str_replace(">","&gt;",$_POST["real_name"]);
    $_POST["email"] = str_replace("<","&lt;",$_POST["email"]);
    $_POST["email"] = str_replace(">","&gt;",$_POST["email"]);
    $_POST["country"] = str_replace("<","&lt;",$_POST["country"]);
    $_POST["country"] = str_replace(">","&gt;",$_POST["country"]);

    $creation_date = time(NULL);

    $rs = $DB->Execute("SELECT COUNT(*) FROM system_tb_players");
    $admin = 0;
    if ($rs->fields[0] == 0) $admin = 1;

    // Hash password securely with Argon2id
    $hashedPassword = PasswordHandler::hash($_POST["password1"]);

    // SQL Injection fix: Use prepared statements
    $stmtInsert = $DB->Prepare("INSERT INTO system_tb_players (admin,creation_date,email,nickname,real_name,country,password,active) VALUES(?,?,?,?,?,?,?,1)");
    $rs = $DB->Execute($stmtInsert, array(
        $admin,
        $creation_date,
        $_POST["email"],
        utf8_encode($_POST["nickname"]),
        utf8_encode($_POST["real_name"]),
        utf8_encode($_POST["country"]),
        $hashedPassword
    ));
    if (!$rs) trigger_error($DB->ErrorMsg());
    // already activated, no need to send email

    // Update stats
    $timeNow = mktime(0,0,1, date("n"), date("j"), date("Y"));

    // Check if a stats entry exists for the current day
    $stats = $DB->Execute("SELECT * FROM system_tb_stats WHERE timestamp='".intval($timeNow)."'");
    if ($stats->EOF) {
    // Create a new entry
        $query = "INSERT INTO system_tb_stats (timestamp, signup_count, login_count) VALUES('".intval($timeNow)."', '0','0')";
        $DB->Execute($query);
        $stats = $DB->Execute("SELECT * FROM system_tb_stats WHERE timestamp='".intval($timeNow)."'");
    }

    $signup_count = $stats->fields["signup_count"];
    $signup_count++;
    $query = "UPDATE system_tb_stats SET signup_count='".intval($signup_count)."' WHERE id='".$stats->fields["id"]."'";
    $DB->Execute($query);
    


    $DB->CompleteTrans();
    if (isset($_GET["XML"]))
        $TPL->display("page_register_complete.html");
    else
        die("register_complete");
}



// Pass CSRF token to template
$TPL->assign("csrf_token", SessionManager::getCsrfToken());

$DB->CompleteTrans();
$TPL->display("page_registernow.html");

?>
