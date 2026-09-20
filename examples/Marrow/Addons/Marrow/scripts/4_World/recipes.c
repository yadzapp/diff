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

	override void Do(ItemBase[] ingredients, PlayerBase player, array<ItemBase> results, float specialty)
	{
		super.Do(ingredients, player, results, specialty);
	}
};

class Marrow_RecipeBandage extends RecipeBase
{
	override void Init()
	{
		super.Init();
		m_Name = "Tear a bandage";
		m_IsInstaRecipe = false;
	}

	override bool CanDo(ItemBase[] ingredients, PlayerBase player)
	{
		if (!ingredients || !ingredients[0])
			return false;
		return super.CanDo(ingredients, player);
	}

	override void Do(ItemBase[] ingredients, PlayerBase player, array<ItemBase> results, float specialty)
	{
		super.Do(ingredients, player, results, specialty);
	}

	override string GetSoundCategory(int category, ItemBase item)
	{
		return super.GetSoundCategory(category, item);
	}
};
