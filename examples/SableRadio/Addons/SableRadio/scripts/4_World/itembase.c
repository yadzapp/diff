modded class ItemBase
{
	// still matches, including the out parameter
	override void GetActions(typename action_input_type, out array<ActionBase_Basic> actions)
	{
		super.GetActions(action_input_type, actions);
	}

	// return type changed: experimental is bool()
	override void IsTakeable()
	{
	}
};
