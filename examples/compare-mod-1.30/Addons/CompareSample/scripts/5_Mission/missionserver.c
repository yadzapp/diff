modded class MissionServer
{
	// still matches
	override void OnUpdate(float timeslice)
	{
		super.OnUpdate(timeslice);
	}

	// arguments swapped: experimental is void(PlayerBase, PlayerIdentity)
	override void InvokeOnConnect(PlayerIdentity identity, PlayerBase player)
	{
		super.InvokeOnConnect(identity, player);
	}

	// not a MissionServer method
	override void PlantFlag(vector pos)
	{
	}
};
