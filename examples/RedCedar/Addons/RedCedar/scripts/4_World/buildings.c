modded class CraftBolt
{
	override void Init()
	{
		super.Init();
	}

	override bool CanDo(ItemBase[] ingredients, PlayerBase player)
	{
		return super.CanDo(ingredients, player);
	}
};

modded class CraftBoltFeather
{
	override void Init()
	{
		super.Init();
	}

	override void Do(ItemBase[] ingredients, PlayerBase player, array<ItemBase> results, float specialty)
	{
		super.Do(ingredients, player, results, specialty);
	}
};
