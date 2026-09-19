modded class MissionServer
{
	override void OnUpdate(float timeslice)
	{
	}

	// arguments swapped
	override void InvokeOnConnect(PlayerIdentity identity, PlayerBase player)
	{
	}

	override void OnClientPrepareEvent(PlayerIdentity identity, out bool use_position, out vector position, out float yaw, out int preload_timeout)
	{
	}

	// dropped notnull
	override void AddNewPlayerLogout(PlayerBase player, LogoutInfo info)
	{
	}

	override void PlantFlag()
	{
	}
};
