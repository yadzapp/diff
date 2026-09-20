class Marrow_Shed extends BaseBuildingBase
{
	override void GetActions(typename action_input_type, out array<ActionBase_Basic> actions)
	{
		super.GetActions(action_input_type, actions);
	}

	override void ProcessVariables()
	{
		super.ProcessVariables();
	}

	bool DoorIsShut()
	{
		return true;
	}
};

modded class Construction
{
	override void SetParent(BaseBuildingBase parent)
	{
		super.SetParent(parent);
	}
};

modded class Environment
{
	override void ApplyWetnessToItem(ItemBase item)
	{
		super.ApplyWetnessToItem(item);
		Marrow_Coat coat = Marrow_Coat.Cast(item);
		if (coat)
			coat.AddWet(0.02);
	}

	override void ApplyDrynessToItemEx(ItemBase item, EnvironmentDrynessData data)
	{
		super.ApplyDrynessToItemEx(item, data);
	}
};

modded class Well
{
	override bool IsWell()
	{
		return true;
	}
};

modded class BoxDraw
{
	override void DrawRotatedBox(vector[4] matrix, vector pos, int color)
	{
		super.DrawRotatedBox(matrix, pos, color);
	}

	override vector TransformPointByMatrix(vector[4] matrix, vector point)
	{
		return super.TransformPointByMatrix(matrix, point);
	}
};
