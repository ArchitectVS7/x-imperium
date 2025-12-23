<?php
// X Imperium is licensed under GPL2, Check LICENSE.TXT for mode details //

define("LANGUAGE_DOMAIN","system");

require_once("include/init.php");


// (please do not remove credit)
// author: Louai Munajim
// website: http://elouai.com
// date: 2004/Apr/18

function bbcode2html($text)
{
  $bbcode = array("<", ">",
                "[list]", "[*]", "[/list]", 
                "[b]", "[/b]", 
                "[u]", "[/u]", 
                "[i]", "[/i]",
                "[code]", "[/code]",
                "[quote]", "[/quote]",
                '"]');
  $htmlcode = array("&lt;", "&gt;",
                "<ul>", "<li>", "</ul>", 
                "<b>", "</b>", 
                "<u>", "</u>", 
                "<i>", "</i>",
                "<code>", "</code>",
                "<table width=100% cellpadding=\"5\" cellspacing=\"0\" bgcolor=lightgray style=\"color:#333333;border:1px dashed #333333\"><tr><td bgcolor=\"#eeeeee\">", "</td></tr></table>",
                '">');
  $newtext = str_replace($bbcode, $htmlcode, $text);
  $newtext = nl2br($newtext);//second pass
  $newtext = str_replace("javascript:","",$newtext);
  $newtext = str_replace("onmouseover=","",$newtext);
  $newtext = str_replace("onmouseleave=","",$newtext);
  $newtext = str_replace("onclick=","",$newtext);
  // Note: No stripslashes needed - using prepared statements

  return $newtext;
}

if (!isset($_SESSION["forum_page"])) $_SESSION["forum_page"] = 0;
if (isset($_GET["forum_page"])) $_SESSION["forum_page"] = intval($_GET["forum_page"]);

if (isset($_GET["BACK"])) {
	unset($_SESSION["current_forum"]);
}


if (isset($_GET["forum"])) {

	// PHP 8.x compatible - use array_key_exists instead of each()
	$found = array_key_exists($_GET["forum"], $FORUMS);

	if ($found) $_SESSION["current_forum"] = $_GET["forum"];
}




// **********************************************************
// Post a new forum topic callback
// **********************************************************
if (isset($_POST["forum_newtopic"]))
{
	
	$subject = $_POST["subject"];
	$content = $_POST["content"];
	
	if ($subject == "") { 
		$DB->CompleteTrans();
		die(header("Location: forum.php?WARNING=".T_("Empty subject field!")));
	}
	
	if ($content == "") { 
		$DB->CompleteTrans();
		die(header("Location: forum.php?WARNING=".T_("Empty content field!")));
	}
	
	
	if (!isset($_SESSION["player"]))
    die(header("Location: forum.php?WARNING=".T_("You need to be logged to post something, there is the content of your post (if you want to copypaste it back later) : <b>").htmlspecialchars($content)."</b>"));

	if (!isset($_SESSION["current_forum"])) {
		$DB->CompleteTrans();
		die(header("Location: forum.php?WARNING=".T_("You can't post until you have choosen a forum!")));
		
	}

	if (($FORUMS[$_SESSION["current_forum"]]["admin_post"] ==1) && ($_SESSION["player"]["admin"] != 1)) {
		die(header("Location: forum.php?WARNING=".T_("Only administrators can post in this forum!")));
	}
	
		
	// SQL Injection fix: Use prepared statements
	$stmtInsert = $DB->Prepare("INSERT INTO system_tb_forum (player,date_creation,date_update,title,content,forum_name) VALUES(?,?,?,?,?,?)");
	$currentTime = time();
	$rs = $DB->Execute($stmtInsert, array($_SESSION["player"]["id"], $currentTime, $currentTime, $subject, $content, $_SESSION["current_forum"]));
	if (!$rs) trigger_error($DB->ErrorMsg());
	
	$DB->CompleteTrans();
			
	die(header("Location: forum.php?"));
}



