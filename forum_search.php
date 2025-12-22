<?php
// Solar Imperium is licensed under GPL2, Check LICENSE.TXT for mode details //

define("LANGUAGE_DOMAIN","system");

require_once("include/init.php");

if (!isset($_GET["KEYWORDS"])) {
    $warning = T_("No keywords submitted.");
    die(header("Location: forum.php?WARNING=$warning"));
}

if (strlen($_GET["KEYWORDS"]) < 3) {
    $warning = T_("Your search must contains at least 3 characters.");
    die(header("Location: forum.php?WARNING=$warning"));
}

// SQL Injection fix: Use prepared statements with proper LIKE escaping
$keywords = $_GET["KEYWORDS"];
// Escape LIKE wildcards in the search term
$keywordsEscaped = str_replace(['%', '_'], ['\%', '\_'], $keywords);
$searchPattern = '%' . $keywordsEscaped . '%';

$items = array();
$stmt = $DB->Prepare("SELECT * FROM system_tb_forum WHERE title LIKE ? OR content LIKE ?");
$rs = $DB->Execute($stmt, array($searchPattern, $searchPattern));
if (!$rs) trigger_error($DB->ErrorMsg());

$count = 0;

while(!$rs->EOF) {
	$item = array();
	$item["bgcolor"] =  ($count++ % 2 == 0?"#cacada":"#dadaea");
	$item["fgcolor"] =  ($count % 2 == 0?"#000000":"#333333");
	$topic_id = $rs->fields["parent"];
	if ($topic_id == -1) $topic_id = $rs->fields["id"];

	$item["url"] = "forum_viewtopic.php?topic=".$topic_id;
	$item["title"] = str_replace("\\'","'",$rs->fields["title"]);
	$item["date"] = (floor((time(NULL) - $rs->fields["date_creation"])/(60*60*24))+1).T_(" days");
	$rs2 = $DB->Execute("SELECT * FROM system_tb_players WHERE id=".$rs->fields["player"]);
	$item["author"] = $rs2->fields["nickname"];
	if ($rs->fields["forum_name"] == "") $item["forum"] = "---"; else
		$item["forum"] = $FORUMS[$rs->fields["forum_name"]]["description"];
	$items[] = $item;
	$rs->MoveNext();
}

$TPL->assign("items",$items);

$DB->CompleteTrans();
$TPL->display("page_forum_search.html");

?>