// DayZGame lives in 3_Game. This file is under 4_World, so the signature can match and the module is still wrong.
modded class DayZGame
{
	override string GetMissionPath()
	{
		return super.GetMissionPath();
	}
};

// EntityAI.OnStoreLoad matches, but the class is compiled in 3_Game.
modded class EntityAI
{
	override bool OnStoreLoad(ParamsReadContext ctx, int version)
	{
		return super.OnStoreLoad(ctx, version);
	}
};