// **********************************************************
// Delete a forum thread callback (ADMIN ONLY)
// **********************************************************
if (isset($_SESSION["player"]))
if ($_SESSION["player"]["admin"]==1) {
	
	if (isset($_GET["DELETE"])) {
        $topic_id = -1;
        $page = -1;
        if (isset($_GET["topic"])) $topic_id = intval($_GET["topic"]);
        if (isset($_GET["page"])) $page = intval($_GET["page"]);
		$id = intval($_GET["DELETE"]);

		$DB->Execute("DELETE FROM system_tb_forum WHERE id=$id OR parent=$id");
		if (!$DB) trigger_error($DB->ErrorMsg());
		$DB->CompleteTrans();
        if ($topic_id == -1) {
            header("Location: forum.php?");
        } else {
            header("Location: forum_viewtopic.php?topic=$topic_id&page=$page");
        }

		die();
	}
}


// Show the main page (Select a forum)
if (!isset($_SESSION["current_forum"])) {

	$items = array();

	$count = 0;
	// PHP 8.x compatible iteration (each() is deprecated)
	foreach ($FORUMS as $key => $value)
	{
		$item = array();
		$item["bgcolor"] =  ($count++ % 2 == 0?"#cacada":"#dadaea");
		$item["fgcolor"] =  ($count % 2 == 0?"#000000":"#333333");
		$item["url"] = "forum.php?forum=".$key;
		$item["description"] = $value["description"];
		// SQL Injection fix: Use prepared statements
		$stmtPosts = $DB->Prepare("SELECT COUNT(*) FROM system_tb_forum WHERE parent=-1 AND forum_name=?");
		$rs = $DB->Execute($stmtPosts, array($key));
		$item["posts"] = $rs->fields[0];
		$stmtReplies = $DB->Prepare("SELECT COUNT(*) FROM system_tb_forum WHERE parent > -1 AND forum_name=?");
		$rs = $DB->Execute($stmtReplies, array($key));

		$item["replies"] = $rs->fields[0];

		if ($item["posts"] == 0) $item["lastpost"] = "---"; else {
			$stmtLastPost = $DB->Prepare("SELECT date_creation FROM system_tb_forum WHERE parent=-1 AND forum_name=? ORDER BY date_creation DESC");
			$rs = $DB->Execute($stmtLastPost, array($key));
			if (!$rs) trigger_error($DB->ErrorMsg());

			$days = floor((time() - $rs->fields["date_creation"]) / (60*60*24));

			if ($days == 0)
				$item["lastpost"] = T_("Today");
			else
				$item["lastpost"] = $days . T_(" days");
		}

		if ($item["replies"] == 0) $item["lastreply"] = "---"; else {
			$stmtLastReply = $DB->Prepare("SELECT date_creation FROM system_tb_forum WHERE parent > -1 AND forum_name=? ORDER BY date_creation DESC");
			$rs = $DB->Execute($stmtLastReply, array($key));
			if (!$rs) trigger_error($DB->ErrorMsg());

			$days = floor((time() - $rs->fields["date_creation"]) / (60*60*24));

			if ($days == 0)
				$item["lastreply"] = T_("Today");
			else
				$item["lastreply"] = $days . T_(" days");
		}
		
		

		$items[] = $item;		
	}	

	
	$TPL->assign("items",$items);
		
	$DB->CompleteTrans();
	$TPL->display("page_forum.html");
	die();
}


// Display selected forum

if (!isset($_SESSION["forum_page"])) $_SESSION["forum_page"] = 0;
if (isset($_GET["forum_page"])) $_SESSION["forum_page"] = intval($_GET["forum_page"]);
// SQL Injection fix: Use prepared statements
$stmtTotal = $DB->Prepare("SELECT COUNT(*) FROM system_tb_forum WHERE parent=-1 AND forum_name=?");
$total_posts = $DB->Execute($stmtTotal, array($_SESSION["current_forum"]));
$total_posts = $total_posts->fields[0];

// SQL Injection fix: Use prepared statements
$stmtTopics = $DB->Prepare("SELECT * FROM system_tb_forum WHERE parent=-1 AND forum_name=? ORDER BY date_update DESC");
$rs = $DB->Execute($stmtTopics, array($_SESSION["current_forum"]));
if (!$rs) trigger_error($DB->ErrorMsg());

$forum_items = array();
$count = 0;

