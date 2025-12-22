<?php
// Solar Imperium is licensed under GPL2, Check LICENSE.TXT for mode details //

class EventCreator
{
	var $DB;
	var $type;
	var $from;
	var $to;
	var $params;
	var $seen;
	var $sticky;
	var $height;
	var $game_id;
	

	//////////////////////////////////////////////////////////////////////////////
	//
	//////////////////////////////////////////////////////////////////////////////
	function EventCreator($DB)
	{
		$this->DB = $DB;
		$this->sticky = 0;
		$this->seen = 0;
		$this->height = 160;
		$this->game_id = round($_SESSION["game"]);
	}


	//////////////////////////////////////////////////////////////////////////////
	//
	//////////////////////////////////////////////////////////////////////////////
	function broadcast()
	{

		$query = "SELECT * FROM game".$this->game_id."_tb_empire WHERE active='1'";

		$recipients = $this->DB->Execute($query);

		// verify if duplicate are found , if yes skip them
		// SQL Injection fix: Use prepared statement
		$serializedParams = serialize($this->params);
		$stmtCheck = $this->DB->Prepare("SELECT COUNT(*) FROM game".$this->game_id."_tb_event WHERE event_type=? AND event_from=? AND params=?");
		$rs = $this->DB->Execute($stmtCheck, array($this->type, $this->from, $serializedParams));
		if (!$rs) trigger_error($this->DB->ErrorMsg());
		if ($rs->fields[0] != 0) return;

		// SQL Injection fix: Use prepared statement for INSERT
		$stmtInsert = $this->DB->Prepare("INSERT INTO game".$this->game_id."_tb_event (event_type,event_from,event_to,params,seen,sticky,date,height) VALUES(?,?,?,?,?,?,?,?)");
		while(!$recipients->EOF)
		{
			if (!$this->DB->Execute($stmtInsert, array($this->type, $this->from, $recipients->fields["id"], $serializedParams, $this->seen, $this->sticky, time(NULL), $this->height))) trigger_error($this->DB->ErrorMsg());
			$recipients->MoveNext();
		}

		// garbage collection
		$timeout_unseen = time(NULL) - CONF_UNSEEN_EVENT_TIMEOUT;
		$timeout_seen = time(NULL) - CONF_SEEN_EVENT_TIMEOUT;

		if (!$this->DB->Execute("DELETE FROM game".$this->game_id."_tb_event WHERE date < $timeout_unseen AND seen='0'")) trigger_error($this->DB->ErrorMsg());
		if (!$this->DB->Execute("DELETE FROM game".$this->game_id."_tb_event WHERE date < $timeout_seen AND seen='1'")) trigger_error($this->DB->ErrorMsg());

	}


	//////////////////////////////////////////////////////////////////////////////
	//
	//////////////////////////////////////////////////////////////////////////////
	function send()
	{
		global $GAME;

		// verify if duplicate are found , if yes skip them
		// SQL Injection fix: Use prepared statement
		$serializedParams = serialize($this->params);
		$stmtCheck = $this->DB->Prepare("SELECT COUNT(*) FROM game".$this->game_id."_tb_event WHERE event_type=? AND event_from=? AND params=?");
		$rs = $this->DB->Execute($stmtCheck, array($this->type, $this->from, $serializedParams));
		if (!$rs) trigger_error($this->DB->ErrorMsg());

		if ($rs->fields[0] != 0) return;



		if ((isset($GAME["ai_turn"])) && ($GAME["ai_turn"]==true)) return;
		// SQL Injection fix: Use prepared statement for INSERT
		$stmtInsert = $this->DB->Prepare("INSERT INTO game".$this->game_id."_tb_event (event_type,event_from,event_to,params,seen,sticky,date,height) VALUES(?,?,?,?,?,?,?,?)");
		if (!$this->DB->Execute($stmtInsert, array($this->type, $this->from, $this->to, $serializedParams, $this->seen, $this->sticky, time(NULL), $this->height))) trigger_error($this->DB->ErrorMsg());


		// garbage collection
		$timeout_unseen = time(NULL) - CONF_UNSEEN_EVENT_TIMEOUT;
		$timeout_seen = time(NULL) - CONF_SEEN_EVENT_TIMEOUT;

		if (!$this->DB->Execute("DELETE FROM game".$this->game_id."_tb_event WHERE date < $timeout_unseen AND seen='0'")) trigger_error($this->DB->ErrorMsg());
		if (!$this->DB->Execute("DELETE FROM game".$this->game_id."_tb_event WHERE date < $timeout_seen AND seen='1'")) trigger_error($this->DB->ErrorMsg());
	}
}


?>
