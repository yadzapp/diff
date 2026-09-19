modded class DayZGame
{
	override void SetMissionPath(string path)
	{
		super.SetMissionPath(path);
	}

	override Object CreateObject(string type, vector pos, bool create_local, bool init_ai, bool create_physics)
	{
		if (type == "Marrow_Shed")
			create_physics = true;
		return super.CreateObject(type, pos, create_local, init_ai, create_physics);
	}

	override Object CreateStaticObjectUsingP3D(string name, vector pos, vector ori, float scale, bool create_local)
	{
		return super.CreateStaticObjectUsingP3D(name, pos, ori, scale, create_local);
	}
};

modded class EntityAI
{
	override void EEInit()
	{
		super.EEInit();
	}

	override void ProcessVariables()
	{
		super.ProcessVariables();
	}

	override float ConvertNonlethalDamage(float damage)
	{
		if (IsInherited(Marrow_Coat))
			damage = damage * 0.8;
		return super.ConvertNonlethalDamage(damage);
	}
};

modded class EffectSound
{
	override bool SoundPlayEx(out SoundParams params)
	{
		return super.SoundPlayEx(params);
	}
};
