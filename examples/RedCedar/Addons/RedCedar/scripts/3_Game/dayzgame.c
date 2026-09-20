modded class DayZGame
{
	override void SetMissionPath(string path)
	{
		super.SetMissionPath(path);
	}

	override string GetMissionPath()
	{
		return super.GetMissionPath();
	}

	override Object CreateObject(string type, vector pos, bool create_local, bool init_ai, bool create_physics)
	{
		return super.CreateObject(type, pos, create_local, init_ai, create_physics);
	}

	override Object CreateStaticObjectUsingP3D(string name, vector pos, vector ori, float scale, bool create_local)
	{
		return super.CreateStaticObjectUsingP3D(name, pos, ori, scale, create_local);
	}
};