while(!$rs->EOF)
{
		$item = array();
		$item["bgcolor"] =  ($count++ % 2 == 0?"#cacada":"#dadaea");
		$item["fgcolor"] =  ($count % 2 == 0?"#000000":"#333333");
		
		$item["title"] = str_replace("\\'","'",bbcode2html($rs->fields["title"]));
		
		if (isset($_SESSION["player"]))
		if ($_SESSION["player"]["admin"]==1) {
			$item["title"].=" <a class=\"link2\" href=?DELETE=".$rs->fields["id"]." onClick=\"return confirm('".T_("Are you sure?")."');\">".T_("Delete")."</a>";
		}
		
		$item["views"] = $rs->fields["views"];
		
		$rs2 = $DB->Execute("SELECT COUNT(*) FROM system_tb_forum WHERE forum_name=? AND parent=?", array($_SESSION["current_forum"], $rs->fields["id"]));
		$item["replies"] = $rs2->fields[0];


		$page = 0;
		$page = floor($item["replies"] / CONF_FORUM_REPLIES_PER_PAGE);
		if ($page < 0) $page = 0;

		$rs2 = $DB->Execute("SELECT * FROM system_tb_forum WHERE forum_name=? AND parent=? ORDER BY date_creation DESC LIMIT 1", array($_SESSION["current_forum"], $rs->fields["id"]));
	    if (!$rs2->EOF) {
           $rs3 = $DB->Execute("SELECT * FROM system_tb_players WHERE id=".$rs2->fields["player"]);
   	       $item["lastreply"] = $rs3->fields["nickname"];
		   $item["date"] = (floor((time() - $rs2->fields["date_update"])/(60*60*24))+1).T_(" days");
	    
	    } else {
	    	$item["lastreply"] = "---";
	
	    }
	
		$rs2 = $DB->Execute("SELECT * FROM system_tb_players WHERE id=".$rs->fields["player"]);
		$item["author"] = $rs2->fields["nickname"];
					
		
		$item["date"] = (floor((time() - $rs->fields["date_creation"])/(60*60*24))+1).T_(" days");
		$item["url"] = "forum_viewtopic.php?topic=".$rs->fields["id"]."&page=0";	
		$item["lastseen"] =  (floor((time() - $rs->fields["date_seen"])/(60*60*24))+1).T_(" days");
		$item["new"] = "";
		
		if ((time() - $rs->fields["date_update"]) < (60*60*24*2)) $item["new"] = "<img border=\"0\" src=\"images/common/new.png\">";
	    $forum_items[] = $item;
		
		$rs->MoveNext();
}


$tmp = $forum_items;
$forum_items = array();
$offset = ($_SESSION["forum_page"]*CONF_FORUM_POSTS_PER_PAGE);
$count = 0;

// PHP 8.x compatible iteration (each() is deprecated)
foreach ($tmp as $key => $value)
{
	if (($count >= $offset) && ($count < ($offset+CONF_FORUM_POSTS_PER_PAGE)))
	{
		$forum_items[] = $value;
	}

	$count++;
}
unset($tmp);

$TPL->assign("items",$forum_items);

$forum_pages = "";
for ($i=0;$i<($total_posts/CONF_FORUM_POSTS_PER_PAGE);$i++)
{
	if ($i == $_SESSION["forum_page"]) 
		$forum_pages .= "<b class=\"text_normal\">".($i+1)."</b>&nbsp;";
		else
		$forum_pages .= "<a class=\"link\" href=\"?forum_page=$i\"><b>".($i+1)."</b></a>&nbsp;";
}

$TPL->assign("pages",$forum_pages);
$TPL->assign("current_forum",$FORUMS[$_SESSION["current_forum"]]["description"]);


if (isset($_SESSION["player"])) {

	if (($FORUMS[$_SESSION["current_forum"]]["admin_post"] ==1) && ($_SESSION["player"]["admin"] != 1)) {
		$TPL->assign("player_connected",0);
	} else
		$TPL->assign("player_connected",1);

} else
	$TPL->assign("player_connected",0);


$DB->CompleteTrans();
$TPL->display("page_forum_showpage.html");

?>
