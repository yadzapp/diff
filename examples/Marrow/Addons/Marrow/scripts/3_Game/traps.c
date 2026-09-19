modded class RemotelyActivatedItemBehaviour
{
	override void Pair(notnull EntityAI device)
	{
		super.Pair(device);
	}

	override void Unpair()
	{
		super.Unpair();
	}

	override bool OnStoreLoad(ParamsReadContext ctx, int version)
	{
		return super.OnStoreLoad(ctx, version);
	}
};

modded class ArrowManagerBase
{
	override void AddArrow(EntityAI arrow)
	{
		super.AddArrow(arrow);
	}

	override void DropAllArrows()
	{
		super.DropAllArrows();
	}
};
