modded class PlayerBase
{
	// array parameter still matches
	override void QueueAddEffectWidget(array<int> effects)
	{
	}

	// default value is ignored, so this still matches void(EntityAI, int, bool)
	override void SetQuickBarEntityShortcut(EntityAI item, int index, bool force = true)
	{
	}

	override bool CanBeRestrained()
	{
		return super.CanBeRestrained();
	}

	string label = "override void NotReal() {}";
};
