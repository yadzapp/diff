modded class ItemBase
{
	override void GetActions(typename action_input_type, out array<ActionBase_Basic> actions)
	{
	}

	// protected is ignored
	protected override bool IsTakeable()
	{
		return super.IsTakeable();
	}

	// last argument is string, not int
	override void IncreaseOverheating(ItemBase player, string slot, ItemBase item, ItemBase parent, int heat)
	{
	}
};
