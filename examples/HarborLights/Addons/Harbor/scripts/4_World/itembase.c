modded class ItemBase
{
	override void GetActions(typename action_input_type, out array<ActionBase_Basic> actions)
	{
	}

	override bool IsTakeable()
	{
		return super.IsTakeable();
	}
};
