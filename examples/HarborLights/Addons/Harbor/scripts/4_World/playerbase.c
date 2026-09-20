modded class PlayerBase
{
	override void OnJumpStart()
	{
		super.OnJumpStart();
	}

	override void EEHitBy(TotalDamageResult damageResult, int damageType, EntityAI source, int component, string dmgZone, string ammo, vector modelPos, float speedCoef)
	{
		super.EEHitBy(damageResult, damageType, source, component, dmgZone, ammo, modelPos, speedCoef);
	}

	override bool Consume(PlayerConsumeData data)
	{
		return super.Consume(data);
	}

	override bool OnStoreLoad(ParamsReadContext ctx, int version)
	{
		return super.OnStoreLoad(ctx, version);
	}

	override void SetQuickBarEntityShortcut(EntityAI item, int index, bool force)
	{
	}

	override bool CanBeRestrained()
	{
		return super.CanBeRestrained();
	}

	override bool IsControlledPlayer()
	{
		return super.IsControlledPlayer();
	}
};
