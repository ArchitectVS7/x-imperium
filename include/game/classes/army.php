<?php
// X Imperium is licensed under GPL2, Check LICENSE.TXT for mode details //


class Army
{

	public $DB;
	public $TEMPLATE;
	public $data;
	public $data_footprint;
	public $game_id;

	///////////////////////////////////////////////////////////////////////
	// Constructor - PHP 8.x compatible
	///////////////////////////////////////////////////////////////////////
	function __construct($DB,$TEMPLATE)
	{
		$this->DB = $DB;
		$this->TEMPLATE = $TEMPLATE;
		$this->game_id = round($_SESSION["game"]);
	}

	///////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////
	function load($empire_id)
	{
		$this->data = $this->DB->Execute("SELECT * FROM game".$this->game_id."_tb_army WHERE empire='".intval($empire_id)."'");	
		if (!$this->data) trigger_error($this->DB->ErrorMsg());

		if ($this->data->EOF) return false;
		$this->data = $this->data->fields;

		if ($this->data["effectiveness"] < 10) $this->data["effectiveness"] = 10;
		if ($this->data["effectiveness"] > 150) $this->data["effectiveness"] = 150;


		$this->data_footprint = md5(serialize($this->data));


		return true;
	}

	///////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////
	function save()
	{
		if (md5(serialize($this->data)) == $this->data_footprint) return;

		$columns = array();
		$values = array();

		// PHP 8.x compatible iteration (each() is deprecated)
		foreach ($this->data as $key => $value)
		{
			if ($key == "id") continue;
			if ($key == "empire") continue;
			if (is_numeric($key)) continue;
			if ((is_numeric($value)) && ($value < 0)) $value = 0;

			$columns[] = "$key=?";
			$values[] = $value;
		}

		$values[] = $this->data["empire"]; // WHERE clause value

		$query = "UPDATE game".intval($this->game_id)."_tb_army SET " . implode(",", $columns) . " WHERE empire=?";

		if (!$this->DB->Execute($query, $values)) trigger_error($this->DB->ErrorMsg());
	}


}


?>
