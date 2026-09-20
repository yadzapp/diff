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
		return super.IsWell();
	}
};

modded class CarWheel
{
	override void OnWasAttached(EntityAI parent, int slot)
	{
		super.OnWasAttached(parent, slot);
	}

	override void OnWasDetached(EntityAI parent, int slot)
	{
		super.OnWasDetached(parent, slot);
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
