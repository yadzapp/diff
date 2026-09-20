class Marrow_Canteen extends Bottle_Base
{
	override void ProcessVariables()
	{
		super.ProcessVariables();
		if (GetQuantity() <= 0)
			return;
		if (GetWet() > 0.25)
			AddQuantity(-0.5);
	}

	override void GetActions(typename action_input_type, out array<ActionBase_Basic> actions)
	{
		super.GetActions(action_input_type, actions);
	}

	protected override bool IsTakeable()
	{
		return !IsRuined();
	}

	bool HasASip()
	{
		return GetQuantity() > 0;
	}
};

class Marrow_Coat extends Clothing
{
	override void ProcessVariables()
	{
		super.ProcessVariables();
		if (GetWet() > 0.6)
			AddHealth("", "Health", -0.02);
	}

	float DryWeight()
	{
		return GetWeight() * (1 - GetWet());
	}
};
