modded class ActionBase
{
	// still matches
	override bool ActionCondition(PlayerBase player, ActionTarget target, ItemBase item)
	{
		return super.ActionCondition(player, target, item);
	}

	// lost the last Param: experimental is bool(PlayerBase, ActionTarget, ItemBase, out ActionData, Param)
	override bool SetupAction(PlayerBase player, ActionTarget target, ItemBase item, out ActionData action_data)
	{
		return super.SetupAction(player, target, item, action_data);
	}
};
