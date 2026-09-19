modded class HumanItemAccessor
{
	override void OnItemInHandsChanged(bool equipped)
	{
		super.OnItemInHandsChanged(equipped);
	}
};

modded class AmmoTypesAPI
{
	override void AddExplosionParticleEffect(string ammo, string surface, int id)
	{
		super.AddExplosionParticleEffect(ammo, surface, id);
	}

	override int GetExplosionParticleID(string ammo, string surface)
	{
		return super.GetExplosionParticleID(ammo, surface);
	}
};
