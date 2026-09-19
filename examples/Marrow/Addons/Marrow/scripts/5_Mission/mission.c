modded class MissionServer
{
	override void OnUpdate(float timeslice)
	{
		super.OnUpdate(timeslice);
	}

	override void InvokeOnConnect(PlayerBase player, PlayerIdentity identity)
	{
		super.InvokeOnConnect(player, identity);
	}

	override void OnClientPrepareEvent(PlayerIdentity identity, out bool use_position, out vector position, out float yaw, out int preload_timeout)
	{
		super.OnClientPrepareEvent(identity, use_position, position, yaw, preload_timeout);
	}

	override void AddNewPlayerLogout(PlayerBase player, notnull LogoutInfo info)
	{
		super.AddNewPlayerLogout(player, info);
	}
};

modded class MissionGameplay
{
	override void OnItemUsed(InventoryItem item, Man owner)
	{
		super.OnItemUsed(item, owner);
	}
};

modded class ContextMenu
{
	override void Init(Widget root)
	{
		super.Init(root);
	}

	override void Hide()
	{
		super.Hide();
	}

	override void BuildContextMenu(notnull EntityAI ent, notnull Widget w, Class data)
	{
		super.BuildContextMenu(ent, w, data);
	}
};

modded class HintPage
{
	override string GetHeadlineText()
	{
		return super.GetHeadlineText();
	}

	override string GetDescriptionText()
	{
		return super.GetDescriptionText();
	}
};

modded class ActionTargetsCursor
{
	override void Update()
	{
		super.Update();
	}

	override void BuildFixedCursor()
	{
		super.BuildFixedCursor();
	}
};
