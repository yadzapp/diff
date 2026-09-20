modded class GenericComponent
{
	override void Activate(IEntity owner)
	{
		super.Activate(owner);
	}

	override void Deactivate(IEntity owner)
	{
		super.Deactivate(owner);
	}

	override bool IsActive()
	{
		return super.IsActive();
	}
};

modded class Settings
{
	override void OnApply()
	{
	}

	override void OnChange(string name)
	{
	}
};
