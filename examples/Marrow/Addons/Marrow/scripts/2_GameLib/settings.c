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
};

modded class Settings
{
	override void OnLoad()
	{
	}

	override void OnSave()
	{
	}

	override void OnApply()
	{
	}

	override void OnChange(string name)
	{
	}
};
