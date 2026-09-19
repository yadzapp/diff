modded class EntityAI
{
	override void EEInit()
	{
		super.EEInit();
	}

	override map<int, string> GetEntityDamageDisplayNameMap()
	{
		return super.GetEntityDamageDisplayNameMap();
	}

	// matches neither overload
	override float ConvertNonlethalDamage(int amount)
	{
		return 0;
	}
};
