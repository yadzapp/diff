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

	// matches the PlayerConsumeData overload
	override bool Consume(PlayerConsumeData data)
	{
		return super.Consume(data);
	}

	// matches neither Consume overload
	override bool Consume(string item)
	{
		return false;
	}

	// defined on ManBase
	override bool IsControlledPlayer()
	{
		return super.IsControlledPlayer();
	}

	// return type: experimental is bool(ParamsReadContext, int)
	override void OnStoreLoad(ParamsReadContext ctx, int version)
	{
	}

	// dropped the last bool
	override void SetQuickBarEntityShortcut(EntityAI item, int index)
	{
	}

	override void TuneRadio(int station)
	{
	}

	// comment must not count: override void CommentedOut() {}
	void WarmHands()
	{
	}
};
