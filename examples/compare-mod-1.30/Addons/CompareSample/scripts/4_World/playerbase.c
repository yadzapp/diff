modded class PlayerBase
{
	// still matches
	override void OnJumpStart()
	{
		super.OnJumpStart();
	}

	// still matches, including the long parameter list
	override void EEHitBy(TotalDamageResult damageResult, int damageType, EntityAI source, int component, string dmgZone, string ammo, vector modelPos, float speedCoef)
	{
		super.EEHitBy(damageResult, damageType, source, component, dmgZone, ammo, modelPos, speedCoef);
	}

	// still matches one of the two Consume overloads
	override bool Consume(PlayerConsumeData data)
	{
		return super.Consume(data);
	}

	// defined on ManBase, not PlayerBase
	override bool IsControlledPlayer()
	{
		return super.IsControlledPlayer();
	}

	// return type changed: experimental is bool(ParamsReadContext, int)
	override void OnStoreLoad(ParamsReadContext ctx, int version)
	{
		super.OnStoreLoad(ctx, version);
	}

	// lost the last argument: experimental is void(EntityAI, int, bool)
	override void SetQuickBarEntityShortcut(EntityAI item, int index)
	{
	}

	// method is not on PlayerBase or its parents
	override void TuneRadio(int station)
	{
	}

	// comment must not count: override void CommentedOut() {}
};
