modded class ItemBase
{
	override void GetActions(typename action_input_type, out array<ActionBase_Basic> actions)
	{
		super.GetActions(action_input_type, actions);
	}

	protected override bool IsTakeable()
	{
		return super.IsTakeable();
	}

	override void IncreaseOverheating(ItemBase player, string slot, ItemBase item, ItemBase parent, string heat)
	{
		super.IncreaseOverheating(player, slot, item, parent, heat);
	}

	override void ProcessVariables()
	{
		super.ProcessVariables();
	}
};
