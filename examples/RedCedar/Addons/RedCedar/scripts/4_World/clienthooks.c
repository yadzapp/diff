modded class DayZGame
{
	override string GetMissionPath()
	{
		return super.GetMissionPath();
	}
};

modded class EntityAI
{
	override void OnStoreLoad(ParamsReadContext ctx, int version)
	{
	}
};

modded class GenericComponent
{
	override bool IsActive()
	{
		return super.IsActive();
	}
};

modded class ScriptedWidgetEventHandler
{
	override bool OnSelect(Widget w, int x, int y)
	{
		return false;
	}
};

modded class MissionGameplay
{
	override void OnItemUsed(InventoryItem item, Man owner)
	{
	}
};
