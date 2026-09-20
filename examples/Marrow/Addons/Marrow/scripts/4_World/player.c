class Marrow_Survivor extends PlayerBase
{
	override void OnJumpStart()
	{
		super.OnJumpStart();
	}

	override bool Consume(PlayerConsumeData data)
	{
		Marrow_Canteen canteen;
		if (data && Class.CastTo(canteen, data.m_Source))
		{
			if (!canteen.HasASip())
				return false;
		}
		return super.Consume(data);
	}

	override void RewindState(PawnOwnerState owner, PawnMove move, inout NetworkRewindType rewind)
	{
		super.RewindState(owner, move, rewind);
	}

	override void SetQuickBarEntityShortcut(EntityAI item, int index, bool force = false)
	{
		super.SetQuickBarEntityShortcut(item, index, force);
	}

	override bool IsControlledPlayer()
	{
		return super.IsControlledPlayer();
	}

	int PackBurden()
	{
		return GetWeight();
	}
};

class Marrow_Scout extends Marrow_Survivor
{
	override bool CanBeRestrained()
	{
		return false;
	}
};

modded class PlayerBase
{
	override void EEHitBy(TotalDamageResult damageResult, int damageType, EntityAI source, int component, string dmgZone, string ammo, vector modelPos, float speedCoef)
	{
		super.EEHitBy(damageResult, damageType, source, component, dmgZone, ammo, modelPos, speedCoef);
	}

	override bool OnStoreLoad(ParamsReadContext ctx, int version)
	{
		return super.OnStoreLoad(ctx, version);
	}

	// leftover from an old build: override void TuneRadio(int station) {}
	string m_Note = "override void GhostHands() {}";
};
