modded class ActionBase
{
	override bool ActionCondition(PlayerBase player, ActionTarget target, ItemBase item)
	{
		return super.ActionCondition(player, target, item);
	}

	// dropped out on ActionData
	override bool SetupAction(PlayerBase player, ActionTarget target, ItemBase item, ActionData action_data, Param extra_data)
	{
		return false;
	}
};
